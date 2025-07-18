import { PublicKey, Transaction } from '@solana/web3.js';
import { SolanaWalletProvider } from '@/context/WalletContext';
import { UserProfile } from '@/services/profileService';

/**
 * Universal wallet capability detection and utilities
 */
export class UnifiedWalletService {
  /**
   * Check if user has any wallet capability (external or auto-generated)
   */
  static hasWalletCapability(
    connected: boolean,
    userProfile: UserProfile | null,
    isGoogleAuthenticated: boolean
  ): boolean {
    // External wallet connected
    if (connected) return true;
    
    // Google user with auto-generated wallet
    if (isGoogleAuthenticated && userProfile?.wallet_address) return true;
    
    return false;
  }

  /**
   * Get the effective wallet address from any source
   */
  static getWalletAddress(
    connected: boolean,
    publicKey: string | null,
    userProfile: UserProfile | null,
    isGoogleAuthenticated: boolean
  ): string | null {
    // External wallet takes priority
    if (connected && publicKey) return publicKey;
    
    // Fallback to auto-generated wallet
    if (isGoogleAuthenticated && userProfile?.wallet_address) {
      return userProfile.wallet_address;
    }
    
    return null;
  }

  /**
   * Get wallet type for display purposes
   */
  static getWalletType(
    connected: boolean,
    isGoogleAuthenticated: boolean
  ): 'external' | 'auto-generated' | null {
    if (connected) return 'external';
    if (isGoogleAuthenticated) return 'auto-generated';
    return null;
  }

  /**
   * Check if user can perform transactions
   */
  static canTransact(
    connected: boolean,
    provider: SolanaWalletProvider | null,
    userProfile: UserProfile | null,
    isGoogleAuthenticated: boolean
  ): boolean {
    // External wallet with provider
    if (connected && provider?.signTransaction) return true;
    
    // Google user with encrypted private key
    if (isGoogleAuthenticated && userProfile?.private_key_encrypted) return true;
    
    return false;
  }

  /**
   * Get display name for the wallet
   */
  static getWalletDisplayName(
    connected: boolean,
    currentWallet: string | null,
    isGoogleAuthenticated: boolean
  ): string {
    if (connected && currentWallet) return currentWallet;
    if (isGoogleAuthenticated) return 'Auto-Generated Wallet';
    return 'No Wallet Connected';
  }
}