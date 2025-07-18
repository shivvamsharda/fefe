
import { PublicKey, Transaction } from '@solana/web3.js';
import { SolanaWalletProvider } from '@/context/WalletContext';
import { toast } from 'sonner';
import SolflareSdk from '@solflare-wallet/sdk';

// Connection cache with TTL
interface CachedConnection {
  provider: SolanaWalletProvider;
  timestamp: number;
  isValid: boolean;
}

interface CachedBalance {
  balance: number;
  timestamp: number;
}

// Enhanced session data interface
interface WalletSession {
  wallet_address: string;
  wallet_name?: string;
  authenticated: boolean;
  signature?: string;
  timestamp: number;
  connection_timestamp?: number;
}

const CONNECTION_CACHE = new Map<string, CachedConnection>();
const BALANCE_CACHE = new Map<string, CachedBalance>();
const CACHE_TTL = 30000; // 30 seconds
const BALANCE_TTL = 10000; // 10 seconds
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Cross-tab communication event types
const WALLET_EVENTS = {
  CONNECTED: 'wallet_connected',
  DISCONNECTED: 'wallet_disconnected',
  STATE_SYNC: 'wallet_state_sync'
};

// Initialize Solflare SDK instance
const solflareSDK = new SolflareSdk({ network: 'mainnet-beta' });

// Adapter for Solflare SDK
const solflareAdapter = (sdkInstance: SolflareSdk): SolanaWalletProvider => ({
  connect: async () => {
    await sdkInstance.connect();
    if (sdkInstance.publicKey) {
      return { publicKey: sdkInstance.publicKey };
    }
    throw new Error("Solflare connection failed or public key not available.");
  },
  disconnect: async () => {
    await sdkInstance.disconnect();
  },
  on: (event, callback) => {
    sdkInstance.on(event as any, callback);
  },
  off: (event, callback) => {
    sdkInstance.removeListener(event as any, callback);
  },
  signMessage: async (message: Uint8Array) => {
    const signature = await sdkInstance.signMessage(message, 'utf8');
    return { signature };
  },
  get publicKey() {
    return sdkInstance.publicKey;
  },
  signTransaction: async (transaction: Transaction): Promise<Transaction> => {
    const signedTransaction = await sdkInstance.signTransaction(transaction);
    return signedTransaction as Transaction;
  },
  signAllTransactions: async (transactions: Transaction[]): Promise<Transaction[]> => {
    const signedTransactions = await sdkInstance.signAllTransactions(transactions);
    return signedTransactions as Transaction[];
  },
  get connected() {
    return sdkInstance.isConnected;
  },
});

export const WALLET_CONFIGS = [
  {
    name: 'Phantom',
    icon: '/lovable-uploads/f1020bdc-4d93-41ef-b281-5c5aac6d080d.png',
    getProvider: () => (typeof window !== 'undefined' && window.phantom?.solana) || null,
  },
  {
    name: 'Solflare',
    icon: '/lovable-uploads/13f2dc97-68e6-4ada-971f-5b640f1c09fb.png',
    getProvider: () => (typeof window !== 'undefined' && window.solflare) ? solflareAdapter(solflareSDK) : null,
  },
  {
    name: 'Backpack',
    icon: '/icons/backpack.svg',
    getProvider: () => (typeof window !== 'undefined' && window.backpack?.solana) || null,
  },
];

export class WalletConnectionService {
  private static instance: WalletConnectionService;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private storageEventHandler: ((event: StorageEvent) => void) | null = null;

  static getInstance(): WalletConnectionService {
    if (!WalletConnectionService.instance) {
      WalletConnectionService.instance = new WalletConnectionService();
    }
    return WalletConnectionService.instance;
  }

  constructor() {
    this.setupCrossTabCommunication();
  }

  // Enhanced session management
  saveWalletSession(walletAddress: string, walletName: string, signature?: string) {
    const session: WalletSession = {
      wallet_address: walletAddress,
      wallet_name: walletName,
      authenticated: true,
      signature,
      timestamp: Date.now(),
      connection_timestamp: Date.now()
    };
    
    localStorage.setItem('wallet_session', JSON.stringify(session));
    
    // Notify other tabs about the connection
    this.broadcastWalletEvent(WALLET_EVENTS.CONNECTED, {
      walletAddress,
      walletName,
      timestamp: Date.now()
    });
  }

