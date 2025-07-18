import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSpaceV2, joinSpaceV2, goLiveSpaceV2, endSpaceV2, getSpaceParticipants } from '@/services/spacesV2Service';
import { toast } from 'sonner';
import type { SpaceV2, JoinSpaceResponse, SpaceParticipant } from '@/services/spacesV2Service';

export const useSpaceV2 = (roomName: string | undefined, walletAddress: string | null) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [space, setSpace] = useState<SpaceV2 | null>(null);
  const [joinData, setJoinData] = useState<JoinSpaceResponse | null>(null);
  const [spaceParticipants, setSpaceParticipants] = useState<SpaceParticipant[]>([]);
  const [participantsVersion, setParticipantsVersion] = useState(0); // Force re-render mechanism
  const [isLoading, setIsLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [category, setCategory] = useState('');
  const [shouldAutoJoin, setShouldAutoJoin] = useState(false);
  const [invitedRole, setInvitedRole] = useState<'participant' | 'viewer' | null>(null);

  // Enhanced function with proper state management and duplicate handling
  const fetchSpaceParticipants = async (spaceId: string, retryCount: number = 0) => {
    try {
      console.log(`🔍 Fetching participants for space: ${spaceId} (attempt ${retryCount + 1})`);
      const participants = await getSpaceParticipants(spaceId);
      console.log('📋 Raw participants data from API:', participants);
      
      if (!participants || participants.length === 0) {
        console.log(`⚠️ No participants found in database for space: ${spaceId}`);
        setSpaceParticipants([]);
        setParticipantsVersion(prev => prev + 1);
        return [];
      }

      // Handle duplicate entries - keep only the most recent entry per wallet/user
      const uniqueParticipants = participants.reduce((acc: SpaceParticipant[], current) => {
        const existing = acc.find(p => 
          (p.wallet_address && current.wallet_address && p.wallet_address === current.wallet_address) ||
          (p.display_name === current.display_name && p.user_id === current.user_id)
        );
        
        if (existing) {
          // Keep the more recent entry
          const currentTime = new Date(current.joined_at).getTime();
          const existingTime = new Date(existing.joined_at).getTime();
          if (currentTime > existingTime) {
            // Replace with more recent entry
            const index = acc.indexOf(existing);
            acc[index] = current;
          }
        } else {
          acc.push(current);
        }
        return acc;
      }, []);

      console.log(`✅ Processed ${uniqueParticipants.length} unique participants from ${participants.length} total entries`);
      
      // Force state update with validation
      setSpaceParticipants(uniqueParticipants);
      setParticipantsVersion(prev => prev + 1);
      
      // Verify state update worked
      setTimeout(() => {
        console.log('🔄 State verification - participants count:', uniqueParticipants.length);
      }, 100);
      
      return uniqueParticipants;
    } catch (error) {
      console.error('❌ Failed to fetch space participants:', error);
      setSpaceParticipants([]);
      setParticipantsVersion(prev => prev + 1);
      return [];
    }
  };

  // Enhanced wallet extraction with better error handling
  const extractWalletFromMetadata = (participant: any): string | undefined => {
    if (!participant.metadata) {
      return undefined;
    }
    
    try {
      const parsedMetadata = typeof participant.metadata === 'string' 
        ? JSON.parse(participant.metadata)
        : participant.metadata;
      
      const walletKeys = ['wallet', 'walletAddress', 'wallet_address', 'address'];
      for (const key of walletKeys) {
        if (parsedMetadata[key]) {
          return parsedMetadata[key];
        }
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  };

  // FIXED: Wallet-first role detection with proper viewer identification
  const getParticipantRole = (participantIdentity: string, participantWallet?: string): 'host' | 'participant' | 'viewer' | null => {
    console.log(`🔍 Getting role for participant: "${participantIdentity}" (wallet: ${participantWallet})`);
    console.log(`📊 Current spaceParticipants state (length: ${spaceParticipants.length}, version: ${participantsVersion}):`, spaceParticipants);
    
    // PRIORITY 1: Direct host wallet match (most reliable)
    if (space?.host_wallet && participantWallet && space.host_wallet === participantWallet) {
      console.log(`👑 Participant ${participantIdentity} is HOST by direct wallet match`);
      return 'host';
    }
    
    // PRIORITY 2: Host wallet suffix match in identity (for cases where identity contains wallet)
    if (space?.host_wallet && participantIdentity.includes(space.host_wallet.slice(-8))) {
      console.log(`👑 Participant ${participantIdentity} is HOST by identity suffix match`);
      return 'host';
    }
    
    // PRIORITY 3: WALLET-FIRST Database lookup (FIXED PRIORITY ORDER)
    if (spaceParticipants.length > 0) {
      console.log(`🔍 Searching database participants for matches - WALLET FIRST...`);
      
      let bestMatch: SpaceParticipant | null = null;
      
      // WALLET ADDRESS MATCHING FIRST (MOST RELIABLE)
      if (participantWallet) {
        const walletMatches = spaceParticipants.filter(p => 
          p.wallet_address === participantWallet
        );
        
        if (walletMatches.length > 0) {
          console.log(`💰 Found ${walletMatches.length} wallet matches for ${participantWallet}`);
          bestMatch = walletMatches.reduce((best, current) => {
            // Host role always wins
            if (current.role === 'host' && best.role !== 'host') return current;
            if (best.role === 'host' && current.role !== 'host') return best;
            
            // More recent entry wins
            const currentTime = new Date(current.joined_at).getTime();
            const bestTime = new Date(best.joined_at).getTime();
            if (currentTime > bestTime) return current;
            
            return best;
          });
        }
      }
      
      // FALLBACK: Display name matching only if no wallet match found
      if (!bestMatch) {
        console.log(`📝 No wallet match found, trying display name matches...`);
        const nameMatches = spaceParticipants.filter(p => {
          // Exact display name match
          if (p.display_name === participantIdentity) return true;
          
          // Partial identity match for wallet-based identities
          if (p.wallet_address && participantIdentity.includes(p.wallet_address.slice(-8))) return true;
          
          // Case-insensitive display name match
          if (p.display_name.toLowerCase() === participantIdentity.toLowerCase()) return true;
          
          return false;
        });
        
        if (nameMatches.length > 0) {
          console.log(`📝 Found ${nameMatches.length} name matches`);
          bestMatch = nameMatches.reduce((best, current) => {
            // Host role always wins
            if (current.role === 'host' && best.role !== 'host') return current;
            if (best.role === 'host' && current.role !== 'host') return best;
            
            // More recent entry wins
            const currentTime = new Date(current.joined_at).getTime();
            const bestTime = new Date(best.joined_at).getTime();
            if (currentTime > bestTime) return current;
            
            return best;
          });
        }
      }
      
      if (bestMatch) {
        console.log(`✅ Found best match participant:`, bestMatch);
        console.log(`📝 Role from database: ${bestMatch.role}`);
        return bestMatch.role;
      } else {
        console.log(`❌ No matching database participant found for "${participantIdentity}" with wallet ${participantWallet}`);
      }
    } else {
      console.log(`⚠️ No database participants loaded yet (spaceParticipants.length = 0)`);
    }
    
    console.log(`❌ No role found for participant ${participantIdentity}`);
    return null;
  };

  // Enhanced role inference with better fallback logic
  const inferParticipantRole = (participantIdentity: string, participantWallet?: string): 'host' | 'participant' | 'viewer' | null => {
    console.log(`🤔 Inferring role for participant: "${participantIdentity}" (wallet: ${participantWallet})`);
    
    // First try database lookup
    const dbRole = getParticipantRole(participantIdentity, participantWallet);
    if (dbRole) {
      console.log(`✅ Got role from database: ${dbRole}`);
      return dbRole;
    }
    
    // Fallback: Host detection using space context (even if database is empty)
    if (space?.host_wallet) {
      if (participantWallet && space.host_wallet === participantWallet) {
        console.log(`👑 Inferred HOST by direct wallet fallback`);
        return 'host';
      }
      
      if (participantIdentity.includes(space.host_wallet.slice(-8))) {
        console.log(`👑 Inferred HOST by identity fallback`);
        return 'host';
      }
    }
    
    // If this is the current user, use their join data role
    if (walletAddress && participantWallet && walletAddress === participantWallet) {
      const currentUserRole = joinData?.role;
      if (currentUserRole) {
        console.log(`👤 This is current user, using join data role: ${currentUserRole}`);
        return currentUserRole;
      }
    }
    
    // Return null to let caller handle final fallback
    console.log(`❓ Could not determine role, returning null`);
    return null;
  };

  // Function to validate participant role
  const validateParticipantRole = (participantIdentity: string, expectedRole: 'host' | 'participant' | 'viewer'): boolean => {
    const actualRole = getParticipantRole(participantIdentity);
    console.log(`🔍 Validating role for ${participantIdentity}, expected: ${expectedRole}, actual: ${actualRole}`);
    
    if (!actualRole) {
      console.warn(`⚠️ Participant ${participantIdentity} not found in database, allowing with fallback`);
      return true; // Be permissive for video display
    }
    
    return actualRole === expectedRole;
  };

  // Function to check if participant can publish
  const canParticipantPublish = (participantIdentity: string): boolean => {
    const role = getParticipantRole(participantIdentity);
    const canPublish = role === 'host' || role === 'participant';
    console.log(`🎙️ Can ${participantIdentity} publish? ${canPublish} (role: ${role})`);
    return canPublish;
  };

  // Only initialize when we have authentication
  useEffect(() => {
    if (!roomName || walletAddress === null) {
      if (!roomName) {
        navigate('/');
      } else {
        setIsLoading(true);
      }
      return;
    }

    const loadSpace = async () => {
      try {
        console.log('🚀 Loading space:', roomName);
        const spaceData = await getSpaceV2(roomName);
        if (!spaceData) {
          toast.error('Space not found');
          navigate('/');
          return;
        }

        if (spaceData.is_public && !spaceData.is_live) {
          toast.error('This space is no longer live');
          navigate('/spaces');
          return;
        }

        console.log('📍 Space loaded:', spaceData);
        setSpace(spaceData);
        setCategory(spaceData.category || '');
        
        const userIsHost = walletAddress && spaceData.host_wallet === walletAddress;
        setIsHost(userIsHost);
        console.log('👑 Is host:', userIsHost);

        // Fetch participants immediately after space is loaded
        console.log('📋 Fetching participants immediately after space load...');
        await fetchSpaceParticipants(spaceData.id);

        // Check for invitation parameters
        const inviteParam = searchParams.get('invite');
        if (inviteParam === 'participant') {
          setInvitedRole('participant');
          setShouldAutoJoin(true);
        } else if (inviteParam === 'viewer') {
          setInvitedRole('viewer');
          setShouldAutoJoin(true);
        } else if (spaceData.is_public && spaceData.is_live && !userIsHost) {
          setInvitedRole('viewer');
          setShouldAutoJoin(true);
        }

      } catch (error) {
        console.error('❌ Error loading space:', error);
        toast.error('Failed to load space');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadSpace();
  }, [roomName, walletAddress, navigate, searchParams]);

  // Enhanced participants refresh with better state management
  useEffect(() => {
    if (space?.id && walletAddress) {
      console.log('⏰ Setting up participant refresh for space:', space.id);
      
      // Initial fetch
      fetchSpaceParticipants(space.id);
      
      // Set up regular refresh interval
      const interval = setInterval(() => {
        console.log('🔄 Regular refresh of participants...');
        fetchSpaceParticipants(space.id);
      }, 5000); // Reduced to 5 seconds for better responsiveness

      return () => {
        clearInterval(interval);
      };
    }
  }, [space?.id, walletAddress]);

  // Debug effect to monitor spaceParticipants state changes
  useEffect(() => {
    console.log('🔄 spaceParticipants state changed:', spaceParticipants.length, 'version:', participantsVersion, spaceParticipants);
  }, [spaceParticipants, participantsVersion]);

  const joinSpace = async (displayName: string, role: 'host' | 'participant' | 'viewer', autoJoin: boolean = false) => {
    if (!roomName) {
      toast.error('Room name is required');
      return null;
    }

    const finalRole = autoJoin && invitedRole ? invitedRole : role;
    const shouldRequireName = !walletAddress && !autoJoin;
    if (shouldRequireName && !displayName.trim()) {
      toast.error('Please enter your display name');
      return null;
    }

    setIsLoading(true);
    try {
      console.log('🚀 Joining space with:', { roomName, displayName: displayName.trim(), walletAddress, role: finalRole, autoJoin });
      
      const response = await joinSpaceV2(
        roomName,
        displayName.trim(),
        walletAddress,
        finalRole,
        autoJoin
      );

      console.log('📥 Join space response:', response);

      if (!response.token || !response.livekitUrl) {
        throw new Error('Invalid join response: missing token or LiveKit URL');
      }

      if (typeof response.token !== 'string') {
        console.error('❌ Token is not a string:', response.token);
        throw new Error('Invalid token format received');
      }

      setJoinData(response);
      
      // Aggressively refresh participants after joining
      if (space?.id) {
        console.log('🔄 Aggressively refreshing participants after join...');
        // Multiple refreshes to ensure data is captured
        setTimeout(() => fetchSpaceParticipants(space.id), 500);
        setTimeout(() => fetchSpaceParticipants(space.id), 2000);
        setTimeout(() => fetchSpaceParticipants(space.id), 4000);
      }
      
      toast.success(`Joined as ${finalRole}`);
      return response;
    } catch (error) {
      console.error('❌ Error joining space:', error);
      toast.error('Failed to join space: ' + (error.message || 'Unknown error'));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const goLive = async () => {
    if (!roomName || !walletAddress || !isHost) {
      toast.error('Only the host can go live');
      return;
    }

    try {
      await goLiveSpaceV2(roomName, walletAddress, category);
      if (space) {
        setSpace({ ...space, is_live: true, is_public: true });
      }
      toast.success('Space is now live!');
    } catch (error) {
      console.error('Error going live:', error);
      toast.error('Failed to go live');
    }
  };

  const endSpace = async () => {
    if (!roomName || !walletAddress || !isHost) {
      toast.error('Only the host can end the space');
      return;
    }

    try {
      await endSpaceV2(roomName, walletAddress);
      toast.success('Space ended');
      navigate('/spaces');
    } catch (error) {
      console.error('Error ending space:', error);
      toast.error('Failed to end space');
    }
  };

  return {
    space,
    setSpace,
    joinData,
    spaceParticipants,
    isLoading,
    setIsLoading,
    isHost,
    category,
    setCategory,
    shouldAutoJoin,
    invitedRole,
    joinSpace,
    goLive,
    endSpace,
    validateParticipantRole,
    getParticipantRole,
    canParticipantPublish,
    fetchSpaceParticipants,
    inferParticipantRole,
    extractWalletFromMetadata
  };
};
