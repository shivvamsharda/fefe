import { useState, useEffect, useRef } from 'react';
import { Room, Track, RemoteTrack, RemoteParticipant, LocalParticipant, ConnectionState, TrackPublication, ParticipantEvent } from 'livekit-client';
import { toast } from 'sonner';

export const useLiveKitRoom = () => {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  // Screen share states
  const [localScreenShare, setLocalScreenShare] = useState<TrackPublication | null>(null);
  const [remoteScreenShares, setRemoteScreenShares] = useState<Map<string, {
    track: RemoteTrack;
    participant: RemoteParticipant;
    publication: TrackPublication;
  }>>(new Map());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenShareRef = useRef<HTMLVideoElement | null>(null);
  const participantVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const participantAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteScreenShareRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // Enhanced participant tracking refs (from original spaces)
  const connectedParticipants = useRef<Map<string, RemoteParticipant>>(new Map());
  const createdTiles = useRef<Set<string>>(new Set());
  const participantTracks = useRef<Map<string, {
    video?: RemoteTrack;
    audio?: RemoteTrack;
    screenShare?: RemoteTrack;
  }>>(new Map());

  // Effect to handle local screen share track attachment
  useEffect(() => {
    if (localScreenShare?.track && localScreenShareRef.current) {
      console.log('🖥️ Attaching local screen share track to video element');
      try {
        localScreenShare.track.attach(localScreenShareRef.current);
        console.log('✅ Local screen share track attached successfully');
      } catch (error) {
        console.error('❌ Failed to attach local screen share track:', error);
      }
    }
  }, [localScreenShare]);

  // Simplified track attachment function (like original spaces)
  const attachTrackToElement = (track: Track, element: HTMLVideoElement | HTMLAudioElement): boolean => {
    try {
      if (!element || !element.parentNode) {
        console.warn(`❌ Element not ready for track ${track.sid}`);
        return false;
      }
      
      track.attach(element);
      console.log(`✅ Track ${track.sid} attached successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to attach track ${track.sid}:`, error);
      return false;
    }
  };

  // Check if participant should be processed (skip egress participants)
  const shouldProcessParticipant = (participant: RemoteParticipant): boolean => {
    // Skip egress participants (like original spaces)
    if (participant.identity?.includes('egress') || participant.identity?.includes('recording')) {
      console.log(`🚫 Skipping egress participant: ${participant.identity}`);
      return false;
    }
    return true;
  };

  // Handle local participant track publications
  const handleLocalTrackPublished = (publication: TrackPublication, participant: LocalParticipant) => {
    console.log(`🎬 Local track published:`, {
      source: publication.source,
      kind: publication.kind,
      trackSid: publication.trackSid,
      identity: participant.identity
    });

    if (publication.source === Track.Source.ScreenShare) {
      console.log(`🖥️ Local screen share published successfully by ${participant.identity}`);
      setLocalScreenShare(publication);
      toast.success('You are now sharing your screen');
    }
  };

  // Handle local participant track unpublished
  const handleLocalTrackUnpublished = (publication: TrackPublication, participant: LocalParticipant) => {
    console.log(`🎬❌ Local track unpublished:`, {
      source: publication.source,
      kind: publication.kind,
      identity: participant.identity
    });

    if (publication.source === Track.Source.ScreenShare) {
      console.log(`🖥️❌ Local screen share unpublished by ${participant.identity}`);
      setLocalScreenShare(null);
      
      if (publication.track && localScreenShareRef.current) {
        publication.track.detach();
      }
      
      toast.info('You stopped sharing your screen');
    }
  };

  // Enhanced participant track subscription handling with role validation
  const handleParticipantTrackSubscribed = (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
    // Skip processing if participant should not be processed
    if (!shouldProcessParticipant(participant)) {
      return;
    }

    console.log(`📺 Participant track subscribed:`, {
      participant: participant.identity,
      trackKind: track.kind,
      trackSource: track.source,
      trackSid: track.sid
    });

    // Update participant tracks ref
    const tracks = participantTracks.current.get(participant.sid) || {};
    
    if (track.kind === Track.Kind.Video) {
      if (track.source === Track.Source.ScreenShare) {
        console.log(`🖥️ Screen share subscribed from ${participant.identity}`);
        tracks.screenShare = track;
        
        setRemoteScreenShares(prev => {
          const newMap = new Map(prev.set(participant.sid, {
            track,
            participant,
            publication
          }));
          return newMap;
        });
        
        // Attach to screen share element if available
        setTimeout(() => {
          const screenElement = remoteScreenShareRefs.current.get(participant.sid);
          if (screenElement) {
            attachTrackToElement(track, screenElement);
          }
        }, 100);
        
        toast.success(`${participant.identity} is sharing their screen`);
      } else {
        console.log(`📹 Camera video subscribed from ${participant.identity}`);
        tracks.video = track;
        
        // Attach to video element if available
        setTimeout(() => {
          const videoElement = participantVideosRef.current.get(participant.sid);
          if (videoElement) {
            attachTrackToElement(track, videoElement);
          }
        }, 100);
      }
    } else if (track.kind === Track.Kind.Audio) {
      console.log(`🎵 Audio subscribed from ${participant.identity}`);
      tracks.audio = track;
      
      // Create and attach audio element
      setTimeout(() => {
        let audioElement = participantAudiosRef.current.get(participant.sid);
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.autoplay = true;
          audioElement.volume = 1.0;
          audioElement.id = `audio-${participant.sid}`;
          participantAudiosRef.current.set(participant.sid, audioElement);
          document.body.appendChild(audioElement);
        }
        
        attachTrackToElement(track, audioElement);
      }, 100);
    }
    
    participantTracks.current.set(participant.sid, tracks);
  };

  // Handle participant track unsubscription
  const handleParticipantTrackUnsubscribed = (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
    console.log(`🔕 Participant track unsubscribed:`, {
      participant: participant.identity,
      trackKind: track.kind,
      trackSource: track.source
    });

    // Update participant tracks ref
    const tracks = participantTracks.current.get(participant.sid) || {};
    
    if (track.source === Track.Source.ScreenShare) {
      console.log(`🖥️❌ Screen share unsubscribed from ${participant.identity}`);
      delete tracks.screenShare;
      
      setRemoteScreenShares(prev => {
        const newMap = new Map(prev);
        newMap.delete(participant.sid);
        return newMap;
      });
      
      toast.info(`${participant.identity} stopped sharing their screen`);
    } else if (track.kind === Track.Kind.Video) {
      delete tracks.video;
    } else if (track.kind === Track.Kind.Audio) {
      delete tracks.audio;
    }
    
    participantTracks.current.set(participant.sid, tracks);
    track.detach();
  };

  // Enhanced participant connection handler (immediate tile creation like original spaces)
  const handleParticipantConnected = (participant: RemoteParticipant) => {
    // Skip processing if participant should not be processed
    if (!shouldProcessParticipant(participant)) {
      return;
    }

    console.log('👤 Participant connected:', participant.identity);
    
    // Add to connected participants ref
    connectedParticipants.current.set(participant.sid, participant);
    
    // Immediately add to participants state (create tile immediately)
    setParticipants(prev => new Map(prev.set(participant.sid, participant)));
    
    // Mark tile as created
    createdTiles.current.add(participant.sid);
    
    // Set up participant-level event listeners (like original spaces)
    participant.on(ParticipantEvent.TrackSubscribed, (track: RemoteTrack, publication: TrackPublication) => {
      handleParticipantTrackSubscribed(track, publication, participant);
    });
    
    participant.on(ParticipantEvent.TrackUnsubscribed, (track: RemoteTrack, publication: TrackPublication) => {
      handleParticipantTrackUnsubscribed(track, publication, participant);
    });
    
    // Process any existing tracks
    participant.trackPublications.forEach((publication) => {
      if (publication.track && publication.isSubscribed) {
        console.log(`📺 Processing existing track for ${participant.identity}:`, publication.source);
        handleParticipantTrackSubscribed(publication.track, publication, participant);
      }
    });
  };

  // Enhanced participant disconnection handler (immediate cleanup like original spaces)
  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('👤❌ Participant disconnected:', participant.identity);
    
    // Remove from all tracking refs
    connectedParticipants.current.delete(participant.sid);
    createdTiles.current.delete(participant.sid);
    participantTracks.current.delete(participant.sid);
    
    // Remove from state
    setParticipants(prev => {
      const newMap = new Map(prev);
      newMap.delete(participant.sid);
      return newMap;
    });
    
    // Clean up screen share data
    setRemoteScreenShares(prev => {
      const newMap = new Map(prev);
      newMap.delete(participant.sid);
      return newMap;
    });
    
    // Clean up DOM elements
    const videoEl = participantVideosRef.current.get(participant.sid);
    const audioEl = participantAudiosRef.current.get(participant.sid);
    
    if (videoEl) participantVideosRef.current.delete(participant.sid);
    if (audioEl) {
      if (document.body.contains(audioEl)) {
        document.body.removeChild(audioEl);
      }
      participantAudiosRef.current.delete(participant.sid);
    }
    remoteScreenShareRefs.current.delete(participant.sid);
  };

  // Enhanced LiveKit room connection with robust participant handling
  const connectToRoom = async (token: string, url: string, role?: string) => {
    try {
      console.log('🔗 Connecting to LiveKit room:', { role, roomName: 'space' });
      
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720 },
        },
      });

      // Register LOCAL participant event handlers BEFORE connecting
      newRoom.on('localTrackPublished', (publication: TrackPublication) => {
        handleLocalTrackPublished(publication, newRoom.localParticipant);
      });

      newRoom.on('localTrackUnpublished', (publication: TrackPublication) => {
        handleLocalTrackUnpublished(publication, newRoom.localParticipant);
      });

      // Set up participant connection/disconnection events (immediate handling like original spaces)
      newRoom.on('participantConnected', handleParticipantConnected);
      newRoom.on('participantDisconnected', handleParticipantDisconnected);

      newRoom.on('connectionStateChanged', (state: ConnectionState) => {
        console.log('🔗 Connection state changed:', state);
        setConnectionState(state);
      });

      newRoom.on('disconnected', () => {
        console.log('🔗❌ Disconnected from room');
        setRoom(null);
        setLocalParticipant(null);
        setParticipants(new Map());
        setRemoteScreenShares(new Map());
        setLocalScreenShare(null);
        
        // Clear all tracking refs
        connectedParticipants.current.clear();
        createdTiles.current.clear();
        participantTracks.current.clear();
      });
      
      // Connect to room
      await newRoom.connect(url, token);
      console.log('✅ Successfully connected to LiveKit room');
      
      setRoom(newRoom);
      setLocalParticipant(newRoom.localParticipant);

      // Process existing participants (immediate tile creation like original spaces)
      console.log(`🔍 Processing ${newRoom.remoteParticipants.size} existing participants...`);
      newRoom.remoteParticipants.forEach((participant) => {
        handleParticipantConnected(participant);
      });

      toast.success('Connected to space');
      return newRoom;
    } catch (error) {
      console.error('❌ Failed to connect to room:', error);
      toast.error('Failed to connect to space');
      throw error;
    }
  };

  const enableCameraAndMicrophone = async (room: Room, hasVideo: boolean, hasAudio: boolean) => {
    try {
      console.log('🎤📹 Enabling camera and microphone...', { hasVideo, hasAudio, isVideoEnabled, isAudioEnabled });
      
      console.log('🎤 Attempting to enable microphone...');
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log('✅ Microphone enabled successfully');
      } catch (audioError) {
        console.error('❌ Failed to enable microphone:', audioError);
        toast.error('Failed to enable microphone');
      }

      if (hasVideo && isVideoEnabled) {
        console.log('📹 Attempting to enable camera...');
        try {
          await room.localParticipant.setCameraEnabled(true);
          console.log('✅ Camera enabled successfully');
          
          const videoPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (videoPublication?.track && localVideoRef.current) {
            videoPublication.track.attach(localVideoRef.current);
            console.log('✅ Local video track attached to video element');
          }
        } catch (videoError) {
          console.error('❌ Failed to enable camera:', videoError);
          toast.error('Failed to enable camera');
        }
      }
    } catch (error) {
      console.error('❌ Error in enableCameraAndMicrophone:', error);
      toast.error('Failed to enable media devices');
    }
  };

  const toggleVideo = async () => {
    if (room && localParticipant) {
      const enabled = !isVideoEnabled;
      await localParticipant.setCameraEnabled(enabled);
      setIsVideoEnabled(enabled);
      console.log('📹 Video toggled:', enabled);
    }
  };

  const toggleAudio = async () => {
    if (room && localParticipant) {
      const enabled = !isAudioEnabled;
      await localParticipant.setMicrophoneEnabled(enabled);
      setIsAudioEnabled(enabled);
      console.log('🎤 Audio toggled:', enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!room || !localParticipant) {
      console.error('❌ Room or local participant not ready');
      toast.error('Room not ready. Please try again.');
      return;
    }

    if (connectionState !== ConnectionState.Connected) {
      console.error('❌ Room not connected:', connectionState);
      toast.error('Not connected to room. Please wait and try again.');
      return;
    }

    const isCurrentlySharing = !!localScreenShare;
    const enabled = !isCurrentlySharing;
    
    console.log(`🖥️ Toggling screen share to: ${enabled} (currently sharing: ${isCurrentlySharing}) for ${localParticipant.identity}`);
    
    try {
      await localParticipant.setScreenShareEnabled(enabled);
      console.log(`🖥️ Screen share ${enabled ? 'start' : 'stop'} request sent for ${localParticipant.identity}`);
    } catch (error) {
      console.error('❌ Failed to toggle screen share:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Screen sharing permission was denied. Please allow screen sharing and try again.');
      } else if (error.name === 'NotSupportedError') {
        toast.error('Screen sharing is not supported in your browser');
      } else {
        toast.error('Failed to toggle screen share: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const disconnect = () => {
    if (room) {
      room.disconnect();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
      
      // Clean up all audio elements
      participantAudiosRef.current.forEach(audioEl => {
        if (document.body.contains(audioEl)) {
          document.body.removeChild(audioEl);
        }
      });
      
      // Clear all refs
      participantAudiosRef.current.clear();
      participantVideosRef.current.clear();
      remoteScreenShareRefs.current.clear();
      connectedParticipants.current.clear();
      createdTiles.current.clear();
      participantTracks.current.clear();
    };
  }, [room]);

  return {
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
  };
};
