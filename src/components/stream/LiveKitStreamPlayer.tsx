import React, { useEffect, useState, useRef } from 'react';
import { Room, RemoteTrack, Track, ConnectionState } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, Wifi, WifiOff, Play, Pause, Volume2, VolumeX, Maximize, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface LiveKitStreamPlayerProps {
  roomName: string;
  title?: string;
  className?: string;
  showControls?: boolean;
}

interface ViewerTokenResponse {
  token: string;
  url: string;
  identity: string;
  name: string;
}

interface VideoControlsState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
  showControls: boolean;
  currentTime: number;
  duration: number;
}

// Audio attachment retry configuration
const AUDIO_RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 500,
  maxDelay: 3000,
  backoffFactor: 1.5
};

// Enhanced mobile detection utilities
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

// Enhanced mobile browser detection
const isMobileBrowser = () => {
  const userAgent = navigator.userAgent;
  return {
    isMobile: isMobile(),
    isIOS: isIOS(),
    isSafari: isSafari(),
    isChromeMobile: /Chrome/.test(userAgent) && /Mobile/.test(userAgent),
    isFirefoxMobile: /Firefox/.test(userAgent) && /Mobile/.test(userAgent),
    requiresInteraction: isMobile() || isIOS() || isSafari()
  };
};

const LiveKitStreamPlayer: React.FC<LiveKitStreamPlayerProps> = ({ 
  roomName, 
  title,
  className = "w-full h-full",
  showControls = false
}) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [videoTracks, setVideoTracks] = useState<RemoteTrack[]>([]);
  const [audioTracks, setAudioTracks] = useState<RemoteTrack[]>([]);
  const [audioElements, setAudioElements] = useState<HTMLAudioElement[]>([]);
  const [isInitialConnection, setIsInitialConnection] = useState(true);
  const [hasHadTracks, setHasHadTracks] = useState(false);
  const [videoTrackState, setVideoTrackState] = useState<{
    isAttached: boolean;
    isPlaying: boolean;
    dimensions: { width: number; height: number } | null;
    error: string | null;
  }>({
    isAttached: false,
    isPlaying: false,
    dimensions: null,
    error: null
  });

  // Enhanced audio state management with better mobile detection
  const [audioState, setAudioState] = useState<{
    requiresInteraction: boolean;
    contextInitialized: boolean;
    attachmentRetries: Map<string, number>;
    failedAttachments: Set<string>;
    userHasInteracted: boolean;
    audioBlocked: boolean;
  }>({
    requiresInteraction: isMobileBrowser().requiresInteraction,
    contextInitialized: false,
    attachmentRetries: new Map(),
    failedAttachments: new Set(),
    userHasInteracted: false,
    audioBlocked: false
  });

  // Video controls state
  const [videoControls, setVideoControls] = useState<VideoControlsState>({
    isPlaying: false,
    isMuted: false,
    volume: 1,
    isFullscreen: false,
    showControls: true,
    currentTime: 0,
    duration: 0
  });

  const [controlsVisible, setControlsVisible] = useState(true);
  
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const maxRetries = 3;
  const browserInfo = isMobileBrowser();

  // Auto-hide controls after inactivity
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setControlsVisible(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  };

  // Enhanced audio context initialization with better mobile support
  const initAudioContext = async (retryCount = 0): Promise<boolean> => {
    if (!browserInfo.requiresInteraction && audioState.contextInitialized) {
      return true;
    }

    try {
      console.log('🔊 Initializing audio context for mobile browser:', browserInfo, 'attempt:', retryCount + 1);
      
      if (!audioContextRef.current) {
        // Enhanced audio context creation with better browser compatibility
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          console.error('🔊❌ AudioContext not supported in this browser');
          setAudioState(prev => ({ ...prev, audioBlocked: true }));
          return false;
        }
        
        audioContextRef.current = new AudioContextClass();
      }
      
      // Resume audio context if suspended (required for mobile browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🔊✅ Audio context resumed successfully on mobile');
      }
      
      // Enhanced audio context validation
      if (audioContextRef.current.state === 'running') {
        setAudioState(prev => ({ 
          ...prev, 
          contextInitialized: true,
          audioBlocked: false
        }));
        console.log('🔊✅ Audio context initialized and running on mobile');
        return true;
      } else {
        throw new Error(`Audio context state: ${audioContextRef.current.state}`);
      }
      
    } catch (error) {
      console.error('🔊❌ Audio context initialization failed:', error);
      
      // Enhanced retry logic for mobile browsers
      if (retryCount < 3) {
        console.log('🔊🔄 Retrying audio context initialization for mobile...');
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return initAudioContext(retryCount + 1);
      }
      
      setAudioState(prev => ({ ...prev, audioBlocked: true }));
      return false;
    }
  };

  // Enhanced audio track attachment with mobile-specific optimizations
  const attachAudioTrack = async (track: RemoteTrack, retryAttempt = 0): Promise<HTMLAudioElement | null> => {
    const trackId = track.sid;
    
    console.log('🔊 Attempting mobile audio track attachment:', {
      trackId,
      retryAttempt,
      browserInfo,
      contextInitialized: audioState.contextInitialized,
      userHasInteracted: audioState.userHasInteracted
    });

    // Enhanced mobile browser checks
    if (audioState.failedAttachments.has(trackId)) {
      console.log('🔊⚠️ Skipping audio track - marked as failed:', trackId);
      return null;
    }

    // Check if user interaction is required for mobile browsers
    if (browserInfo.requiresInteraction && !audioState.userHasInteracted) {
      console.log('🔊📱 Mobile browser detected - user interaction required');
      setAudioState(prev => ({ ...prev, requiresInteraction: true }));
      return null;
    }

    try {
      // Initialize audio context for mobile browsers
      if (browserInfo.requiresInteraction && !audioState.contextInitialized) {
        const contextInitialized = await initAudioContext();
        if (!contextInitialized) {
          console.warn('🔊⚠️ Audio context failed to initialize on mobile, marking as blocked');
          setAudioState(prev => ({ ...prev, requiresInteraction: true, audioBlocked: true }));
          return null;
        }
      }

      // Check if audio element already exists for this track
      let audioElement = audioElementsMapRef.current.get(trackId);
      
      if (!audioElement) {
        console.log('🔊 Creating new audio element for mobile track:', trackId);
        
        // Enhanced mobile audio element creation
        try {
          audioElement = track.attach() as HTMLAudioElement;
          console.log('🔊✅ Mobile audio: LiveKit attach successful');
        } catch (attachError) {
          console.log('🔊⚠️ Mobile audio: LiveKit attach failed, trying manual creation');
          
          // Mobile-optimized manual audio element creation
          audioElement = document.createElement('audio');
          const mediaStream = new MediaStream([track.mediaStreamTrack]);
          audioElement.srcObject = mediaStream;
          console.log('🔊✅ Mobile audio: Manual creation successful');
        }
      }

      if (audioElement instanceof HTMLAudioElement) {
        // Enhanced mobile audio element configuration
        audioElement.autoplay = true;
        audioElement.volume = videoControls.volume;
        audioElement.muted = videoControls.isMuted;
        
        // Mobile-specific audio settings
        if (browserInfo.isIOS) {
          audioElement.setAttribute('webkit-playsinline', '');
          audioElement.setAttribute('playsinline', '');
        }
        
        // Add to tracking maps
        audioElementsMapRef.current.set(trackId, audioElement);
        setAudioElements(prev => {
          const filtered = prev.filter(el => el !== audioElement);
          return [...filtered, audioElement!];
        });
        
        // Append to DOM if not already present
        if (!document.body.contains(audioElement)) {
          document.body.appendChild(audioElement);
          console.log('🔊 Mobile audio element appended to DOM');
        }
        
        // Enhanced mobile audio playback with multiple strategies
        const playAudio = async () => {
          try {
            // Strategy 1: Direct play for mobile
            await audioElement!.play();
            console.log('🔊✅ Mobile audio playback started successfully');
            setAudioState(prev => ({ 
              ...prev, 
              requiresInteraction: false,
              audioBlocked: false
            }));
            return true;
          } catch (playError: any) {
            console.log('🔊⚠️ Mobile audio direct play failed:', playError.name);
            
            if (playError.name === 'NotAllowedError') {
              // Strategy 2: Mobile-specific user interaction handling
              console.log('🔊📱 Mobile audio blocked - user interaction required');
              setAudioState(prev => ({ 
                ...prev, 
                requiresInteraction: true,
                audioBlocked: true
              }));
              
              // Strategy 3: Mobile volume workaround
              if (browserInfo.isMobile) {
                audioElement!.volume = 0.01;
                try {
                  await audioElement!.play();
                  audioElement!.volume = videoControls.volume;
                  console.log('🔊✅ Mobile audio: Volume workaround successful');
                  setAudioState(prev => ({ 
                    ...prev, 
                    requiresInteraction: false,
                    audioBlocked: false
                  }));
                  return true;
                } catch (volumeError) {
                  console.log('🔊⚠️ Mobile audio: Volume workaround failed');
                }
              }
              return false;
            } else {
              throw playError;
            }
          }
        };

        const playSuccess = await playAudio();
        
        if (!playSuccess && retryAttempt < AUDIO_RETRY_CONFIG.maxRetries) {
          console.log(`🔊🔄 Retrying mobile audio attachment (${retryAttempt + 1}/${AUDIO_RETRY_CONFIG.maxRetries})`);
          
          const delay = Math.min(
            AUDIO_RETRY_CONFIG.baseDelay * Math.pow(AUDIO_RETRY_CONFIG.backoffFactor, retryAttempt),
            AUDIO_RETRY_CONFIG.maxDelay
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return attachAudioTrack(track, retryAttempt + 1);
        }
        
        console.log('🔊✅ Mobile audio track attachment completed:', trackId);
        
        // Update retry tracking
        setAudioState(prev => ({
          ...prev,
          attachmentRetries: new Map(prev.attachmentRetries.set(trackId, retryAttempt))
        }));
        
        return audioElement;
      }
    } catch (error) {
      console.error('🔊❌ Mobile audio track attachment failed:', error);
      
      // Mark track as failed if too many retries
      if (retryAttempt >= AUDIO_RETRY_CONFIG.maxRetries) {
        console.error('🔊❌ Mobile audio track marked as failed after max retries:', trackId);
        setAudioState(prev => ({
          ...prev,
          failedAttachments: new Set(prev.failedAttachments.add(trackId)),
          audioBlocked: true
        }));
      } else if (retryAttempt < AUDIO_RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          AUDIO_RETRY_CONFIG.baseDelay * Math.pow(AUDIO_RETRY_CONFIG.backoffFactor, retryAttempt),
          AUDIO_RETRY_CONFIG.maxDelay
        );
        
        console.log(`🔊🔄 Retrying mobile audio attachment after error (${retryAttempt + 1}/${AUDIO_RETRY_CONFIG.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attachAudioTrack(track, retryAttempt + 1);
      }
    }
    
    return null;
  };

  // Enhanced user interaction handler for mobile browsers
  const handleUserInteraction = async () => {
    console.log('🔊📱 Mobile user interaction detected, enabling audio');
    
    // Mark that user has interacted
    setAudioState(prev => ({ ...prev, userHasInteracted: true }));
    
    // Initialize audio context for mobile browsers
    if (browserInfo.requiresInteraction) {
      const contextInitialized = await initAudioContext();
      if (!contextInitialized) {
        console.warn('🔊⚠️ Failed to initialize audio context after user interaction');
        return;
      }
    }
    
    // Enable all audio elements for mobile
    const enablePromises = audioElements.map(async (audioElement) => {
      try {
        audioElement.muted = videoControls.isMuted;
        audioElement.volume = videoControls.volume;
        
        if (!videoControls.isMuted) {
          await audioElement.play();
          console.log('🔊📱 Mobile audio element enabled after user interaction');
        }
      } catch (error) {
        console.warn('🔊⚠️ Could not enable mobile audio element:', error);
      }
    });
    
    // Try to attach any pending audio tracks
    if (audioTracks.length > 0 && audioElements.length === 0) {
      console.log('🔊📱 Attempting to attach pending audio tracks after user interaction');
      for (const track of audioTracks) {
        await attachAudioTrack(track);
      }
    }
    
    await Promise.allSettled(enablePromises);
    setAudioState(prev => ({ 
      ...prev, 
      requiresInteraction: false,
      audioBlocked: false
    }));
  };

  // Remove audio track and clean up
  const detachAudioTrack = (track: RemoteTrack) => {
    const trackId = track.sid;
    console.log('🔊🗑️ Detaching audio track:', trackId);
    
    // Remove from tracking map
    const audioElement = audioElementsMapRef.current.get(trackId);
    if (audioElement) {
      // Remove from DOM
      if (document.body.contains(audioElement)) {
        document.body.removeChild(audioElement);
      }
      
      // Clean up element
      audioElement.srcObject = null;
      audioElement.src = '';
      
      // Remove from maps
      audioElementsMapRef.current.delete(trackId);
    }
    
    // Update state
    setAudioElements(prev => prev.filter(element => {
      if (element.srcObject instanceof MediaStream) {
        const trackIdToCheck = track.mediaStreamTrack.id;
        const streamTracks = element.srcObject.getTracks();
        return !streamTracks.some(t => t.id === trackIdToCheck);
      }
      return true;
    }));
    
    // Clean up retry tracking
    setAudioState(prev => ({
      ...prev,
      attachmentRetries: new Map([...prev.attachmentRetries].filter(([id]) => id !== trackId)),
      failedAttachments: new Set([...prev.failedAttachments].filter(id => id !== trackId))
    }));
    
    track.detach();
  };

  // Enhanced video track attachment
  const attachVideoTrack = async (track: RemoteTrack, retryCount = 0): Promise<boolean> => {
    if (!videoRef.current) {
      console.error('🎥❌ Video element not available for attachment');
      setVideoTrackState(prev => ({ ...prev, error: 'Video element not ready' }));
      return false;
    }

    const videoElement = videoRef.current;
    console.log('🎥 Attempting video track attachment:', {
      trackSid: track.sid,
      trackKind: track.kind,
      trackSource: track.source,
      trackMuted: track.isMuted,
      browserInfo,
      retryAttempt: retryCount
    });

    try {
      track.attach(videoElement);
      
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true; // Video should always be muted for LiveKit
      videoElement.controls = false;
      
      // Mobile-specific video settings
      if (browserInfo.isMobile) {
        videoElement.setAttribute('webkit-playsinline', '');
        videoElement.setAttribute('playsinline', '');
      }
      
      console.log('🎥✅ Video track attached successfully');
      
      // Set up video element event listeners for debugging and controls
      const handleLoadedData = () => {
        console.log('🎥📺 Video loadeddata event fired:', {
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          browserInfo
        });
        setVideoTrackState(prev => ({
          ...prev,
          dimensions: { width: videoElement.videoWidth, height: videoElement.videoHeight },
          error: null
        }));
        setVideoControls(prev => ({ ...prev, duration: videoElement.duration || 0 }));
      };

      const handleCanPlay = () => {
        console.log('🎥▶️ Video canplay event fired');
        setVideoTrackState(prev => ({ ...prev, isAttached: true, error: null }));
      };

      const handlePlaying = () => {
        console.log('🎥🎬 Video playing event fired');
        setVideoTrackState(prev => ({ ...prev, isPlaying: true, error: null }));
        setVideoControls(prev => ({ ...prev, isPlaying: true }));
      };

      const handlePause = () => {
        console.log('🎥⏸️ Video pause event fired');
        setVideoControls(prev => ({ ...prev, isPlaying: false }));
      };

      const handleTimeUpdate = () => {
        setVideoControls(prev => ({ ...prev, currentTime: videoElement.currentTime }));
      };

      const handleError = (e: Event) => {
        const error = (e.target as HTMLVideoElement).error;
        console.error('🎥❌ Video element error:', error);
        setVideoTrackState(prev => ({ 
          ...prev, 
          error: error ? `Video error: ${error.message}` : 'Unknown video error' 
        }));
      };

      // Add event listeners
      videoElement.addEventListener('loadeddata', handleLoadedData);
      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('playing', handlePlaying);
      videoElement.addEventListener('pause', handlePause);
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      videoElement.addEventListener('error', handleError);

      // Store cleanup function
      const cleanup = () => {
        videoElement.removeEventListener('loadeddata', handleLoadedData);
        videoElement.removeEventListener('canplay', handleCanPlay);
        videoElement.removeEventListener('playing', handlePlaying);
        videoElement.removeEventListener('pause', handlePause);
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        videoElement.removeEventListener('error', handleError);
      };

      // Cleanup on track change
      track.on('ended', cleanup);
      
      // Try to play the video
      try {
        const playPromise = videoElement.play();
        if (playPromise) {
          playPromise.catch(playError => {
            console.warn('🎥⚠️ Video play promise rejected (normal on mobile):', playError);
          });
        }
      } catch (playError) {
        console.warn('🎥⚠️ Video play error (normal on mobile):', playError);
      }

      return true;

    } catch (attachError) {
      console.error('🎥❌ Video track attachment failed:', attachError);
      
      // Method 2: Fallback using MediaStream and srcObject
      if (retryCount < 2) {
        console.log('🎥 Method 2: Trying MediaStream + srcObject fallback');
        try {
          // Create a new MediaStream with the track
          const mediaStream = new MediaStream([track.mediaStreamTrack]);
          videoElement.srcObject = mediaStream;
          
          console.log('🎥✅ Video track attached successfully using srcObject fallback');
          setVideoTrackState(prev => ({ ...prev, isAttached: true, error: null }));
          return true;
          
        } catch (srcObjectError) {
          console.error('🎥❌ Method 2 failed - srcObject error:', srcObjectError);
          
          // Method 3: Retry with delay
          if (retryCount < 1) {
            console.log('🎥 Method 3: Retrying attachment after delay');
            setTimeout(() => {
              attachVideoTrack(track, retryCount + 1);
            }, 1000);
            return false;
          }
        }
      }

      setVideoTrackState(prev => ({ 
        ...prev, 
        error: `Failed to attach video track after ${retryCount + 1} attempts` 
      }));
      return false;
    }
  };

  // Mobile-enhanced fullscreen function
  const toggleFullscreen = async () => {
    if (!containerRef.current || !videoRef.current) return;
    
    console.log('📱🔍 Attempting fullscreen toggle, mobile:', browserInfo.isMobile, 'iOS:', browserInfo.isIOS);
    
    // Handle user interaction for audio
    await handleUserInteraction();
    
    try {
      if (!document.fullscreenElement) {
        // Try different fullscreen methods based on device/browser
        if (browserInfo.isMobile && browserInfo.isIOS && browserInfo.isSafari) {
          // iOS Safari - use video element's webkitEnterFullscreen
          const videoElement = videoRef.current;
          if ((videoElement as any).webkitEnterFullscreen) {
            console.log('📱🍎 Using iOS Safari video fullscreen');
            (videoElement as any).webkitEnterFullscreen();
            setVideoControls(prev => ({ ...prev, isFullscreen: true }));
            return;
          }
        }
        
        // Standard fullscreen API
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).mozRequestFullScreen) {
          await (containerRef.current as any).mozRequestFullScreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        } else {
          console.warn('📱❌ Fullscreen not supported on this device');
          return;
        }
        
        setVideoControls(prev => ({ ...prev, isFullscreen: true }));
        console.log('📱✅ Entered fullscreen mode');
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        
        setVideoControls(prev => ({ ...prev, isFullscreen: false }));
        console.log('📱✅ Exited fullscreen mode');
      }
    } catch (error) {
      console.error('📱❌ Fullscreen toggle failed:', error);
    }
    
    resetControlsTimeout();
  };

  // Enhanced mute function with mobile support
  const toggleMute = async () => {
    console.log('🔊 Toggling mute, current state:', videoControls.isMuted);
    
    // Handle user interaction for mobile audio
    await handleUserInteraction();
    
    const newMutedState = !videoControls.isMuted;
    
    // Control all attached audio elements
    audioElements.forEach(audioElement => {
      audioElement.muted = newMutedState;
      console.log('🔊 Set audio element muted to:', newMutedState);
    });
    
    // Control LiveKit audio tracks directly
    audioTracks.forEach(track => {
      try {
        if (track.mediaStreamTrack) {
          track.mediaStreamTrack.enabled = !newMutedState;
          console.log('🔊 Set audio track enabled to:', !newMutedState);
        }
      } catch (error) {
        console.error('🔊❌ Error controlling audio track:', error);
      }
    });
    
    setVideoControls(prev => ({ ...prev, isMuted: newMutedState }));
    resetControlsTimeout();
  };

  // Video control functions - for live streams, pause should mute audio instead
  const togglePlayPause = async () => {
    console.log('🎮 Toggle play/pause - for live streams, this toggles mute');
    
    // Handle user interaction for mobile audio
    await handleUserInteraction();
    
    toggleMute(); // For live streams, "pause" should mute audio
    resetControlsTimeout();
  };

  // Enhanced volume function
  const handleVolumeChange = (newVolume: number[]) => {
    const volume = newVolume[0];
    console.log('🔊 Changing volume to:', volume);
    
    // Control all attached audio elements
    audioElements.forEach(audioElement => {
      audioElement.volume = volume;
      audioElement.muted = volume === 0;
      console.log('🔊 Set audio element volume to:', volume);
    });
    
    setVideoControls(prev => ({ 
      ...prev, 
      volume, 
      isMuted: volume === 0 
    }));
    resetControlsTimeout();
  };

  // Manual retry function for debugging
  const manualRetryVideoAttachment = () => {
    if (videoTracks.length > 0 && videoRef.current) {
      console.log('🎥🔄 Manual retry of video attachment requested');
      setVideoTrackState(prev => ({ ...prev, error: null, isAttached: false, isPlaying: false }));
      attachVideoTrack(videoTracks[0]);
    }
  };

  // Manual retry function for audio
  const manualRetryAudioAttachment = async () => {
    if (audioTracks.length > 0) {
      console.log('🔊🔄 Manual retry of audio attachment requested');
      
      // Clear failed attachments to allow retry
      setAudioState(prev => ({
        ...prev,
        failedAttachments: new Set(),
        attachmentRetries: new Map(),
        userHasInteracted: true // Mark as interacted to bypass mobile restrictions
      }));
      
      // Initialize audio context first
      await initAudioContext();
      
      // Retry all audio tracks
      for (const track of audioTracks) {
        await attachAudioTrack(track);
      }
    }
  };

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setVideoControls(prev => ({ 
        ...prev, 
        isFullscreen: !!document.fullscreenElement 
      }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Apply volume/mute state to new audio elements
  useEffect(() => {
    audioElements.forEach(audioElement => {
      audioElement.volume = videoControls.volume;
      audioElement.muted = videoControls.isMuted;
    });
  }, [videoControls.volume, videoControls.isMuted, audioElements]);

  // Token generation useEffect
  useEffect(() => {
    const generateViewerToken = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Generating viewer token for room');
        
        const { data, error } = await supabase.functions.invoke('generate-livekit-viewer-token', {
          body: { roomName }
        });

        if (error) {
          throw new Error(error.message || 'Failed to generate viewer token');
        }

        const tokenData: ViewerTokenResponse = data;
        if (import.meta.env.DEV) {
          console.log('Viewer token generated successfully');
        }
        
        setToken(tokenData.token);
        setServerUrl(tokenData.url);
        
      } catch (error: any) {
        console.error('Error generating viewer token:', error);
        
        // Only show error after max retries to avoid premature error display
        if (retryCount >= maxRetries) {
          setError(error.message || 'Failed to connect to stream');
          setLoading(false);
        } else {
          console.log(`Retrying token generation (${retryCount + 1}/${maxRetries})...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000 * (retryCount + 1));
        }
      }
    };

    if (roomName) {
      generateViewerToken();
    }
  }, [roomName, retryCount]);

  // Room connection useEffect
  useEffect(() => {
    if (!token || !serverUrl) return;

    const connectToRoom = async () => {
      try {
        console.log('Creating room for RTMP ingress viewing...');
        const room = new Room();
        roomRef.current = room;

        // Set up event handlers for ingress tracks
        room.on('trackSubscribed', (track: RemoteTrack) => {
          console.log('Track subscribed:', {
            kind: track.kind,
            source: track.source,
            sid: track.sid,
            muted: track.isMuted
          });

          if (track.kind === Track.Kind.Video) {
            setVideoTracks(prev => [...prev, track]);
            setHasHadTracks(true); // Mark that we've had video tracks
            
            // Enhanced video track attachment with debugging
            setTimeout(() => {
              console.log('🎥 Starting video track attachment process...');
              attachVideoTrack(track);
            }, 500); // Give video element time to be ready
            
          } else if (track.kind === Track.Kind.Audio) {
            setAudioTracks(prev => [...prev, track]);
            
            // Enhanced audio track attachment with retry logic
            setTimeout(async () => {
              console.log('🔊 Starting audio track attachment process...');
              const audioElement = await attachAudioTrack(track);
              if (audioElement) {
                console.log('🔊✅ Audio track attached and ready for control');
              } else {
                console.log('🔊⚠️ Audio track attachment deferred - user interaction required');
              }
            }, 200); // Shorter delay for audio
          }
        });

        room.on('trackUnsubscribed', (track: RemoteTrack) => {
          console.log('Track unsubscribed:', track.sid);
          
          if (track.kind === Track.Kind.Video) {
            setVideoTracks(prev => prev.filter(t => t.sid !== track.sid));
            setVideoTrackState({
              isAttached: false,
              isPlaying: false,
              dimensions: null,
              error: null
            });
            track.detach();
          } else if (track.kind === Track.Kind.Audio) {
            setAudioTracks(prev => prev.filter(t => t.sid !== track.sid));
            detachAudioTrack(track);
          }
        });

        room.on('connected', () => {
          console.log('Connected to LiveKit room for ingress viewing');
          setConnectionState(ConnectionState.Connected);
          setError('');
          setLoading(false);
          setIsInitialConnection(false);
        });

        room.on('disconnected', () => {
          console.log('Disconnected from LiveKit room');
          setConnectionState(ConnectionState.Disconnected);
          
          // Only show disconnection error if we were previously connected successfully
          if (!isInitialConnection) {
            setError('Lost connection to stream');
          }
        });

        room.on('connectionStateChanged', (state) => {
          console.log('Connection state changed:', state);
          setConnectionState(state);
          
          // Only handle connection failures after initial connection attempt
          if (state === ConnectionState.Disconnected && !isInitialConnection) {
            setError('Connection lost');
          }
        });

        // Connect to room for ingress viewing
        setConnectionState(ConnectionState.Connecting);
        await room.connect(serverUrl, token);
        
      } catch (error: any) {
        console.error('Error connecting to LiveKit room:', error);
        
        // Only show connection errors after retries during initial connection
        if (!isInitialConnection || retryCount >= maxRetries) {
          setError(error.message || 'Failed to connect to room');
          setConnectionState(ConnectionState.Disconnected);
          setLoading(false);
        }
      }
    };

    connectToRoom();

    // Cleanup on unmount
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      
      // Clean up all audio elements
      audioElements.forEach(audioElement => {
        if (audioElement.parentNode) {
          audioElement.parentNode.removeChild(audioElement);
        }
        audioElement.srcObject = null;
      });
      
      // Clear audio element map
      audioElementsMapRef.current.clear();
      
      setVideoTracks([]);
      setAudioTracks([]);
      setAudioElements([]);
      setVideoTrackState({
        isAttached: false,
        isPlaying: false,
        dimensions: null,
        error: null
      });
      
      // Reset audio state
      setAudioState({
        requiresInteraction: browserInfo.requiresInteraction,
        contextInitialized: false,
        attachmentRetries: new Map(),
        failedAttachments: new Set(),
        userHasInteracted: false,
        audioBlocked: false
      });
    };
  }, [token, serverUrl]);

  const handleRetry = () => {
    setRetryCount(0);
    setError('');
    setLoading(true);
    setIsInitialConnection(true);
  };

  // Show loading state during initial connection or while retrying
  if (loading || (isInitialConnection && !error)) {
    return (
      <div className={`${className} flex items-center justify-center bg-black rounded-lg`}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-white/70">Connecting to stream...</p>
          {retryCount > 0 && retryCount < maxRetries && (
            <p className="text-white/50 text-sm mt-2">Retry {retryCount}/{maxRetries}</p>
          )}
        </div>
      </div>
    );
  }

  // Only show error after all retries or if not during initial connection
  if (error && (!isInitialConnection || retryCount >= maxRetries)) {
    return (
      <div className={`${className} flex items-center justify-center bg-black rounded-lg border border-red-500/30`}>
        <div className="text-center p-6">
          <div className="flex items-center justify-center mb-4">
            <WifiOff className="h-12 w-12 text-red-400" />
          </div>
          <p className="text-red-400 mb-2">Connection Failed</p>
          <p className="text-white/70 text-sm mb-4">{error}</p>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className={`${className} flex items-center justify-center bg-black rounded-lg`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-primary rounded-full animate-pulse"></div>
          </div>
          <p className="text-white/70">Waiting for stream to start...</p>
          {title && <p className="text-white/50 text-sm mt-2">{title}</p>}
        </div>
      </div>
    );
  }

  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black rounded-lg">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-white/70">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  if (connectionState === ConnectionState.Disconnected && !isInitialConnection) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black rounded-lg border border-red-500/30">
        <div className="text-center">
          <WifiOff className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-red-400 mb-2">Disconnected</p>
          <p className="text-white/70 text-sm">Lost connection to stream</p>
        </div>
      </div>
    );
  }

  if (videoTracks.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black rounded-lg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
            {hasHadTracks ? (
              <StopCircle className="w-8 h-8 text-orange-400 animate-pulse" />
            ) : (
              <Wifi className="w-8 h-8 text-primary animate-pulse" />
            )}
          </div>
          <p className="text-white font-medium mb-2">
            {hasHadTracks ? 'Stream Paused' : 'Connected to Room'}
          </p>
          <p className="text-white/70 text-sm">
            {hasHadTracks 
              ? 'The host has stopped the stream. Please wait for them to restart or end.'
              : 'Waiting for RTMP stream to start...'
            }
          </p>
          <p className="text-white/50 text-xs mt-2">
            Connection: {connectionState} | Video: {videoTracks.length} | Audio: {audioTracks.length}
          </p>
          {showControls && (
            <div className="mt-4 flex items-center justify-center gap-2 text-white/60">
              <span className="text-sm">
                {hasHadTracks ? 'Stream temporarily stopped' : 'Ready to receive RTMP ingress'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-black rounded-lg relative overflow-hidden group"
      onMouseEnter={() => !browserInfo.isMobile && setControlsVisible(true)}
      onMouseMove={() => !browserInfo.isMobile && resetControlsTimeout()}
      onMouseLeave={() => {
        if (!browserInfo.isMobile && controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 1000);
        }
      }}
      onTouchStart={() => browserInfo.isMobile && resetControlsTimeout()}
    >
      {/* Video element for RTMP ingress playback */}
      <video 
        ref={videoRef}
        className="w-full h-full object-cover rounded-lg"
        autoPlay
        playsInline
        muted
        onClick={togglePlayPause}
        onTouchEnd={(e) => {
          e.preventDefault();
          if (browserInfo.isMobile) {
            togglePlayPause();
          }
        }}
      />
      
      {/* Video Controls Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Center Play/Pause Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            size="icon"
            variant="ghost"
            onClick={togglePlayPause}
            className={`${browserInfo.isMobile ? 'w-20 h-20' : 'w-16 h-16'} bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-200 hover:scale-110`}
          >
            {videoControls.isPlaying ? (
              <Pause className={`${browserInfo.isMobile ? 'h-10 w-10' : 'h-8 w-8'}`} />
            ) : (
              <Play className={`${browserInfo.isMobile ? 'h-10 w-10' : 'h-8 w-8'}`} />
            )}
          </Button>
        </div>

        {/* Enhanced mobile-friendly audio enable prompt */}
        {(audioState.requiresInteraction || audioState.audioBlocked) && audioTracks.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center p-6 max-w-sm mx-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Volume2 className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Enable Audio</h3>
              <p className="text-white/70 text-sm mb-6">
                {browserInfo.isMobile 
                  ? "Tap the button below to enable audio for this stream. This is required by your mobile browser."
                  : "Click the button below to enable audio for this stream."
                }
              </p>
              <Button
                onClick={handleUserInteraction}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full text-base font-medium transition-all duration-200 hover:scale-105"
              >
                <Volume2 className="h-5 w-5 mr-2" />
                Enable Audio
              </Button>
              <p className="text-white/50 text-xs mt-3">
                Audio will start automatically after enabling
              </p>
            </div>
          </div>
        )}

        {/* Bottom Controls Bar */}
        <div className={`absolute bottom-0 left-0 right-0 ${browserInfo.isMobile ? 'p-2' : 'p-4'}`}>
          <div className={`flex items-center ${browserInfo.isMobile ? 'gap-2' : 'gap-3'} bg-black/50 rounded-lg ${browserInfo.isMobile ? 'px-3 py-2' : 'px-4 py-2'} backdrop-blur-sm`}>
            {/* Play/Pause */}
            <Button
              size="sm"
              variant="ghost"
              onClick={togglePlayPause}
              className={`text-white hover:bg-white/20 ${browserInfo.isMobile ? 'p-3' : 'p-2'}`}
            >
              {videoControls.isPlaying ? (
                <Pause className={`${browserInfo.isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              ) : (
                <Play className={`${browserInfo.isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              )}
            </Button>

            {/* Mute/Unmute - Enhanced mobile styling */}
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className={`text-white hover:bg-white/20 ${browserInfo.isMobile ? 'p-3' : 'p-2'} ${
                (audioState.requiresInteraction || audioState.audioBlocked) ? 'ring-2 ring-blue-400/50 bg-blue-500/20' : ''
              }`}
            >
              {videoControls.isMuted || audioState.requiresInteraction || audioState.audioBlocked ? (
                <VolumeX className={`${browserInfo.isMobile ? 'h-5 w-5' : 'h-4 w-4'} ${
                  (audioState.requiresInteraction || audioState.audioBlocked) ? 'text-blue-400' : ''
                }`} />
              ) : (
                <Volume2 className={`${browserInfo.isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              )}
            </Button>

            {/* Volume Controls - Hide on mobile to save space */}
            {!browserInfo.isMobile && (
              <div className="flex items-center gap-2">
                <div className="w-20">
                  <Slider
                    value={[videoControls.isMuted ? 0 : videoControls.volume]}
                    onValueChange={handleVolumeChange}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Enhanced audio status indicator */}
            {!browserInfo.isMobile && audioTracks.length > 0 && (
              <div className={`flex items-center gap-1 text-xs ${
                audioElements.length > 0 && !audioState.requiresInteraction && !audioState.audioBlocked
                  ? 'text-green-400' 
                  : (audioState.requiresInteraction || audioState.audioBlocked)
                    ? 'text-blue-400'
                    : 'text-red-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  audioElements.length > 0 && !audioState.requiresInteraction && !audioState.audioBlocked
                    ? 'bg-green-400' 
                    : (audioState.requiresInteraction || audioState.audioBlocked)
                      ? 'bg-blue-400 animate-pulse'
                      : 'bg-red-400'
                }`}></div>
                <span>
                  {audioState.requiresInteraction || audioState.audioBlocked
                    ? 'Audio Blocked'
                    : `${audioElements.length}/${audioTracks.length} Audio`
                  }
                </span>
              </div>
            )}

            {/* Live indicator */}
            <div className={`flex items-center ${browserInfo.isMobile ? 'gap-1' : 'gap-2'} bg-red-500/20 border border-red-500/50 rounded ${browserInfo.isMobile ? 'px-2 py-1' : 'px-2 py-1'}`}>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className={`text-white font-medium ${browserInfo.isMobile ? 'text-xs' : 'text-xs'}`}>LIVE</span>
            </div>

            {/* Fullscreen */}
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleFullscreen}
              className={`text-white hover:bg-white/20 ${browserInfo.isMobile ? 'p-3' : 'p-2'}`}
            >
              <Maximize className={`${browserInfo.isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </Button>
          </div>
        </div>

        {/* Enhanced debug information */}
        {showControls && !browserInfo.isMobile && (
          <>
            <div className="absolute top-4 right-4 bg-black/70 rounded-lg px-3 py-2 text-xs text-white/70 space-y-1">
              <div>Video Attached: {videoTrackState.isAttached ? '✅' : '❌'}</div>
              <div>Video Playing: {videoTrackState.isPlaying ? '✅' : '❌'}</div>
              <div>Audio Tracks: {audioTracks.length}</div>
              <div>Audio Elements: {audioElements.length}</div>
              <div>Audio Context: {audioState.contextInitialized ? '✅' : '❌'}</div>
              <div>User Interacted: {audioState.userHasInteracted ? '✅' : '❌'}</div>
              <div>Audio Blocked: {audioState.audioBlocked ? '✅' : '❌'}</div>
              <div>Requires Interaction: {audioState.requiresInteraction ? '✅' : '❌'}</div>
              <div>Failed Audio: {audioState.failedAttachments.size}</div>
              <div>Mobile: {browserInfo.isMobile ? '✅' : '❌'}</div>
              <div>iOS: {browserInfo.isIOS ? '✅' : '❌'}</div>
              <div>Safari: {browserInfo.isSafari ? '✅' : '❌'}</div>
              <div>Volume: {Math.round(videoControls.volume * 100)}%</div>
              <div>Muted: {videoControls.isMuted ? '✅' : '❌'}</div>
              {videoTrackState.dimensions && (
                <div>Size: {videoTrackState.dimensions.width}x{videoTrackState.dimensions.height}</div>
              )}
              {videoTrackState.error && (
                <div className="text-red-400">Video Error: {videoTrackState.error}</div>
              )}
            </div>

            {/* Manual retry buttons */}
            <div className="absolute top-4 left-4 space-y-2">
              {videoTrackState.error && (
                <Button
                  size="sm"
                  onClick={manualRetryVideoAttachment}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Retry Video
                </Button>
              )}
              {(audioTracks.length > 0 && audioElements.length === 0) && (
                <Button
                  size="sm"
                  onClick={manualRetryAudioAttachment}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Enable Audio
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveKitStreamPlayer;
