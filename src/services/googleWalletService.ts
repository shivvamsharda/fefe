import { Keypair } from '@solana/web3.js';
import CryptoJS from 'crypto-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Temporary encryption key - in production, this should be more secure
const TEMP_ENCRYPTION_KEY = 'temp_wallet_key_2024';

export interface GeneratedWallet {
  publicKey: string;
  privateKey: string;
  encryptedPrivateKey: string;
}

/**
 * Generate a new Solana keypair for Google-authenticated users
 */
export const generateSolanaWallet = (): GeneratedWallet => {
  console.log('🔑 Generating new Solana wallet...');
  
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toString();
  const privateKey = `[${Array.from(keypair.secretKey).join(',')}]`;
  
  // Encrypt the private key for temporary storage
  const encryptedPrivateKey = CryptoJS.AES.encrypt(privateKey, TEMP_ENCRYPTION_KEY).toString();
  
  const wallet = {
    publicKey,
    privateKey,
    encryptedPrivateKey
  };
  
  console.log('✅ Wallet generated successfully:', {
    publicKey: wallet.publicKey,
    hasPrivateKey: !!wallet.privateKey,
    hasEncryptedKey: !!wallet.encryptedPrivateKey
  });
  
  return wallet;
};

/**
 * Save the generated wallet to user profile with proper authentication context
 */
export const saveWalletToProfile = async (userId: string, wallet: GeneratedWallet): Promise<boolean> => {
  console.log('💾 Attempting to save wallet to profile:', {
    userId,
    publicKey: wallet.publicKey,
    hasEncryptedKey: !!wallet.encryptedPrivateKey
  });
  
  try {
    // Ensure we have an active session before attempting update
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error('❌ No active session when trying to save wallet:', sessionError);
      toast.error('Authentication required to save wallet');
      return false;
    }
    
    console.log('✅ Active session confirmed for wallet save');
    
    // Add a small delay to ensure auth context is stable
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        wallet_address: wallet.publicKey,
        private_key_encrypted: wallet.encryptedPrivateKey
      })
      .eq('id', userId)
      .select();
    
    console.log('💾 Database update result:', { 
      data, 
      error, 
      rowsUpdated: data?.length || 0,
      userId,
      sessionUserId: sessionData.session.user.id
    });
    
    if (error) {
      console.error('❌ Error saving wallet to profile:', error);
      // Check if it's an RLS policy error
      if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
        console.error('❌ RLS policy blocked the update - auth context issue');
        toast.error('Authentication error - please try again');
      } else {
        toast.error('Failed to save wallet to profile');
      }
      return false;
    }
    
    if (!data || data.length === 0) {
      console.error('❌ No rows updated - possible RLS policy issue');
      toast.error('Failed to update profile - authentication issue');
      return false;
    }
    
    console.log('✅ Wallet saved to profile successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Exception saving wallet to profile:', error);
    toast.error('Failed to save wallet to profile');
    return false;
  }
};

/**
 * Delete the encrypted private key from the database after user downloads it
 */
export const deleteEncryptedPrivateKey = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        private_key_encrypted: null
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Error deleting encrypted private key:', error);
      return false;
    }
    
    console.log('Encrypted private key successfully deleted from database');
    return true;
  } catch (error) {
    console.error('Error deleting encrypted private key:', error);
    return false;
  }
};

/**
 * Download private key as a text file
 */
export const downloadPrivateKey = (privateKey: string, walletAddress: string): void => {
  const content = `Wenlive Wallet Private Key
=========================

Wallet Address: ${walletAddress}
Private Key: ${privateKey}

IMPORTANT SECURITY NOTICE:
- Keep this private key secure and never share it with anyone
- Store it in a safe place - you won't be able to recover it if lost
- Anyone with this key can access your wallet and funds
- Wenlive does not store this key - you are fully responsible for its security

Generated: ${new Date().toISOString()}
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wenlive-wallet-${walletAddress.slice(0, 8)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  toast.success('Private key downloaded successfully');
};

/**
 * Check if user needs wallet setup with database fallback
 */
export const userNeedsWalletSetup = async (userProfile: any): Promise<boolean> => {
  console.log('🔍 userNeedsWalletSetup check:', {
    userProfile,
    hasWalletAddress: !!userProfile?.wallet_address,
    hasGoogleId: !!userProfile?.google_id,
    walletAddress: userProfile?.wallet_address,
    googleId: userProfile?.google_id
  });
  
  // Quick check first
  if (!userProfile?.google_id) {
    console.log('✅ userNeedsWalletSetup result: false (not a Google user)');
    return false;
  }
  
  if (userProfile?.wallet_address) {
    console.log('✅ userNeedsWalletSetup result: false (already has wallet)');
    return false;
  }
  
  // Database fallback check - in case state is stale
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('wallet_address')
      .eq('id', userProfile.id)
      .single();
    
    if (!error && data?.wallet_address) {
      console.log('✅ userNeedsWalletSetup: Found wallet in database, state was stale');
      return false;
    }
  } catch (error) {
    console.warn('Warning: Could not check database for wallet address:', error);
  }
  
  const needsSetup = true;
  console.log('✅ userNeedsWalletSetup result:', needsSetup);
  return needsSetup;
};

/**
 * Regenerate wallet for existing Google user
 */
export const regenerateWallet = async (userId: string): Promise<GeneratedWallet | null> => {
  console.log('🔄 Regenerating wallet for user:', userId);
  
  try {
    const newWallet = generateSolanaWallet();
    const saved = await saveWalletToProfile(userId, newWallet);
    
    if (!saved) {
      console.log('❌ Failed to save regenerated wallet');
      return null;
    }
    
    console.log('✅ Wallet regenerated successfully');
    return newWallet;
  } catch (error) {
    console.error('❌ Error regenerating wallet:', error);
    toast.error('Failed to regenerate wallet');
    return null;
  }
};