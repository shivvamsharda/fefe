import { Connection, PublicKey, Transaction, SystemProgram, SendOptions } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount, TokenAccountNotFoundError, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { toast } from "sonner";
import { SolanaWalletProvider } from '@/context/WalletContext';
import { supabase } from '@/integrations/supabase/client';

// Platform fee configuration
const PLATFORM_FEE_PERCENT = 20; // Updated to 20% fee
const PLATFORM_WALLET = new PublicKey('6C4ExycTzLnFcSWXuoUyYoQd2UUioJyBwT4HG5kQLT9o');

// $WENLIVE token configuration
const WENLIVE_MINT = new PublicKey('GndWt4p2L3zekGScuUSFmbqKjfri1jRq5KfXr6oEpump');

// Connection to Solana blockchain using Supabase RPC URL
let connection: Connection;

const initializeConnection = async () => {
  if (!connection) {
    try {
      // Try to get RPC URL from Supabase secrets
      const { data } = await supabase.functions.invoke('get-rpc-url');
      const rpcUrl = data?.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=8d5d0812-ab2e-4699-808a-a245f1880138';
      connection = new Connection(rpcUrl);
      console.log('Solana connection initialized with RPC URL:', rpcUrl);
    } catch (error) {
      console.warn('Failed to get RPC URL from Supabase, using fallback');
      connection = new Connection('https://mainnet.helius-rpc.com/?api-key=8d5d0812-ab2e-4699-808a-a245f1880138');
    }
  }
  return connection;
};

// Initialize connection immediately
initializeConnection();

/**
 * Calculate the platform fee amount based on the donation amount
 */
export const calculatePlatformFee = (amount: number): number => {
  return amount * (PLATFORM_FEE_PERCENT / 100);
};

/**
 * Check if an associated token account exists
 */
const checkTokenAccountExists = async (tokenAccount: PublicKey): Promise<boolean> => {
  try {
    await getAccount(connection, tokenAccount);
    return true;
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError) {
      return false;
    }
    throw error;
  }
};

/**
 * Fetch $WENLIVE token balance for a wallet
 */
export const getWenliveBalance = async (walletAddress: PublicKey): Promise<number> => {
  try {
    const tokenAccount = await getAssociatedTokenAddress(WENLIVE_MINT, walletAddress);
    const accountInfo = await getAccount(connection, tokenAccount);
    return Number(accountInfo.amount) / Math.pow(10, 6); // Assuming 6 decimals for $WENLIVE
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError) {
      return 0; // No token account exists, balance is 0
    }
    console.error('Error fetching $WENLIVE balance:', error);
    return 0;
  }
};

/**
 * Send a SOL donation/tip to a creator with platform fee
 */
export const sendSolDonation = async (
  provider: SolanaWalletProvider,
  senderPublicKey: PublicKey,
  recipientAddress: string,
  amount: number,
  message?: string
): Promise<string | null> => {
  try {
    const recipientPublicKey = new PublicKey(recipientAddress);
    const platformFee = calculatePlatformFee(amount);
    const creatorAmount = amount - platformFee;
    
    console.log(`SOL Donation details:`, {
      totalAmount: amount,
      platformFee,
      creatorAmount,
      recipient: recipientAddress,
      platformWallet: PLATFORM_WALLET.toString(),
      platformFeePercent: PLATFORM_FEE_PERCENT
    });
    
    if (!provider.signTransaction) {
      toast.error("Your wallet doesn't support transaction signing");
      return null;
    }
    
    // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
    const lamportsToCreator = Math.round(creatorAmount * 1000000000);
    const lamportsToPlatform = Math.round(platformFee * 1000000000);
    
    // Ensure amounts are positive after fee calculation
    if (lamportsToCreator <= 0 && amount > 0) {
        toast.error("Transaction failed", {
            description: "Amount is too small after platform fee deduction."
        });
        return null;
    }
    
    // Create a new transaction
    const transaction = new Transaction();
    
    // Add instruction to send SOL to creator if their amount is greater than 0
    if (lamportsToCreator > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: recipientPublicKey,
          lamports: lamportsToCreator,
        })
      );
    }
    
    // Add instruction to send platform fee if it's greater than 0
    if (lamportsToPlatform > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: PLATFORM_WALLET,
          lamports: lamportsToPlatform,
        })
      );
    }
    
    // If both amounts are zero (e.g. original amount was zero or negative)
    if (transaction.instructions.length === 0 && amount > 0) {
        toast.error("Transaction failed", {
            description: "Calculated amounts for creator and platform are zero."
        });
        return null;
    }
    
    // Add recent blockhash
    const { blockhash } = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPublicKey;
    
    // Sign the transaction
    const signedTransaction = await provider.signTransaction(transaction);
    
    // Send the signed transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Confirm transaction
    await connection.confirmTransaction(signature);
    
    console.log('SOL transaction successful');
    return signature;
    
  } catch (error: any) {
    console.error('Error sending SOL donation:', error);
    toast.error("Transaction failed", {
      description: error.message || "Could not complete the SOL donation"
    });
    return null;
  }
};

