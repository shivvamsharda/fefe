import { PublicKey, Transaction, Keypair } from '@solana/web3.js';
import CryptoJS from 'crypto-js';
import { SolanaWalletProvider } from '@/context/WalletContext';
import { toast } from 'sonner';

// Temporary encryption key - matches googleWalletService
const TEMP_ENCRYPTION_KEY = 'temp_wallet_key_2024';

/**
 * Virtual wallet provider for Google users with auto-generated wallets
 * Implements the SolanaWalletProvider interface to work with existing transaction code
 */
export class GoogleWalletProvider implements SolanaWalletProvider {
  private keypair: Keypair;
  private _publicKey: PublicKey;
  private _connected: boolean = true;

  constructor(encryptedPrivateKey: string) {
    try {
      // Decrypt the private key
      const decryptedPrivateKey = CryptoJS.AES.decrypt(encryptedPrivateKey, TEMP_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      
      if (!decryptedPrivateKey) {
        throw new Error('Failed to decrypt private key');
      }

      // Convert from comma-separated string back to Uint8Array
      const privateKeyArray = new Uint8Array(decryptedPrivateKey.split(',').map(num => parseInt(num, 10)));
      
      // Create keypair from private key
      this.keypair = Keypair.fromSecretKey(privateKeyArray);
      this._publicKey = this.keypair.publicKey;
      
      console.log('✅ GoogleWalletProvider initialized:', {
        publicKey: this._publicKey.toString(),
        connected: this._connected
      });
    } catch (error) {
      console.error('❌ Error initializing GoogleWalletProvider:', error);
      throw new Error('Failed to initialize wallet provider');
    }
  }

  get publicKey(): PublicKey {
    return this._publicKey;
  }

  get connected(): boolean {
    return this._connected;
  }

  async connect(): Promise<{ publicKey: PublicKey }> {
    this._connected = true;
    return { publicKey: this._publicKey };
  }

  async disconnect(): Promise<void> {
    this._connected = false;
  }

  on(event: string, callback: (...args: any[]) => void): void {
    // No-op for virtual provider
    // In a real implementation, you might want to store these for later use
  }

  off(event: string, callback: (...args: any[]) => void): void {
    // No-op for virtual provider
  }

  async signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }> {
    try {
      const signature = await this.keypair.secretKey.slice(0, 32);
      return { signature };
    } catch (error) {
      console.error('❌ Error signing message with GoogleWalletProvider:', error);
      toast.error('Failed to sign message');
      throw error;
    }
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      console.log('🔐 Signing transaction with GoogleWalletProvider...');
      
      // Set fee payer if not already set
      if (!transaction.feePayer) {
        transaction.feePayer = this._publicKey;
      }

      // Sign the transaction
      transaction.sign(this.keypair);
      
      console.log('✅ Transaction signed successfully');
      return transaction;
    } catch (error) {
      console.error('❌ Error signing transaction with GoogleWalletProvider:', error);
      toast.error('Failed to sign transaction');
      throw error;
    }
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    try {
      console.log('🔐 Signing multiple transactions with GoogleWalletProvider...');
      
      const signedTransactions = transactions.map(transaction => {
        // Set fee payer if not already set
        if (!transaction.feePayer) {
          transaction.feePayer = this._publicKey;
        }
        
        // Sign the transaction
        transaction.sign(this.keypair);
        return transaction;
      });
      
      console.log('✅ All transactions signed successfully');
      return signedTransactions;
    } catch (error) {
      console.error('❌ Error signing multiple transactions with GoogleWalletProvider:', error);
      toast.error('Failed to sign transactions');
      throw error;
    }
  }

  /**
   * Static factory method to create GoogleWalletProvider from encrypted private key
   */
  static create(encryptedPrivateKey: string): GoogleWalletProvider {
    return new GoogleWalletProvider(encryptedPrivateKey);
  }

  /**
   * Check if encrypted private key is valid
   */
  static isValidEncryptedKey(encryptedPrivateKey: string): boolean {
    try {
      const decryptedPrivateKey = CryptoJS.AES.decrypt(encryptedPrivateKey, TEMP_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      return !!decryptedPrivateKey && decryptedPrivateKey.includes(',');
    } catch {
      return false;
    }
  }
}