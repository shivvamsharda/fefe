import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { authenticateWallet, logoutWalletSession, getWalletSession } from '@/services/walletAuth';
import { toast } from 'sonner';
import { createUserProfile, getUserProfileByWallet, createGoogleUserProfile, getUserProfileByEmail, UserProfile, getGoogleUserProfile } from '@/services/profileService';
import { generateSolanaWallet, saveWalletToProfile, userNeedsWalletSetup } from '@/services/googleWalletService';
import { getCreatorProfileByWallet } from '@/services/creatorProfileService';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import UsernameSetupDialog from '@/components/wallet/UsernameSetupDialog';
import GoogleUsernameSetup from '@/components/auth/GoogleUsernameSetup';
import AuthModal from '@/components/auth/AuthModal';
import PrivateKeyDownloadModal from '@/components/wallet/PrivateKeyDownloadModal';
import { walletConnectionService } from '@/services/walletConnectionService';
import { balanceService } from '@/services/balanceService';
import { UnifiedWalletService } from '@/services/unifiedWalletService';
import { GoogleWalletProvider } from '@/services/googleWalletProvider';

export type SolanaWalletProvider = {
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  publicKey: PublicKey | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  connected: boolean;
};

interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
  walletAddress: string | null;
  solBalance: number | null;
  wenliveBalance: number | null;
  connectWallet: (walletName: string) => Promise<void>;
  disconnectWallet: () => void;
  wallets: { name: string; icon: string; provider: SolanaWalletProvider | null }[];
  currentWallet: string | null;
  isAuthenticated: boolean;
  username: string | null;
  userUuid: string | null;
  userProfile: UserProfile | null;
  hasCreatorProfile: boolean;
  refreshCreatorProfileStatus: () => Promise<void>;
  isWalletModalOpen: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  provider: SolanaWalletProvider | null;
  // Google auth states
  googleUser: User | null;
  googleSession: Session | null;
  isGoogleAuthenticated: boolean;
  // Add Supabase session state
  supabaseSession: Session | null;
  // Loading states
  isConnecting: boolean;
  isLoadingBalances: boolean;
  // Unified wallet capabilities
  hasWalletCapability: boolean;
  effectiveWalletAddress: string | null;
  walletType: 'external' | 'auto-generated' | null;
  canTransact: boolean;
  walletDisplayName: string;
  getUnifiedProvider: () => SolanaWalletProvider | null;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  publicKey: null,
  walletAddress: null,
  solBalance: null,
  wenliveBalance: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  wallets: [],
  currentWallet: null,
  isAuthenticated: false,
  username: null,
  userUuid: null,
  userProfile: null,
  hasCreatorProfile: false,
  refreshCreatorProfileStatus: async () => {},
  isWalletModalOpen: false,
  openWalletModal: () => {},
  closeWalletModal: () => {},
  provider: null,
  googleUser: null,
  googleSession: null,
  isGoogleAuthenticated: false,
  supabaseSession: null,
  isConnecting: false,
  isLoadingBalances: false,
  hasWalletCapability: false,
  effectiveWalletAddress: null,
  walletType: null,
  canTransact: false,
  walletDisplayName: 'No Wallet Connected',
  getUnifiedProvider: () => null,
});

export const useWallet = () => useContext(WalletContext);