/**
 * Send a $WENLIVE token donation/tip to a creator with platform fee
 */
export const sendWenliveDonation = async (
  provider: SolanaWalletProvider,
  senderPublicKey: PublicKey,
  recipientAddress: string,
  amount: number,
  message?: string
): Promise<string | null> => {
  try {
    const recipientPublicKey = new PublicKey(recipientAddress);
    const platformFee = calculatePlatformFee(amount);
    const creatorAmount = amount - platformFee;
    
    console.log(`$WENLIVE Donation details:`, {
      totalAmount: amount,
      platformFee,
      creatorAmount,
      recipient: recipientAddress,
      platformWallet: PLATFORM_WALLET.toString(),
      platformFeePercent: PLATFORM_FEE_PERCENT
    });
    
    if (!provider.signTransaction) {
      toast.error("Your wallet doesn't support transaction signing");
      return null;
    }
    
    // Convert to token amount (assuming 6 decimals)
    const tokensToCreator = Math.round(creatorAmount * Math.pow(10, 6));
    const tokensToPlatform = Math.round(platformFee * Math.pow(10, 6));
    
    // Ensure amounts are positive after fee calculation
    if (tokensToCreator <= 0 && amount > 0) {
        toast.error("Transaction failed", {
            description: "Amount is too small after platform fee deduction."
        });
        return null;
    }
    
    // Get associated token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(WENLIVE_MINT, senderPublicKey);
    const recipientTokenAccount = await getAssociatedTokenAddress(WENLIVE_MINT, recipientPublicKey);
    const platformTokenAccount = await getAssociatedTokenAddress(WENLIVE_MINT, PLATFORM_WALLET);
    
    // Check if token accounts exist and create them if needed
    const recipientAccountExists = await checkTokenAccountExists(recipientTokenAccount);
    const platformAccountExists = await checkTokenAccountExists(platformTokenAccount);
    
    // Create a new transaction
    const transaction = new Transaction();
    
    // Create recipient token account if it doesn't exist
    if (!recipientAccountExists && tokensToCreator > 0) {
      console.log('Creating recipient token account for $WENLIVE');
      transaction.add(
        createAssociatedTokenAccountInstruction(
          senderPublicKey, // payer
          recipientTokenAccount, // associated token account
          recipientPublicKey, // owner
          WENLIVE_MINT // mint
        )
      );
    }
    
    // Create platform token account if it doesn't exist
    if (!platformAccountExists && tokensToPlatform > 0) {
      console.log('Creating platform token account for $WENLIVE');
      transaction.add(
        createAssociatedTokenAccountInstruction(
          senderPublicKey, // payer
          platformTokenAccount, // associated token account
          PLATFORM_WALLET, // owner
          WENLIVE_MINT // mint
        )
      );
    }
    
    // Add instruction to send tokens to creator if their amount is greater than 0
    if (tokensToCreator > 0) {
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          senderPublicKey,
          tokensToCreator
        )
      );
    }
    
    // Add instruction to send platform fee if it's greater than 0
    if (tokensToPlatform > 0) {
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          platformTokenAccount,
          senderPublicKey,
          tokensToPlatform
        )
      );
    }
    
    // If both amounts are zero (e.g. original amount was zero or negative)
    if (transaction.instructions.length === 0 && amount > 0) {
        toast.error("Transaction failed", {
            description: "Calculated amounts for creator and platform are zero."
        });
        return null;
    }
    
    // Add recent blockhash
    const { blockhash } = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPublicKey;
    
    // Sign the transaction
    const signedTransaction = await provider.signTransaction(transaction);
    
    // Send the signed transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Confirm transaction
    await connection.confirmTransaction(signature);
    
    console.log('$WENLIVE transaction successful');
    return signature;
    
  } catch (error: any) {
    console.error('Error sending $WENLIVE donation:', error);
    toast.error("Transaction failed", {
      description: error.message || "Could not complete the $WENLIVE donation"
    });
    return null;
  }
};

/**
 * Send a promotion payment to the platform wallet
 */
