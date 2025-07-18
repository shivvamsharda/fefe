
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWallet } from '@/context/WalletContext';
import { createBrowserStream, stopBrowserStream, startLivekitEgress, BrowserStreamConfig } from '@/services/browserStreamService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Camera, CameraOff, Mic, MicOff, Video, StopCircle, Play, RefreshCw, AlertTriangle, Monitor, MonitorOff } from 'lucide-react';
import { Room, Track, LocalParticipant, RemoteTrackPublication } from 'livekit-client';
import { useBrowserMediaCheck } from '@/hooks/useBrowserMediaCheck';

const BrowserStreamingStudio = () => {
  const { hasWalletCapability, effectiveWalletAddress, userProfile } = useWallet();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stream, setStream] = useState<any>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [pendingStreamData, setPendingStreamData] = useState<any>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const { hasCameraPermission, hasAudioPermission, isCheckingPermissions, checkMediaPermissions } = useBrowserMediaCheck();

  useEffect(() => {
    checkMediaPermissions();
    
    // Get stream data from sessionStorage
    const storedStreamData = sessionStorage.getItem('pendingStreamData');
    if (storedStreamData) {
      try {
        setPendingStreamData(JSON.parse(storedStreamData));
        // Clear it from sessionStorage after using it
        sessionStorage.removeItem('pendingStreamData');
      } catch (error) {
        console.error('Error parsing stored stream data:', error);
        sessionStorage.removeItem('pendingStreamData');
      }
    }
  }, []);

  // Start preview when at least one permission is available
  useEffect(() => {
    if ((hasCameraPermission || hasAudioPermission) && !isStreaming) {
      startPreview();
    }
    
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [hasCameraPermission, hasAudioPermission, isStreaming]);

  const startPreview = async () => {
    try {
      console.log('Starting preview...');
      
      // Request only available media types
      const constraints: MediaStreamConstraints = {};
      if (hasCameraPermission) constraints.video = true;
      if (hasAudioPermission) constraints.audio = true;
      
      if (!constraints.video && !constraints.audio) {
        console.log('No permissions available for preview');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPreviewStream(stream);
      
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      console.log('Preview started successfully with:', 
        constraints.video ? 'video' : 'no video', 
        constraints.audio ? 'audio' : 'no audio'
      );
    } catch (error) {
      console.error('Error starting preview:', error);
      toast.error("Failed to start preview", {
        description: error.message
      });
    }
  };

  const toggleScreenShare = async () => {
    if (!room?.localParticipant) return;
    
    try {
      const isEnabled = !screenShareEnabled;
      await room.localParticipant.setScreenShareEnabled(isEnabled);
      setScreenShareEnabled(isEnabled);
      
      if (isEnabled) {
        toast.success("Screen sharing started");
      } else {
        toast.success("Screen sharing stopped");
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error("Failed to toggle screen sharing", {
        description: error.message
      });
    }
  };

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
  };

  const handleRecheckPermissions = async () => {
    console.log('Rechecking media permissions...');
    await checkMediaPermissions();
  };

  const handleStartStream = async () => {
    if (!hasWalletCapability || !effectiveWalletAddress) {
      toast.error("Please connect your wallet to start streaming");
      return;
    }

    if (!hasCameraPermission && !hasAudioPermission) {
      toast.error("At least camera or microphone access required", {
        description: "Please enable at least one permission and try again"
      });
      return;
    }

    setIsConnecting(true);
    stopPreview(); // Stop preview before starting stream

    try {
      console.log('Getting user profile for wallet:', effectiveWalletAddress);
      
      // Use userProfile directly if available, otherwise look up by wallet address
      let userId = userProfile?.id;
      
      if (!userId) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', effectiveWalletAddress)
          .single();
        
        if (profileError || !profileData?.id) {
          console.error('Profile error:', profileError);
          toast.error("Could not find your user profile", {
            description: "Please make sure your wallet is properly connected"
          });
          setIsConnecting(false);
          startPreview();
          return;
        }
        userId = profileData.id;
      }

      console.log('Creating browser stream for user:', userId);

      // Create browser stream
      const result = await createBrowserStream(userId, pendingStreamData);

      if (!result) {
        console.error('Failed to create browser stream - no result returned');
        setIsConnecting(false);
        startPreview();
        return;
      }

      console.log('Browser stream created successfully:', result);

      // Connect to LiveKit
      const newRoom = new Room();
      
      newRoom.on('connected', async () => {
        console.log('Connected to LiveKit room');
        
        try {
          // Get user media with high quality settings for streaming - only request available media
          const constraints: MediaStreamConstraints = {};
          if (hasCameraPermission && cameraEnabled) {
            constraints.video = {
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 30, min: 15 }
            };
          }
          if (hasAudioPermission && micEnabled) {
            constraints.audio = {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            };
          }
          
          const userMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          
          console.log('Got user media, publishing tracks...');
          
          let videoTrackPublished = false;
          let audioTrackPublished = false;
          
          // Publish video track with optimized settings for streaming
          if (userMediaStream.getVideoTracks().length > 0 && cameraEnabled) {
            const videoTrack = userMediaStream.getVideoTracks()[0];
            const videoPublication = await newRoom.localParticipant.publishTrack(videoTrack, {
              name: 'camera',
              source: Track.Source.Camera,
              simulcast: true
            });
            console.log('Video track published successfully:', videoPublication.trackSid);
            videoTrackPublished = true;
            
            // Attach to local preview
            if (videoRef.current) {
              videoTrack.addEventListener('ended', () => {
                console.log('Video track ended');
              });
              videoRef.current.srcObject = new MediaStream([videoTrack]);
            }
          }
          
          // Publish audio track with quality settings
          if (userMediaStream.getAudioTracks().length > 0 && micEnabled) {
            const audioTrack = userMediaStream.getAudioTracks()[0];
            const audioPublication = await newRoom.localParticipant.publishTrack(audioTrack, {
              name: 'microphone',
              source: Track.Source.Microphone,
            });
            console.log('Audio track published successfully:', audioPublication.trackSid);
            audioTrackPublished = true;
          }
          
          // Start LiveKit egress AFTER tracks are published - THIS IS THE FIX
          if (videoTrackPublished || audioTrackPublished) {
            console.log('=== STARTING LIVEKIT EGRESS ===');
            console.log('Stream ID:', result.stream.id);
            console.log('Room Name:', result.livekit.roomName);
            console.log('Mux Stream Key exists:', !!result.stream.mux_stream_key);
            
            // Call the edge function to start LiveKit egress
            const { data: egressResult, error: egressError } = await supabase.functions.invoke('start-livekit-egress', {
              body: {
                streamId: result.stream.id,
                roomName: result.livekit.roomName,
                muxStreamKey: result.stream.mux_stream_key
              }
            });
            
            if (egressError) {
              console.error('Failed to start LiveKit egress:', egressError);
              toast.error("Failed to start stream egress", {
                description: "Stream may not be visible to viewers"
              });
            } else if (egressResult?.success) {
              console.log('LiveKit egress started successfully:', egressResult.egressId);
              toast.success("Stream started successfully! You're now live!");
            } else {
              console.warn('Egress response unclear:', egressResult);
              toast.warning("Stream started but egress status unclear");
            }
          } else {
            console.error('No tracks were published, cannot start egress');
            toast.error("Failed to publish media tracks");
          }
          
          setIsStreaming(true);
          setIsConnecting(false);
          
        } catch (mediaError) {
          console.error('Error publishing tracks:', mediaError);
          toast.error("Failed to publish camera/microphone", {
            description: mediaError.message
          });
          setIsConnecting(false);
          await newRoom.disconnect();
          startPreview();
        }
      });

      newRoom.on('disconnected', () => {
        console.log('Disconnected from LiveKit room');
        setIsStreaming(false);
        setRoom(null);
        startPreview();
      });

      newRoom.on('trackPublished', (publication, participant) => {
        console.log('Track published:', publication.trackSid, publication.source);
        
        // Update screen share state when screen share track is published
        if (publication.source === Track.Source.ScreenShare) {
          setScreenShareEnabled(true);
        }
      });

      newRoom.on('trackUnpublished', (publication, participant) => {
        console.log('Track unpublished:', publication.trackSid);
        
        // Update screen share state when screen share track is unpublished
        if (publication.source === Track.Source.ScreenShare) {
          setScreenShareEnabled(false);
        }
      });

      // Connect to the room
      console.log('Connecting to LiveKit room:', result.livekit.roomName);
      await newRoom.connect(result.livekit.url, result.livekit.token);
      setRoom(newRoom);
      setStream(result.stream);

    } catch (error: any) {
      console.error('Error starting browser stream:', error);
      toast.error("Failed to start stream", {
        description: error.message || "There was an error starting your stream"
      });
      setIsConnecting(false);
      startPreview(); // Restart preview if stream failed
    }
  };

  const handleStopStream = async () => {
    if (!stream || !room) return;

    try {
      console.log('Stopping browser stream...');
      
      // Use userProfile directly if available, otherwise look up by wallet address
      let userId = userProfile?.id;
      
      if (!userId) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', effectiveWalletAddress)
          .single();
        
        if (profileError || !profileData?.id) {
          toast.error("Could not find your user profile");
          return;
        }
        userId = profileData.id;
      }

      // Stop all local tracks first
      const localParticipant = room.localParticipant;
      
      // Stop camera track
      const cameraPublication = localParticipant.getTrackPublication(Track.Source.Camera);
      if (cameraPublication?.track) {
        cameraPublication.track.stop();
        await localParticipant.unpublishTrack(cameraPublication.track);
      }
      
      // Stop microphone track
      const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micPublication?.track) {
        micPublication.track.stop();
        await localParticipant.unpublishTrack(micPublication.track);
      }
      
      // Stop screen share if enabled
      if (screenShareEnabled) {
        await localParticipant.setScreenShareEnabled(false);
      }

      // Stop the stream via edge function
      await stopBrowserStream(stream.id, userId);
      
      // Disconnect from LiveKit
      await room.disconnect();
      
      // Clear all state
      setIsStreaming(false);
      setStream(null);
      setRoom(null);
      
      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Restart preview after stopping stream
      setTimeout(() => {
        startPreview();
      }, 1000);
      
      toast.success("Stream ended successfully");
    } catch (error: any) {
      console.error('Error stopping stream:', error);
      toast.error("Failed to stop stream", {
        description: error.message
      });
    }
  };

  const toggleCamera = async () => {
    if (isStreaming && room) {
      try {
        if (cameraEnabled) {
          await room.localParticipant.setCameraEnabled(false);
        } else {
          await room.localParticipant.setCameraEnabled(true);
        }
        setCameraEnabled(!cameraEnabled);
      } catch (error) {
        console.error('Error toggling camera:', error);
        toast.error("Failed to toggle camera");
      }
    } else if (previewStream) {
      const videoTrack = previewStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraEnabled;
        setCameraEnabled(!cameraEnabled);
      }
    }
  };

  const toggleMic = async () => {
    if (isStreaming && room) {
      try {
        if (micEnabled) {
          await room.localParticipant.setMicrophoneEnabled(false);
        } else {
          await room.localParticipant.setMicrophoneEnabled(true);
        }
        setMicEnabled(!micEnabled);
      } catch (error) {
        console.error('Error toggling microphone:', error);
        toast.error("Failed to toggle microphone");
      }
    } else if (previewStream) {
      const audioTrack = previewStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micEnabled;
        setMicEnabled(!micEnabled);
      }
    }
  };

  if (!hasWalletCapability) {
    return (
      <Card className="bg-secondary border-white/5">
        <CardContent className="p-6">
          <p className="text-white/70 text-center">
            Please connect your wallet to access browser streaming
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-secondary border-white/5">
        <CardContent className="space-y-4 p-6">
          
          {/* Permission denied alert */}
          {(hasCameraPermission === false || hasAudioPermission === false) && (
            <Alert className="border-orange-500/30 bg-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-white">
                <div className="space-y-2">
                  <p>Camera or microphone access was denied. Please enable permissions in your browser to start streaming.</p>
                  <p className="text-sm text-white/70">
                    Click the camera/microphone icon in your browser's address bar and select "Allow", then click the recheck button below.
                  </p>
                  <Button 
                    onClick={handleRecheckPermissions}
                    disabled={isCheckingPermissions}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    {isCheckingPermissions ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Recheck Permissions
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!isStreaming && !isConnecting && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-white/70 text-sm">Camera & Microphone Status:</p>
                <div className="flex gap-2">
                  <Badge variant={hasCameraPermission ? "default" : "destructive"}>
                    <Camera size={12} className="mr-1" />
                    Camera: {hasCameraPermission === null ? "Checking..." : hasCameraPermission ? "Ready" : "No Access"}
                  </Badge>
                  <Badge variant={hasAudioPermission ? "default" : "destructive"}>
                    <Mic size={12} className="mr-1" />
                    Microphone: {hasAudioPermission === null ? "Checking..." : hasAudioPermission ? "Ready" : "No Access"}
                  </Badge>
                </div>
              </div>

              {/* Camera/Mic Preview */}
              {(hasCameraPermission || hasAudioPermission) && (
                <div className="space-y-4">
                  <p className="text-white text-sm font-medium">Preview:</p>
                   <div className="bg-black rounded-lg overflow-hidden">
                     <video
                       ref={previewVideoRef}
                       autoPlay
                       muted
                       playsInline
                       className="w-full h-96 object-cover"
                     />
                   </div>
                  
                   <div className="flex justify-center gap-4">
                     <Button
                       onClick={toggleCamera}
                       variant={cameraEnabled ? "default" : "destructive"}
                       size="sm"
                       disabled={screenShareEnabled}
                     >
                       {cameraEnabled ? <Camera size={16} /> : <CameraOff size={16} />}
                     </Button>
                     
                     <Button
                       onClick={toggleMic}
                       variant={micEnabled ? "default" : "destructive"}
                       size="sm"
                     >
                       {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                     </Button>
                     
                      <Button
                        onClick={toggleScreenShare}
                        variant={screenShareEnabled ? "default" : "outline"}
                        size="sm"
                        disabled={!isStreaming}
                      >
                        {screenShareEnabled ? <Monitor size={16} /> : <MonitorOff size={16} />}
                      </Button>
                   </div>
                </div>
              )}

              <Button 
                onClick={handleStartStream}
                disabled={!hasCameraPermission && !hasAudioPermission}
                className="w-full bg-solana hover:bg-solana/90"
              >
                <Play size={16} className="mr-2" />
                Start Browser Stream
                {!hasCameraPermission && hasAudioPermission && (
                  <span className="text-xs ml-2">(Audio Only)</span>
                )}
              </Button>
            </div>
          )}

          {isConnecting && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-solana" />
              <p className="text-white">Connecting to stream...</p>
            </div>
          )}

          {isStreaming && (
            <div className="space-y-4">
               <div className="bg-black rounded-lg overflow-hidden">
                 <video
                   ref={videoRef}
                   autoPlay
                   muted
                   playsInline
                   className="w-full h-96 object-cover"
                 />
               </div>
              
               <div className="flex justify-center gap-4">
                 <Button
                   onClick={toggleCamera}
                   variant={cameraEnabled ? "default" : "destructive"}
                   size="sm"
                   disabled={screenShareEnabled}
                 >
                   {cameraEnabled ? <Camera size={16} /> : <CameraOff size={16} />}
                 </Button>
                 
                 <Button
                   onClick={toggleMic}
                   variant={micEnabled ? "default" : "destructive"}
                   size="sm"
                 >
                   {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                 </Button>
                 
                  <Button
                    onClick={toggleScreenShare}
                    variant={screenShareEnabled ? "default" : "outline"}
                    size="sm"
                  >
                    {screenShareEnabled ? <Monitor size={16} /> : <MonitorOff size={16} />}
                  </Button>
                 
                 <Button
                   onClick={handleStopStream}
                   variant="destructive"
                   size="sm"
                 >
                   <StopCircle size={16} className="mr-2" />
                   End Stream
                 </Button>
               </div>

              <div className="text-center">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  🔴 LIVE
                </Badge>
                <p className="text-white mt-2 font-medium">{stream?.title}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrowserStreamingStudio;
