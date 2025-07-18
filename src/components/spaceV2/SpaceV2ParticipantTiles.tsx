
import React from 'react';
import { Track, RemoteParticipant, RemoteTrack } from 'livekit-client';
import { Monitor, MicOff, VideoOff, Maximize } from 'lucide-react';
import type { JoinSpaceResponse, SpaceParticipant } from '@/services/spacesV2Service';

interface SpaceV2ParticipantTilesProps {
  joinData: JoinSpaceResponse;
  participants: Map<string, RemoteParticipant>;
  spaceParticipants: SpaceParticipant[];
  localScreenShare: any;
  remoteScreenShares: Map<string, {
    track: RemoteTrack;
    participant: RemoteParticipant;
    publication: any;
  }>;
  isHost: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  localScreenShareRef: React.MutableRefObject<HTMLVideoElement | null>;
  participantVideosRef: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  remoteScreenShareRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  attachTrackToElement: (track: any, element: HTMLVideoElement) => boolean;
  onOpenFullScreen: (track: RemoteTrack, participant: RemoteParticipant) => void;
  validateParticipantRole: (participantIdentity: string, expectedRole: 'host' | 'participant' | 'viewer') => boolean;
  canParticipantPublish: (participantIdentity: string) => boolean;
  getParticipantRole: (participantIdentity: string, participantWallet?: string) => 'host' | 'participant' | 'viewer' | null;
  inferParticipantRole: (participantIdentity: string, participantWallet?: string) => 'host' | 'participant' | 'viewer' | null;
  extractWalletFromMetadata: (participant: any) => string | undefined;
}