declare global {
  interface Window {
    phantom?: {
      solana?: SolanaWalletProvider;
    };
    solflare?: any;
    backpack?: {
      solana?: SolanaWalletProvider;
    };
  }
}

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  // Wallet states
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [provider, setProvider] = useState<SolanaWalletProvider | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [wenliveBalance, setWenliveBalance] = useState<number | null>(null);
  const [currentWallet, setCurrentWallet] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Loading states
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  
  // Google auth states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleSession, setGoogleSession] = useState<Session | null>(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  
  // Supabase session state
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  
  // Common states
  const [username, setUsername] = useState<string | null>(null);
  const [userUuid, setUserUuid] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasCreatorProfile, setHasCreatorProfile] = useState<boolean>(false);
  
  // Dialog states
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [showGoogleUsernameSetup, setShowGoogleUsernameSetup] = useState(false);
  const [showPrivateKeyDownload, setShowPrivateKeyDownload] = useState(false);
  const [tempWalletAddress, setTempWalletAddress] = useState<string | null>(null);
  const [tempGoogleData, setTempGoogleData] = useState<{ email: string; googleId: string } | null>(null);
  const [generatedWallet, setGeneratedWallet] = useState<{ privateKey: string; walletAddress: string } | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  
  // Removed complex race condition handling - using simple wallet check instead

  const openWalletModal = () => setIsWalletModalOpen(true);
  const closeWalletModal = () => setIsWalletModalOpen(false);

  // Derive walletAddress from publicKey
  const walletAddress = useMemo(() => {
    return publicKey;
  }, [publicKey]);

  // Get available wallets using the optimized service
  const wallets = useMemo(() => {
    return walletConnectionService.getAvailableWallets();
  }, []);

  // Capture referral code on mount - only for wallet users
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refWalletAddress = urlParams.get('ref');
    if (refWalletAddress) {
      console.log('Captured referral wallet address from URL:', refWalletAddress);
      localStorage.setItem('temp_referral_wallet', refWalletAddress);
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Clean wallet generation function - separated from auth logic
  const checkAndGenerateWallet = async (profile: UserProfile) => {
    console.log('💰 checkAndGenerateWallet called for profile:', profile.id);
    
    // Prevent multiple simultaneous wallet generations
    if (showPrivateKeyDownload) {
      console.log('💰 Wallet generation already in progress, skipping');
      return;
    }
    
    if (!(await userNeedsWalletSetup(profile))) {
      console.log('💰 User already has wallet, skipping generation');
      return;
    }
    
    // Add delay to ensure auth state is stable before wallet generation
    console.log('💰 User needs wallet, waiting for auth state to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Double-check auth state before proceeding
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.log('❌ No active session for wallet generation, retrying later');
      setTimeout(() => checkAndGenerateWallet(profile), 1000);
      return;
    }
    
    console.log('💰 Auth state confirmed, generating wallet...');
    await initiateWalletSetup(profile.id);
  };

  // Process referral when wallet connects
  const processReferralOnConnect = async (userWalletAddress: string, userProfileId: string) => {
    const referrerWalletAddress = localStorage.getItem('temp_referral_wallet');
    if (!referrerWalletAddress || referrerWalletAddress === userWalletAddress) {
      localStorage.removeItem('temp_referral_wallet');
      return;
    }

    try {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('referred_by_wallet')
        .eq('id', userProfileId)
        .single();

      if (existingProfile?.referred_by_wallet) {
        console.log('User already has a referrer, skipping');
        localStorage.removeItem('temp_referral_wallet');
        return;
      }

      const { data: referrerProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('wallet_address', referrerWalletAddress)
        .single();

      if (referrerProfile) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ referred_by_wallet: referrerWalletAddress })
          .eq('id', userProfileId);

        if (!error) {
          console.log('Successfully set referrer:', referrerWalletAddress);
          await supabase.rpc('increment_referral_stats', {
            referrer_wallet: referrerWalletAddress,
            is_valid: false
          });
          toast.success('Referral applied successfully!');
        } else {
          console.error('Error setting referrer:', error);
        }
      } else {
        console.log('Referrer wallet not found in database');
      }
    } catch (error) {
      console.error('Error processing referral:', error);
    } finally {
      localStorage.removeItem('temp_referral_wallet');
    }
  };

  // Initialize auth state listener for Google auth only
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session);
        
        // Only synchronous state updates here - no async/await!
        setSupabaseSession(session);
        
        if (session?.user) {
          const isGoogleUser = session.user.app_metadata?.provider === 'google' || session.user.email?.endsWith('@gmail.com') || session.user.email?.includes('google');
          
          if (isGoogleUser) {
            setGoogleSession(session);
            setGoogleUser(session.user);
            setIsGoogleAuthenticated(true);
            
            console.log('Google user detected, deferring profile lookup for:', session.user.email, session.user.id);
            
            // Defer async profile lookup to prevent deadlock
            if (session.user.email) {
              setTimeout(async () => {
                try {
                  // First sync the google_id to ensure it matches auth.uid()
                  await supabase.rpc('ensure_google_id_sync', {
                    input_email: session.user.email,
                    input_google_id: session.user.id
                  });
                  
                  const existingProfile = await getGoogleUserProfile(session.user);
                  if (existingProfile) {
                    console.log('🔍 Found existing Google user profile:', existingProfile);
                    setUsername(existingProfile.username);
                    setUserUuid(existingProfile.id);
                    setUserProfile(existingProfile);
                    setHasCreatorProfile(false);
                    
                    // Check and generate wallet if needed
                    await checkAndGenerateWallet(existingProfile);
                  } else {
                    console.log('🔍 No Google user profile found, showing username setup');
                    setTempGoogleData({
                      email: session.user.email!,
                      googleId: session.user.id
                    });
                    setShowGoogleUsernameSetup(true);
                  }
                } catch (error) {
                  console.error('❌ Error fetching Google user profile:', error);
                }
              }, 0);
            }
          }
        } else {
          setSupabaseSession(null);
          setGoogleSession(null);
          setGoogleUser(null);
          setIsGoogleAuthenticated(false);
          if (!connected) {
            setUsername(null);
            setUserUuid(null);
            setHasCreatorProfile(false);
          }
        }
      }
    );

    // Session restoration - also defer async operations
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSupabaseSession(session);
        const isGoogleUser = session.user.app_metadata?.provider === 'google' || session.user.email?.endsWith('@gmail.com') || session.user.email?.includes('google');
        
        if (isGoogleUser) {
          setGoogleSession(session);
          setGoogleUser(session.user);
          setIsGoogleAuthenticated(true);
          
          console.log('Session restoration for Google user, deferring profile lookup:', session.user.email, session.user.id);
          
          // Defer async profile lookup during restoration too
          setTimeout(async () => {
            try {
              // First sync the google_id to ensure it matches auth.uid()
              if (session.user.email) {
                await supabase.rpc('ensure_google_id_sync', {
                  input_email: session.user.email,
                  input_google_id: session.user.id
                });
              }
              
              const existingProfile = await getGoogleUserProfile(session.user);
              if (existingProfile) {
                console.log('🔄 Restored Google user profile:', existingProfile);
                setUsername(existingProfile.username);
                setUserUuid(existingProfile.id);
                setUserProfile(existingProfile);
                setHasCreatorProfile(false);
                
                // Check and generate wallet if needed
                await checkAndGenerateWallet(existingProfile);
              }
            } catch (error) {
              console.error('❌ Error restoring Google user profile:', error);
            }
          }, 0);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [connected]);

  // Optimized wallet initialization with cross-tab restoration
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        setIsConnecting(true);
        
        // Try to restore connection from session/provider state
        const restorationResult = await walletConnectionService.restoreWalletConnection();
        
        if (restorationResult.success && restorationResult.provider && restorationResult.publicKey) {
          console.log('Wallet connection restored:', restorationResult.walletName);
          
          setProvider(restorationResult.provider);
          setConnected(true);
          setCurrentWallet(restorationResult.walletName || null);
          setPublicKey(restorationResult.publicKey);
          
          // Set up event listeners
          restorationResult.provider.on('connect', () => handleWalletConnect(restorationResult.provider!));
          restorationResult.provider.on('disconnect', handleWalletDisconnect);
          
          // Check authentication and load profile data
          if (restorationResult.fromSession) {
            setIsAuthenticated(true);
            
            const userProfile: UserProfile | null = await getUserProfileByWallet(restorationResult.publicKey);
            if (userProfile) {
              setUsername(userProfile.username);
              setUserUuid(userProfile.id);
              setUserProfile(userProfile);
            }
            
            const creatorProfile = await getCreatorProfileByWallet(restorationResult.publicKey);
            setHasCreatorProfile(!!creatorProfile);
          }
          
          // Fetch balances in background
          fetchBalances(new PublicKey(restorationResult.publicKey));
        } else {
          // Fallback to checking existing connections without session
          const existingConnection = walletConnectionService.checkExistingConnection();
          if (existingConnection.provider && existingConnection.publicKey) {
            setProvider(existingConnection.provider);
            setConnected(true);
            setCurrentWallet(existingConnection.walletName);
            setPublicKey(existingConnection.publicKey);
            
            // Load user profile for wallet-authenticated users
            const userProfile: UserProfile | null = await getUserProfileByWallet(existingConnection.publicKey);
            if (userProfile) {
              setUsername(userProfile.username);
              setUserUuid(userProfile.id);
              setUserProfile(userProfile);
            }
            
            const creatorProfile = await getCreatorProfileByWallet(existingConnection.publicKey);
            setHasCreatorProfile(!!creatorProfile);
            
            // Set up event listeners
            existingConnection.provider.on('connect', () => handleWalletConnect(existingConnection.provider!));
            existingConnection.provider.on('disconnect', handleWalletDisconnect);
            
            // Fetch balances in background
            fetchBalances(new PublicKey(existingConnection.publicKey));
          }
        }
      } catch (error) {
        console.error('Error initializing wallet:', error);
      } finally {
        setIsConnecting(false);
      }
    };
    
    initializeWallet();
  }, []);

  // Optimized balance fetching
  const fetchBalances = async (walletPublicKey: PublicKey) => {
    setIsLoadingBalances(true);
    try {
      const balances = await balanceService.fetchBalances(walletPublicKey);
      setSolBalance(balances.sol);
      setWenliveBalance(balances.wenlive);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const handleWalletConnect = async (walletProvider: SolanaWalletProvider) => {
    if (walletProvider?.publicKey) {
      setConnected(true);
      const pkString = walletProvider.publicKey.toString();
      setPublicKey(pkString);
      fetchBalances(walletProvider.publicKey);
      
      const userProfile = await getUserProfileByWallet(pkString);
      if (userProfile) {
        setUsername(userProfile.username);
        setUserUuid(userProfile.id);
        setUserProfile(userProfile);
        const creatorProfileData = await getCreatorProfileByWallet(pkString);
        setHasCreatorProfile(!!creatorProfileData);
      } else {
        setUsername(null);
        setUserUuid(null);
        setUserProfile(null);
        setHasCreatorProfile(false);
      }
    }
  };

  const handleWalletDisconnect = () => {
    setConnected(false);
    setPublicKey(null);
    setSolBalance(null);
    setWenliveBalance(null);
    setCurrentWallet(null);
    setIsAuthenticated(false);
    setUsername(null);
    setUserUuid(null);
    setUserProfile(null);
    setHasCreatorProfile(false);
    logoutWalletSession();
    walletConnectionService.clearWalletSession();
    balanceService.clearCache();
  };

  const handleUsernameSubmit = async (usernameToSubmit: string) => {
    if (!tempWalletAddress) return;
    
    try {
      const profile = await createUserProfile(tempWalletAddress, usernameToSubmit);
      if (profile) {
        console.log('Profile created successfully:', profile);
        setUsername(profile.username);
        setUserUuid(profile.id);
        setShowUsernameDialog(false);
        
        await processReferralOnConnect(tempWalletAddress, profile.id);
        completeAuthentication();
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Failed to create profile");
    }
  };

  const handleGoogleUsernameSubmit = async (usernameToSubmit: string) => {
    console.log('👤 handleGoogleUsernameSubmit called:', { 
      usernameToSubmit, 
      tempGoogleData,
      hasEmail: !!tempGoogleData?.email,
      hasGoogleId: !!tempGoogleData?.googleId
    });
    
    if (!tempGoogleData) {
      console.log('❌ No temp Google data available');
      return;
    }
    
    try {
      console.log('👤 Creating Google user profile...');
      const profile = await createGoogleUserProfile(
        tempGoogleData.email, 
        tempGoogleData.googleId, 
        usernameToSubmit
      );
      
      console.log('👤 Google profile creation result:', profile);
      
      if (profile) {
        console.log('👤 Profile created successfully, setting states...');
        
        // Set all profile states
        setUsername(profile.username);
        setUserUuid(profile.id);
        setUserProfile(profile);
        setShowGoogleUsernameSetup(false);
        setTempGoogleData(null);
        
        // Check and generate wallet if needed
        await checkAndGenerateWallet(profile);
        
        toast.success("Welcome! Profile created successfully");
      } else {
        console.log('❌ Profile creation returned null/undefined');
        toast.error("Failed to create profile");
      }
    } catch (error) {
      console.error("❌ Error creating Google profile:", error);
      toast.error("Failed to create profile");
    }
  };

  const initiateWalletSetup = async (userId: string) => {
    console.log('🚀 initiateWalletSetup called:', { userId });
    
    try {
      console.log('🚀 Generating Solana wallet...');
      const wallet = generateSolanaWallet();
      
      console.log('🚀 Saving wallet to profile...');
      const saved = await saveWalletToProfile(userId, wallet);
      console.log('🚀 Wallet save result:', saved);
      
      if (saved) {
        console.log('🚀 Setting generated wallet state...');
        setGeneratedWallet({
          privateKey: wallet.privateKey,
          walletAddress: wallet.publicKey
        });
        
        // Update userProfile state with new wallet address
        setUserProfile(prev => prev ? {
          ...prev,
          wallet_address: wallet.publicKey
        } : prev);
        
        console.log('🚀 Setting show private key download to true...');
        setShowPrivateKeyDownload(true);
        
        console.log('🚀 State updated successfully:', {
          generatedWalletSet: true,
          showPrivateKeyDownloadSet: true,
          userProfileUpdated: true
        });
        
        toast.success("Wallet generated! Please download your private key.");
      } else {
        console.log('❌ Failed to save wallet to profile');
        toast.error("Failed to generate wallet");
      }
    } catch (error) {
      console.error('❌ Error setting up wallet:', error);
      toast.error("Failed to set up wallet");
    }
  };

  const handleWalletSetupComplete = async () => {
    setGeneratedWallet(null);
    setShowPrivateKeyDownload(false);
    
    // Refetch profile instead of reloading page
    if (googleUser) {
      try {
        const updatedProfile = await getGoogleUserProfile(googleUser);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
          console.log('🔄 Profile refreshed after wallet setup:', updatedProfile);
        }
      } catch (error) {
        console.error('❌ Error refreshing profile:', error);
      }
    }
    
    toast.success("Wallet setup completed successfully!");
  };
  
  const cancelUsernameSetup = () => {
    if (provider) {
      provider.disconnect();
    }
    setShowUsernameDialog(false);
    handleWalletDisconnect();
  };
  
  const completeAuthentication = () => {
    toast.success("Wallet connected and profile created!");
    
    // Save session with wallet name for cross-tab persistence
    if (tempWalletAddress && currentWallet) {
      walletConnectionService.saveWalletSession(tempWalletAddress, currentWallet);
    }
    
    setIsAuthenticated(true);
    setTempWalletAddress(null);
  };

  // Optimized wallet connection
  const connectWallet = async (walletName: string) => {
    if (isConnecting) return; // Prevent multiple simultaneous connections
    
    setIsConnecting(true);
    try {
      const result = await walletConnectionService.connectWallet(walletName);
      
      if (!result.success) {
        toast.error("Failed to connect wallet", {
          description: result.error
        });
        return;
      }

      if (result.provider && result.publicKey) {
        setProvider(result.provider);
        setConnected(true);
        setPublicKey(result.publicKey);
        setCurrentWallet(walletName);
        
        const walletPublicKey = new PublicKey(result.publicKey);
        fetchBalances(walletPublicKey);
        
        result.provider.on('connect', () => handleWalletConnect(result.provider!));
        result.provider.on('disconnect', handleWalletDisconnect);
        
        // Authentication flow
        if (result.provider.signMessage) {
          const authenticated = await authenticateWallet(
            walletPublicKey,
            result.provider.signMessage.bind(result.provider)
          );
          
          if (authenticated) {
            setIsAuthenticated(true);
            
            const userProfile = await getUserProfileByWallet(result.publicKey);
            
            if (userProfile) {
              setUsername(userProfile.username);
              setUserUuid(userProfile.id);
              const creatorProfileData = await getCreatorProfileByWallet(result.publicKey);
              setHasCreatorProfile(!!creatorProfileData);
              
              // Save session for cross-tab persistence
              walletConnectionService.saveWalletSession(result.publicKey, walletName);
              
              await processReferralOnConnect(result.publicKey, userProfile.id);
            } else {
              setHasCreatorProfile(false);
              setUserUuid(null);
              setTempWalletAddress(result.publicKey);
              setShowUsernameDialog(true);
            }
          } else {
            await result.provider.disconnect();
            handleWalletDisconnect();
          }
        } else {
          toast.error("Wallet doesn't support message signing");
          await result.provider.disconnect();
          handleWalletDisconnect();
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error("Failed to connect wallet", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (provider) {
        await provider.disconnect();
        handleWalletDisconnect();
      }
      
      if (isGoogleAuthenticated) {
        await supabase.auth.signOut();
        setGoogleSession(null);
        setGoogleUser(null);
        setIsGoogleAuthenticated(false);
      }
      
      if (!connected && !isGoogleAuthenticated) {
        setUsername(null);
        setUserUuid(null);
        setHasCreatorProfile(false);
      }
      
      await logoutWalletSession();
      setIsAuthenticated(false);
      walletConnectionService.clearCache();
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error("Failed to disconnect", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // Unified wallet capabilities using the service
  const hasWalletCapability = UnifiedWalletService.hasWalletCapability(connected, userProfile, isGoogleAuthenticated);
  const effectiveWalletAddress = UnifiedWalletService.getWalletAddress(connected, publicKey, userProfile, isGoogleAuthenticated);
  const walletType = UnifiedWalletService.getWalletType(connected, isGoogleAuthenticated);
  const canTransact = UnifiedWalletService.canTransact(connected, provider, userProfile, isGoogleAuthenticated);
  const walletDisplayName = UnifiedWalletService.getWalletDisplayName(connected, currentWallet, isGoogleAuthenticated);

  // Function to get unified provider (external or virtual Google provider)
  const getUnifiedProvider = (): SolanaWalletProvider | null => {
    // External wallet takes priority
    if (connected && provider) return provider;
    
    // Create virtual Google provider if available
    if (isGoogleAuthenticated && userProfile?.private_key_encrypted && GoogleWalletProvider.isValidEncryptedKey(userProfile.private_key_encrypted)) {
      try {
        return GoogleWalletProvider.create(userProfile.private_key_encrypted);
      } catch (error) {
        console.error('❌ Error creating GoogleWalletProvider:', error);
        return null;
      }
    }
    
    return null;
  };

  // Function to refresh creator profile status
  const refreshCreatorProfileStatus = async (): Promise<void> => {
    try {
      if (effectiveWalletAddress) {
        const creatorProfile = await getCreatorProfileByWallet(effectiveWalletAddress);
        setHasCreatorProfile(!!creatorProfile);
        console.log('Creator profile status refreshed:', !!creatorProfile);
      }
    } catch (error) {
      console.error('Error refreshing creator profile status:', error);
    }
  };

  const contextValue: WalletContextType = {
    connected,
    publicKey,
    walletAddress,
    solBalance,
    wenliveBalance,
    connectWallet,
    disconnectWallet,
    wallets, 
    currentWallet,
    isAuthenticated: isAuthenticated || isGoogleAuthenticated,
    username,
    userUuid,
    userProfile,
    hasCreatorProfile,
    refreshCreatorProfileStatus,
    isWalletModalOpen,
    openWalletModal,
    closeWalletModal,
    provider,
    googleUser,
    googleSession,
    isGoogleAuthenticated,
    supabaseSession,
    isConnecting,
    isLoadingBalances,
    // Unified wallet capabilities
    hasWalletCapability,
    effectiveWalletAddress,
    walletType,
    canTransact,
    walletDisplayName,
    getUnifiedProvider,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
      
      <UsernameSetupDialog
        isOpen={showUsernameDialog}
        walletAddress={tempWalletAddress}
        onSubmit={handleUsernameSubmit}
        onCancel={cancelUsernameSetup}
      />

      <GoogleUsernameSetup
        isOpen={showGoogleUsernameSetup}
        email={tempGoogleData?.email || ''}
        onSubmit={handleGoogleUsernameSubmit}
      />

      <AuthModal
        isOpen={isWalletModalOpen}
        onClose={closeWalletModal}
      />

      {generatedWallet && (
        <PrivateKeyDownloadModal
          isOpen={showPrivateKeyDownload}
          onClose={() => setShowPrivateKeyDownload(false)}
          privateKey={generatedWallet.privateKey}
          walletAddress={generatedWallet.walletAddress}
          userId={userUuid || ''}
          onConfirmed={handleWalletSetupComplete}
        />
      )}
    </WalletContext.Provider>
  );
};

export default WalletContext;