  getWalletSession(): WalletSession | null {
    try {
      const sessionStr = localStorage.getItem('wallet_session');
      if (!sessionStr) return null;
      
      const session: WalletSession = JSON.parse(sessionStr);
      
      // Check if session is still valid
      if (Date.now() - session.timestamp > SESSION_TTL) {
        this.clearWalletSession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Error retrieving wallet session:', error);
      return null;
    }
  }

  clearWalletSession() {
    localStorage.removeItem('wallet_session');
    
    // Notify other tabs about disconnection
    this.broadcastWalletEvent(WALLET_EVENTS.DISCONNECTED, {
      timestamp: Date.now()
    });
  }

  // Cross-tab communication setup
  private setupCrossTabCommunication() {
    if (typeof window === 'undefined') return;

    this.storageEventHandler = (event: StorageEvent) => {
      if (event.key === 'wallet_cross_tab_event') {
        try {
          const eventData = JSON.parse(event.newValue || '{}');
          this.handleCrossTabEvent(eventData);
        } catch (error) {
          console.error('Error handling cross-tab event:', error);
        }
      }
    };

    window.addEventListener('storage', this.storageEventHandler);
  }

  private broadcastWalletEvent(eventType: string, data: any) {
    if (typeof window === 'undefined') return;

    const eventData = {
      type: eventType,
      data,
      timestamp: Date.now(),
      tabId: Math.random().toString(36).substr(2, 9)
    };

    localStorage.setItem('wallet_cross_tab_event', JSON.stringify(eventData));
    
    // Clean up the event after a short delay
    setTimeout(() => {
      localStorage.removeItem('wallet_cross_tab_event');
    }, 1000);
  }

  private handleCrossTabEvent(eventData: any) {
    // Handle cross-tab events if needed
    console.log('Cross-tab wallet event received:', eventData);
    
    // You can add custom logic here to sync state across tabs
    // For now, we'll let the individual components handle their own state
  }

  // Get available wallets with caching
  getAvailableWallets() {
    return WALLET_CONFIGS.map(config => ({
      name: config.name,
      icon: config.icon,
      provider: this.getCachedProvider(config.name) || config.getProvider(),
    }));
  }

  // Cache provider instances
  private getCachedProvider(walletName: string): SolanaWalletProvider | null {
    const cached = CONNECTION_CACHE.get(walletName);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && cached.isValid) {
      return cached.provider;
    }
    return null;
  }

  private setCachedProvider(walletName: string, provider: SolanaWalletProvider) {
    CONNECTION_CACHE.set(walletName, {
      provider,
      timestamp: Date.now(),
      isValid: true,
    });
  }

  // Enhanced connection restoration
  async restoreWalletConnection(): Promise<{
    success: boolean;
    provider?: SolanaWalletProvider;
    walletName?: string;
    publicKey?: string;
    fromSession?: boolean;
  }> {
    try {
      // First check for active session
      const session = this.getWalletSession();
      if (!session || !session.wallet_name) {
        return { success: false };
      }

      // Try to restore provider connection
      const walletConfig = WALLET_CONFIGS.find(w => w.name === session.wallet_name);
      if (!walletConfig) {
        return { success: false };
      }

      const provider = walletConfig.getProvider();
      if (!provider) {
        console.log(`${session.wallet_name} wallet extension not available for restoration`);
        return { success: false };
      }

      // Check if wallet is already connected
      if (provider.connected && provider.publicKey) {
        this.setCachedProvider(session.wallet_name, provider);
        return {
          success: true,
          provider,
          walletName: session.wallet_name,
          publicKey: provider.publicKey.toString(),
          fromSession: true
        };
      }

      // Try to reconnect silently if possible
      try {
        const result = await this.connectWithTimeout(provider, 5000);
        if (result.success) {
          this.setCachedProvider(session.wallet_name, provider);
          return {
            success: true,
            provider,
            walletName: session.wallet_name,
            publicKey: result.publicKey,
            fromSession: true
          };
        }
      } catch (error) {
        console.log('Silent reconnection failed, session exists but connection lost');
      }

      return { success: false, fromSession: true };
      
    } catch (error) {
      console.error('Error restoring wallet connection:', error);
      return { success: false };
    }
  }