const SpaceV2ParticipantTiles: React.FC<SpaceV2ParticipantTilesProps> = ({
  joinData,
  participants,
  spaceParticipants,
  localScreenShare,
  remoteScreenShares,
  isHost,  
  isVideoEnabled,
  isAudioEnabled,
  localVideoRef,
  localScreenShareRef,
  participantVideosRef,
  remoteScreenShareRefs,
  attachTrackToElement,
  onOpenFullScreen,
  validateParticipantRole,
  canParticipantPublish,
  getParticipantRole,
  inferParticipantRole,
  extractWalletFromMetadata
}) => {
  
  // FIXED: Wallet-first role detection with proper viewer identification
  const getDisplayRole = (participant: RemoteParticipant): { role: 'host' | 'participant' | 'viewer', displayText: string, bgColor: string } => {
    console.log(`🎯 Getting display role for participant: "${participant.identity}"`);
    
    // Extract wallet from participant metadata
    const participantWallet = extractWalletFromMetadata(participant);
    console.log(`💰 Extracted wallet from metadata: ${participantWallet}`);
    
    // WALLET-FIRST: Try database role with wallet priority
    let role = getParticipantRole(participant.identity, participantWallet);
    console.log(`📋 Database role result (wallet-first): ${role}`);
    
    // If no database role, use inference
    if (!role) {
      role = inferParticipantRole(participant.identity, participantWallet);
      console.log(`🤔 Inferred role result: ${role}`);
    }
    
    // FINAL FALLBACK: If still no role, check if they can publish to determine viewer vs participant
    if (!role) {
      console.log(`❓ No role determined, checking publish permissions...`);
      // Check if participant has publishing capabilities
      const hasVideoTrack = participant.getTrackPublication(Track.Source.Camera)?.track;
      const hasAudioTrack = participant.getTrackPublication(Track.Source.Microphone)?.track;
      const canPublish = hasVideoTrack || hasAudioTrack;
      
      // If they can't publish or have no tracks, they're likely a viewer
      role = canPublish ? 'participant' : 'viewer';
      console.log(`🔍 Determined role based on publish capability: ${role} (canPublish: ${canPublish})`);
    }
    
    console.log(`✅ Final display role for "${participant.identity}": ${role}`);
    
    // Return display configuration based on role
    switch (role) {
      case 'host':
        return { role, displayText: 'HOST', bgColor: 'bg-primary text-black' };
      case 'participant':
        return { role, displayText: 'PARTICIPANT', bgColor: 'bg-green-500 text-white' };
      case 'viewer':
        return { role, displayText: 'VIEWER', bgColor: 'bg-blue-500 text-white' };
      default:
        return { role: 'viewer', displayText: 'VIEWER', bgColor: 'bg-blue-500 text-white' };
    }
  };

  // Filter participants to display
  const shouldDisplayParticipant = (participant: RemoteParticipant): boolean => {
    // Skip egress participants
    if (participant.identity?.includes('egress') || participant.identity?.includes('recording')) {
      console.log(`🚫 Skipping egress participant: ${participant.identity}`);
      return false;
    }

    console.log(`✅ Displaying participant: ${participant.identity}`);
    return true;
  };

  // Enhanced video element setup
  const setupVideoElement = (el: HTMLVideoElement | null, participantSid: string, participant: RemoteParticipant) => {
    if (!el) {
      console.log(`❌ No video element provided for ${participant.identity}`);
      return;
    }
    
    console.log(`📹 Setting up video element for ${participant.identity} (${participantSid})`);
    
    el.autoplay = true;
    el.playsInline = true;
    el.muted = false;
    el.id = `video-${participantSid}`;
    
    participantVideosRef.current.set(participantSid, el);
    
    setTimeout(() => {
      const videoTrack = participant.getTrackPublication(Track.Source.Camera)?.track;
      if (videoTrack) {
        console.log(`📹 Attaching video track for ${participant.identity}`);
        try {
          const attached = attachTrackToElement(videoTrack, el);
          console.log(`📹 Video track attachment result for ${participant.identity}: ${attached}`);
        } catch (error) {
          console.error(`❌ Failed to attach video track for ${participant.identity}:`, error);
        }
      } else {
        console.log(`📹 No video track available for ${participant.identity}`);
      }
    }, 100);
  };

  // Enhanced screen share element setup
  const setupScreenShareElement = (el: HTMLVideoElement | null, participantSid: string, track?: RemoteTrack) => {
    if (!el) return;
    
    console.log(`🖥️ Setting up screen share element for ${participantSid}`);
    
    el.autoplay = true;
    el.playsInline = true;
    el.muted = true;
    el.id = `screen-${participantSid}`;
    
    remoteScreenShareRefs.current.set(participantSid, el);
    
    if (track) {
      setTimeout(() => {
        console.log(`🖥️ Attaching screen share track`);
        try {
          const attached = attachTrackToElement(track, el);
          console.log(`🖥️ Screen share track attachment result: ${attached}`);
        } catch (error) {
          console.error(`❌ Failed to attach screen share track:`, error);
        }
      }, 100);
    }
  };

  // Filter participants
  const validParticipants = Array.from(participants.values()).filter(shouldDisplayParticipant);
  console.log(`👥 Displaying ${validParticipants.length} out of ${participants.size} participants`);

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-4 max-w-4xl">
      {/* Local participant tile (for non-viewers) */}
      {joinData.role !== 'viewer' && (
        <div className="relative w-105 h-32 bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 flex items-center gap-2">
            <div className="bg-primary text-black text-xs px-3 py-1 rounded-lg font-semibold">
              YOU
            </div>
            {isHost && (
              <div className="bg-primary text-black text-xs px-3 py-1 rounded-lg font-semibold">
                HOST
              </div>
            )}
            {joinData.role === 'participant' && (
              <div className="bg-green-500 text-white text-xs px-3 py-1 rounded-lg font-semibold">
                PARTICIPANT
              </div>
            )}
            {localScreenShare && (
              <div className="bg-primary text-black text-xs px-2 py-1 rounded-lg font-semibold flex items-center gap-1">
                <Monitor size={12} />
                SCREEN
              </div>
            )}
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            {!isAudioEnabled && (
              <div className="bg-red-500 rounded-full p-1.5">
                <MicOff size={12} className="text-white" />
              </div>
            )}
            {!isVideoEnabled && (
              <div className="bg-red-500 rounded-full p-1.5">
                <VideoOff size={12} className="text-white" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remote participants tiles with FIXED wallet-first role detection */}
      {validParticipants.map((participant) => {
        const { role, displayText, bgColor } = getDisplayRole(participant);
        
        return (
          <div key={participant.sid} className="relative w-105 h-32 bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
            <video
              ref={(el) => setupVideoElement(el, participant.sid, participant)}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              <div className="text-white text-xs bg-black/70 px-3 py-1 rounded-lg font-medium">
                {participant.identity}
              </div>
              <div className={`text-xs px-2 py-1 rounded-lg font-semibold ${bgColor}`}>
                {displayText}
              </div>
              {remoteScreenShares.has(participant.sid) && (
                <div className="bg-primary text-black text-xs px-2 py-1 rounded-lg font-semibold flex items-center gap-1">
                  <Monitor size={12} />
                  SCREEN
                </div>
              )}
            </div>
            <div className="absolute top-2 right-2">
              {participant.getTrackPublication(Track.Source.Microphone)?.isMuted && (
                <div className="bg-red-500 rounded-full p-1.5">
                  <MicOff size={12} className="text-white" />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Local screen share tile */}
      {localScreenShare && (
        <div className="relative w-192 h-48 bg-gray-900 rounded-xl overflow-hidden border-2 border-primary shadow-xl">
          <video
            ref={(el) => {
              if (el) {
                localScreenShareRef.current = el;
                el.autoplay = true;
                el.muted = true;
                el.playsInline = true;
                
                if (localScreenShare?.track) {
                  setTimeout(() => {
                    try {
                      localScreenShare.track.attach(el);
                      console.log('✅ Local screen share track attached');
                    } catch (error) {
                      console.error('❌ Failed to attach local screen share track:', error);
                    }
                  }, 100);
                }
              }
            }}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain bg-black"
          />
          <div className="absolute bottom-3 left-3 flex items-center gap-3">
            <div className="bg-primary text-black text-sm px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2">
              <Monitor size={14} />
              Your Screen
            </div>
            {localScreenShare?.track && (
              <button
                onClick={() => onOpenFullScreen(localScreenShare.track as RemoteTrack, { identity: 'YOU' } as RemoteParticipant)}
                className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition-colors"
                title="View in full screen"
              >
                <Maximize size={16} />
              </button>
            )}
          </div>
          <div className="absolute top-3 right-3 bg-primary text-black text-xs px-3 py-1 rounded-lg font-semibold">
            LIVE
          </div>
        </div>
      )}

      {/* Remote screen share tiles */}
      {Array.from(remoteScreenShares.entries())
        .filter(([participantSid, { participant }]) => shouldDisplayParticipant(participant))
        .map(([participantSid, { track, participant }]) => (
        <div key={`screen-${participantSid}`} className="relative w-192 h-48 bg-gray-900 rounded-xl overflow-hidden border-2 border-primary shadow-xl">
          <video
            ref={(el) => setupScreenShareElement(el, participantSid, track)}
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-black"
          />
          <div className="absolute bottom-3 left-3 flex items-center gap-3">
            <div className="bg-primary text-black text-sm px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2">
              <Monitor size={14} />
              {participant.identity}'s Screen
            </div>
            <button
              onClick={() => onOpenFullScreen(track, participant)}
              className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition-colors"
              title="View in full screen"
            >
              <Maximize size={16} />
            </button>
          </div>
          <div className="absolute top-3 right-3 bg-primary text-black text-xs px-3 py-1 rounded-lg font-semibold">
            LIVE
          </div>
        </div>
      ))}
    </div>
  );
};

export default SpaceV2ParticipantTiles;
