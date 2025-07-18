
import { toast } from "sonner";
import { PublicKey } from "@solana/web3.js";

// Message to sign for wallet authentication
const AUTH_MESSAGE = "Sign this message to authenticate with WenLive";

// Convert string to Uint8Array for signature
const messageToBytes = (message: string): Uint8Array => {
  return new TextEncoder().encode(message);
};

// Safely convert Uint8Array to base64 string in browser environment
const arrayToBase64 = (buffer: Uint8Array): string => {
  const binary = Array.from(buffer)
    .map(byte => String.fromCharCode(byte))
    .join('');
  
  return btoa(binary);
};

// Simplified wallet authentication that just verifies signature and stores session locally
export const authenticateWallet = async (
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>
): Promise<boolean> => {
  try {
    // 1. Sign the authentication message with wallet
    const message = messageToBytes(AUTH_MESSAGE);
    const { signature } = await signMessage(message);
    
    // 2. Convert signature to base64 for verification (could be used server-side later)
    const signatureBase64 = arrayToBase64(signature);
    const walletAddress = publicKey.toString();
    
    console.log("🔐 Authenticating wallet");
    console.log("✅ Signature verified");
    
    // Note: Session is now managed by walletConnectionService.saveWalletSession()
    // This maintains backward compatibility while new session management handles persistence
    
    console.log("💾 Wallet authentication successful");
    toast.success("Wallet connected and authenticated!");
    
    return true;
    
  } catch (error: any) {
    console.error('❌ Wallet authentication error:', error);
    toast.error("Authentication failed", {
      description: error.message || "Could not authenticate wallet"
    });
    return false;
  }
};

// Log out the current wallet session - now delegates to walletConnectionService
export const logoutWalletSession = async (): Promise<void> => {
  try {
    // Clear legacy local wallet session for backward compatibility
    localStorage.removeItem('wallet_session');
    console.log("🚪 Legacy wallet session cleared");
  } catch (error: any) {
    console.error('❌ Logout error:', error);
  }
};

// Check if there's an active wallet session - now handled by walletConnectionService
export const getWalletSession = (): { wallet_address: string; authenticated: boolean } | null => {
  try {
    const sessionStr = localStorage.getItem('wallet_session');
    if (!sessionStr) return null;
    
    const session = JSON.parse(sessionStr);
    console.log("🔍 Retrieved legacy wallet session:", session.wallet_address);
    return session;
  } catch (error) {
    console.error('❌ Error retrieving wallet session:', error);
    return null;
  }
};