export const sendPromotionPayment = async (
  provider: SolanaWalletProvider,
  senderPublicKey: PublicKey,
  amount: number,
  promotionData?: any
): Promise<string | null> => {
  console.log('🚀 Starting promotion payment process...');
  console.log('📋 Payment details:', {
    amount,
    sender: senderPublicKey.toString(),
    platformWallet: PLATFORM_WALLET.toString(),
    providerExists: !!provider,
    providerConnected: provider?.connected,
    providerPublicKey: provider?.publicKey?.toString(),
    hasSignTransaction: !!provider?.signTransaction
  });

  try {
    // Enhanced provider validation
    if (!provider) {
      console.error('❌ Provider is null or undefined');
      throw new Error("Wallet provider not available");
    }

    // Check if wallet is connected using publicKey as primary indicator
    const isWalletConnected = !!(provider.publicKey || provider.connected);
    if (!isWalletConnected) {
      console.error('❌ Wallet is not connected - no publicKey available');
      console.log('Provider state:', {
        connected: provider.connected,
        publicKey: provider.publicKey?.toString(),
        hasSignTransaction: !!provider.signTransaction
      });
      throw new Error("Wallet is not connected. Please connect your wallet first.");
    }

    if (!provider.signTransaction) {
      console.error('❌ Wallet does not support transaction signing');
      throw new Error("Your wallet doesn't support transaction signing");
    }

    console.log('✅ Wallet provider validation passed');
    console.log('✅ Wallet connected with publicKey:', provider.publicKey?.toString());

    // Initialize and validate connection
    const conn = await initializeConnection();
    console.log('✅ Solana connection initialized');

    // Validate amount
    if (amount <= 0) {
      console.error('❌ Invalid payment amount:', amount);
      throw new Error("Invalid payment amount");
    }

    // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
    const lamportsToSend = Math.round(amount * 1000000000);
    console.log('💰 Payment amount in lamports:', lamportsToSend);

    if (lamportsToSend <= 0) {
      console.error('❌ Invalid lamports amount:', lamportsToSend);
      throw new Error("Invalid payment amount");
    }

    // Create a new transaction
    console.log('🔨 Building transaction...');
    const transaction = new Transaction();
    
    // Add instruction to send SOL to platform wallet
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: PLATFORM_WALLET,
        lamports: lamportsToSend,
      })
    );

    console.log('✅ Transfer instruction added to transaction');

    // Add recent blockhash
    console.log('🔗 Getting recent blockhash...');
    const { blockhash } = await conn.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPublicKey;

    console.log('✅ Transaction prepared with blockhash:', blockhash);
    console.log('🔄 Requesting wallet signature...');
    console.log('Transaction details:', {
      instructions: transaction.instructions.length,
      feePayer: transaction.feePayer?.toString(),
      recentBlockhash: transaction.recentBlockhash
    });

    // This should trigger the wallet popup
    const signedTransaction = await provider.signTransaction(transaction);
    
    if (!signedTransaction) {
      console.error('❌ Transaction signing failed - no signed transaction returned');
      throw new Error('Transaction signing failed');
    }
    
    console.log('✅ Transaction signed successfully');
    console.log('📡 Broadcasting transaction to network...');

    // Send the signed transaction
    const signature = await conn.sendRawTransaction(signedTransaction.serialize());
    
    if (!signature) {
      console.error('❌ Transaction broadcast failed - no signature returned');
      throw new Error('Transaction broadcast failed');
    }
    
    console.log('✅ Transaction broadcasted successfully');
    console.log('⏳ Confirming transaction...');

    // Confirm transaction
    await conn.confirmTransaction(signature);
    
    console.log('🎉 Promotion payment successful');
    
    return signature;
    
  } catch (error: any) {
    console.error('💥 Error in sendPromotionPayment:', error);
    console.error('Error stack:', error.stack);
    
    // Specific error handling for different types of errors
    if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
      console.log('❌ User rejected the transaction');
      throw new Error("Transaction cancelled - You cancelled the transaction in your wallet");
    } else if (error.message?.includes('Insufficient funds')) {
      console.log('❌ Insufficient funds');
      throw new Error("Insufficient funds - You don't have enough SOL to complete this transaction");
    } else if (error.message?.includes('Network') || error.message?.includes('network')) {
      console.log('❌ Network error');
      throw new Error("Network error - Unable to connect to Solana network. Please try again.");
    } else if (error.message?.includes('not connected')) {
      console.log('❌ Wallet connection error');
      throw new Error("Wallet connection error - Please reconnect your wallet and try again.");
    } else {
      console.log('❌ Unknown error occurred');
      throw new Error(error.message || "Transaction failed - Could not complete the promotion payment");
    }
  }
};

/**
 * Send a donation/tip to a creator with platform fee
 * Supports both SOL and $WENLIVE tokens
 */
export const sendDonation = async (
  provider: SolanaWalletProvider,
  senderPublicKey: PublicKey,
  recipientAddress: string,
  amount: number,
  tokenType: 'SOL' | 'WENLIVE' = 'SOL',
  message?: string
): Promise<string | null> => {
  if (tokenType === 'WENLIVE') {
    return sendWenliveDonation(provider, senderPublicKey, recipientAddress, amount, message);
  } else {
    return sendSolDonation(provider, senderPublicKey, recipientAddress, amount, message);
  }
};

// Export constants for use in components
export { WENLIVE_MINT };