  // Optimized wallet connection with timeout
  async connectWallet(walletName: string): Promise<{
    success: boolean;
    provider?: SolanaWalletProvider;
    publicKey?: string;
    error?: string;
  }> {
    try {
      const walletConfig = WALLET_CONFIGS.find(w => w.name === walletName);
      if (!walletConfig) {
        return { success: false, error: `Wallet ${walletName} not found` };
      }

      // Check for cached provider first
      let provider = this.getCachedProvider(walletName);
      
      if (!provider) {
        provider = walletConfig.getProvider();
        if (!provider) {
          return { 
            success: false, 
            error: `${walletName} wallet extension not detected. Please install it first.` 
          };
        }
      }

      // Set connection timeout
      const connectionPromise = this.connectWithTimeout(provider, 10000);
      const result = await connectionPromise;

      if (result.success) {
        this.setCachedProvider(walletName, provider);
        return {
          success: true,
          provider,
          publicKey: result.publicKey,
        };
      }

      return { success: false, error: result.error };

    } catch (error: any) {
      console.error(`Error connecting to ${walletName}:`, error);
      return { 
        success: false, 
        error: error.message || `Failed to connect to ${walletName}` 
      };
    }
  }

  private async connectWithTimeout(
    provider: SolanaWalletProvider, 
    timeoutMs: number
  ): Promise<{ success: boolean; publicKey?: string; error?: string }> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Connection timeout' });
      }, timeoutMs);

      provider.connect()
        .then((response) => {
          clearTimeout(timeout);
          if (response && response.publicKey) {
            resolve({ 
              success: true, 
              publicKey: response.publicKey.toString() 
            });
          } else {
            resolve({ success: false, error: 'Failed to get public key' });
          }
        })
        .catch((error) => {
          clearTimeout(timeout);
          resolve({ 
            success: false, 
            error: error.message || 'Connection failed' 
          });
        });
    });
  }

  // Enhanced existing connection check
  checkExistingConnection(): { 
    provider: SolanaWalletProvider | null; 
    walletName: string | null;
    publicKey: string | null;
  } {
    // First try to get from session
    const session = this.getWalletSession();
    if (session && session.wallet_name) {
      const walletConfig = WALLET_CONFIGS.find(w => w.name === session.wallet_name);
      if (walletConfig) {
        const provider = walletConfig.getProvider();
        if (provider && provider.connected && provider.publicKey) {
          this.setCachedProvider(session.wallet_name, provider);
          return {
            provider,
            walletName: session.wallet_name,
            publicKey: provider.publicKey.toString(),
          };
        }
      }
    }

    // Fallback to checking all providers
    for (const config of WALLET_CONFIGS) {
      const provider = config.getProvider();
      if (provider && provider.connected && provider.publicKey) {
        this.setCachedProvider(config.name, provider);
        return {
          provider,
          walletName: config.name,
          publicKey: provider.publicKey.toString(),
        };
      }
    }
    
    return { provider: null, walletName: null, publicKey: null };
  }

  // Cached balance fetching
  async fetchCachedBalance(
    publicKey: string, 
    fetchFunction: () => Promise<number>
  ): Promise<number | null> {
    const cached = BALANCE_CACHE.get(publicKey);
    if (cached && Date.now() - cached.timestamp < BALANCE_TTL) {
      return cached.balance;
    }

    try {
      const balance = await fetchFunction();
      BALANCE_CACHE.set(publicKey, {
        balance,
        timestamp: Date.now(),
      });
      return balance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return null;
    }
  }

  // Clear cache when disconnecting
  clearCache(walletName?: string) {
    if (walletName) {
      CONNECTION_CACHE.delete(walletName);
    } else {
      CONNECTION_CACHE.clear();
      BALANCE_CACHE.clear();
    }
  }

  // Health check for existing connections
  async healthCheck(provider: SolanaWalletProvider): Promise<boolean> {
    try {
      return provider.connected && !!provider.publicKey;
    } catch {
      return false;
    }
  }

  // Cleanup method
  destroy() {
    if (this.storageEventHandler) {
      window.removeEventListener('storage', this.storageEventHandler);
      this.storageEventHandler = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }
}

export const walletConnectionService = WalletConnectionService.getInstance();
