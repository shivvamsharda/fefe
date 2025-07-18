import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { RemoteTrack, RemoteParticipant, ConnectionState } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { UserCheck, Wallet } from 'lucide-react';
import PreMeetingSetup from '@/components/space/PreMeetingSetup';
import FullScreenOverlay from '@/components/space/FullScreenOverlay';
import SpaceV2Header from './SpaceV2Header';
import SpaceV2Controls from './SpaceV2Controls';
import SpaceV2ParticipantTiles from './SpaceV2ParticipantTiles';
import SpaceV2JoinForm from './SpaceV2JoinForm';
import { useLiveKitRoom } from '@/hooks/useLiveKitRoom';
import { useSpaceV2 } from '@/hooks/useSpaceV2';

interface SpaceV2RoomProps {
  mode?: 'host' | 'participant' | 'viewer';
}

const SpaceV2Room: React.FC<SpaceV2RoomProps> = ({ mode = 'participant' }) => {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();
  const { hasWalletCapability, effectiveWalletAddress, isAuthenticated, openWalletModal } = useWallet();
  
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'participant' | 'viewer'>('participant');
  const [isJoined, setIsJoined] = useState(false);
  const [showPreMeeting, setShowPreMeeting] = useState(false);
  const [hasVideo, setHasVideo] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);
  
  // Full-screen states
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenTrack, setFullScreenTrack] = useState<RemoteTrack | null>(null);
  const [fullScreenParticipant, setFullScreenParticipant] = useState<RemoteParticipant | null>(null);
  
  // Authentication Guard - Only proceed if wallet is authenticated
  const {
    space,
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
    inferParticipantRole,
    extractWalletFromMetadata
  } = useSpaceV2(roomName, isAuthenticated ? effectiveWalletAddress : null);

  const {
    room,
    participants,
    localParticipant,
    connectionState,
    isVideoEnabled,
    isAudioEnabled,
    localScreenShare,
    remoteScreenShares,
    localVideoRef,
    localScreenShareRef,
    participantVideosRef,
    participantAudiosRef,
    remoteScreenShareRefs,
    connectToRoom,
    enableCameraAndMicrophone,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    disconnect,
    attachTrackToElement
  } = useLiveKitRoom();

  // Show authentication screen if wallet is not connected
  if (!isAuthenticated || !hasWalletCapability) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-900 rounded-full flex items-center justify-center border border-primary/30">
            <Wallet size={36} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-white">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            You need to connect your wallet to join this space.
          </p>
          <div className="space-x-3">
            <Button onClick={openWalletModal} className="bg-primary text-black font-semibold">
              Connect Wallet
            </Button>
            <Button onClick={() => navigate('/spaces')} variant="outline">
              Back to Spaces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Auto-join effect with role validation - only after authentication
  useEffect(() => {
    if (!space || isJoined || isLoading || !isAuthenticated || !hasWalletCapability) return;

    const handleAutoJoin = async () => {
      if (isHost) {
        console.log('🎯 Host detected, showing pre-meeting setup');
        setShowPreMeeting(true);
      } else if (shouldAutoJoin && invitedRole) {
        if (invitedRole === 'viewer') {
          console.log('👁️ Viewer auto-joining without preview');
          const response = await joinSpace('', invitedRole, true);
          if (response) {
            setIsJoined(true);
            const connectedRoom = await connectToRoom(response.token, response.livekitUrl, invitedRole);
          }
        } else {
          console.log('👤 Participant invited, showing pre-meeting setup');
          setShowPreMeeting(true);
        }
      }
    };

    handleAutoJoin();
  }, [space, isHost, shouldAutoJoin, invitedRole, isJoined, isLoading, isAuthenticated, hasWalletCapability, joinSpace, connectToRoom]);

  const openFullScreen = (track: RemoteTrack, participant: RemoteParticipant) => {
    console.log(`🖥️ Opening full-screen for ${participant.identity}`);
    setFullScreenTrack(track);
    setFullScreenParticipant(participant);
    setIsFullScreen(true);
  };

  const closeFullScreen = () => {
    console.log(`🖥️ Closing full-screen`);
    setIsFullScreen(false);
    setFullScreenTrack(null);
    setFullScreenParticipant(null);
  };

  const handleJoinSpace = async (name: string, role: 'host' | 'participant' | 'viewer') => {
    setDisplayName(name);
    
    if (role === 'viewer') {
      await performJoinSpace(name, role);
    } else {
      setShowPreMeeting(true);
    }
  };

  const performJoinSpace = async (name: string, role: 'host' | 'participant' | 'viewer') => {
    const response = await joinSpace(name, role);
    if (response) {
      setIsJoined(true);
      setShowPreMeeting(false);
      
      const connectedRoom = await connectToRoom(response.token, response.livekitUrl, role);
      
      if (role !== 'viewer' && connectedRoom) {
        await enableCameraAndMicrophone(connectedRoom, hasVideo, hasAudio);
      }
    }
  };

  const handlePreMeetingJoin = (videoEnabled: boolean, audioEnabled: boolean) => {
    console.log('⚙️ Pre-meeting setup completed:', { videoEnabled, audioEnabled });
    setHasVideo(videoEnabled);
    setHasAudio(audioEnabled);
    
    const finalRole = isHost ? 'host' : (invitedRole || selectedRole);
    performJoinSpace(displayName, finalRole);
  };

  const handleGoLive = async () => {
    await goLive();
  };

  const handleEndSpace = async () => {
    if (room) {
      disconnect();
    }
    await endSpace();
  };

  const handleLeaveSpace = () => {
    if (room) {
      disconnect();
    }
    navigate('/spaces');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Loading space...</h2>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Space not found</h2>
          <Button onClick={() => navigate('/spaces')}>Back to Spaces</Button>
        </div>
      </div>
    );
  }

  if (showPreMeeting) {
    return (
      <PreMeetingSetup
        onJoinMeeting={handlePreMeetingJoin}
        meetingTitle={space.title}
        isHost={isHost}
      />
    );
  }

  if (!isJoined && !shouldAutoJoin && !isHost) {
    return (
      <SpaceV2JoinForm
        space={space}
        isHost={isHost}
        isLoading={isLoading}
        onJoinSpace={handleJoinSpace}
      />
    );
  }

  if (!joinData || !joinData.token || !joinData.livekitUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Connection Error</h2>
          <p className="text-gray-400 mb-4">
            Failed to establish connection to the space. Please try again.
          </p>
          <div className="space-x-2">
            <Button onClick={() => setIsJoined(false)} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => navigate('/spaces')}>
              Back to Spaces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalParticipants = participants.size + (joinData?.role !== 'viewer' ? 1 : 0);

  return (
    <>
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <SpaceV2Header
          space={space}
          roomName={roomName!}
          isHost={isHost}
          category={category}
          setCategory={setCategory}
          connectionState={connectionState}
          localScreenShare={localScreenShare}
          remoteScreenShares={remoteScreenShares}
          onGoLive={handleGoLive}
          onEndSpace={handleEndSpace}
          onLeaveSpace={handleLeaveSpace}
        />

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Participant tiles with enhanced role detection */}
          <SpaceV2ParticipantTiles
            joinData={joinData}
            participants={participants}
            spaceParticipants={spaceParticipants}
            localScreenShare={localScreenShare}
            remoteScreenShares={remoteScreenShares}
            isHost={isHost}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            localVideoRef={localVideoRef}
            localScreenShareRef={localScreenShareRef}
            participantVideosRef={participantVideosRef}
            remoteScreenShareRefs={remoteScreenShareRefs}
            attachTrackToElement={attachTrackToElement}
            onOpenFullScreen={openFullScreen}
            validateParticipantRole={validateParticipantRole}
            canParticipantPublish={canParticipantPublish}
            getParticipantRole={getParticipantRole}
            inferParticipantRole={inferParticipantRole}
            extractWalletFromMetadata={extractWalletFromMetadata}
          />

          {/* Central waiting message */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-900 rounded-full flex items-center justify-center border border-primary/30">
                <UserCheck size={36} className="text-primary" />
              </div>
              <div className="text-2xl mb-3 font-semibold">
                {totalParticipants === 0 ? 'Waiting for participants...' : `${totalParticipants} participant${totalParticipants > 1 ? 's' : ''} in the space`}
              </div>
              <div className="text-base text-gray-400">
                {joinData.role === 'viewer' ? 'You are viewing this space' : 'Share the space link to invite others'}
              </div>
            </div>
          </div>

          {/* Connection status overlay */}
          {connectionState !== ConnectionState.Connected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <div className="text-white text-center">
                <div className="text-xl mb-2 font-semibold">
                  {connectionState === ConnectionState.Connecting ? 'Connecting...' : 'Disconnected'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls Bar - only for non-viewers */}
        {joinData.role !== 'viewer' && (
          <SpaceV2Controls
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            localScreenShare={localScreenShare}
            connectionState={connectionState}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onToggleScreenShare={toggleScreenShare}
            onLeaveSpace={handleLeaveSpace}
          />
        )}
      </div>

      {/* Full-Screen Overlay */}
      <FullScreenOverlay
        isOpen={isFullScreen}
        onClose={closeFullScreen}
        track={fullScreenTrack}
        participant={fullScreenParticipant}
        participantName={fullScreenParticipant?.identity || ''}
      />
    </>
  );
};

export default SpaceV2Room;
