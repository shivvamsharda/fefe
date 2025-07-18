
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useWallet } from '@/context/WalletContext';
import { toast } from 'sonner';
import { ArrowLeft, Clipboard, Copy, RefreshCw, AlertOctagon, CheckCircle, PowerOff, Loader2, Monitor, Play, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getMuxRtmpUrl, updateStreamStatus, stopStream } from '@/services/streamService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StreamPreviewPlayer from './StreamPreviewPlayer';
import { Checkbox } from '@/components/ui/checkbox';

const OBSStreamingStudio = () => {
  const { hasWalletCapability, effectiveWalletAddress } = useWallet();
  const navigate = useNavigate();

  // State variables
  const [isLive, setIsLive] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingStream, setCheckingStream] = useState(false);
  const [endingStream, setEndingStream] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lastCheck, setLastCheck] = useState(0);
  const [streamTerminated, setStreamTerminated] = useState(false);
  const [hasStartedOBS, setHasStartedOBS] = useState(false);
  const [showGoLiveSection, setShowGoLiveSection] = useState(false);
  const [attemptedGoLive, setAttemptedGoLive] = useState(false);
  const [playerLoadDelay, setPlayerLoadDelay] = useState(false);

  // Fetch user profile ID
  useEffect(() => {
    async function fetchUserProfile() {
      if (hasWalletCapability && effectiveWalletAddress) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', effectiveWalletAddress)
          .single();
        
        if (data?.id) {
          setUserId(data.id);
        }
      }
    }
    
    fetchUserProfile();
  }, [hasWalletCapability, effectiveWalletAddress]);

  // Fetch user's latest stream - NO auto-polling initially
  const { 
    data: streamData, 
    isLoading: streamLoading,
    refetch: refetchStream 
  } = useQuery({
    queryKey: ['latestStream', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data } = await supabase
        .from('streams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setStreamTerminated(false);
        const currentlyLive = data.status === 'active';
        const hasPlaybackId = !!data.playback_id && data.playback_id.trim() !== '';
        
        // Only set live state if we've attempted to go live
        if (attemptedGoLive) {
          setIsLive(currentlyLive);
        }
        
        // Always show go live section for setup
        setShowGoLiveSection(true);
      } else {
        setIsLive(false);
      }
      
      return data;
    },
    enabled: !!userId,
    // Only enable polling AFTER user has attempted to go live
    refetchInterval: streamTerminated ? false : (attemptedGoLive && isLive ? 3000 : false)
  });

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Get RTMP URL
  const rtmpUrl = "rtmp://global-live.mux.com/app";

  // Handle user confirmation that they started OBS
  const handleOBSConfirmation = () => {
    setHasStartedOBS(true);
    setShowGoLiveSection(true);
    toast.success("Great! You can now go live when you're ready.", {
      description: "Make sure OBS shows 'Stream: Active' before clicking Go Live"
    });
  };

  // Check and update stream status - ONLY called when user clicks Go Live
  const checkAndUpdateStreamStatus = async () => {
    if (!streamData?.id || streamTerminated) return;
    
    // Validate that user has confirmed they started streaming
    if (!hasStartedOBS) {
      toast.error("Please confirm you've started streaming", {
        description: "Check the box to confirm you've started streaming with your RTMP software"
      });
      return;
    }
    
    setCheckingStream(true);
    setUpdateSuccess(false);
    setLastCheck(Date.now());
    setAttemptedGoLive(true); // Mark that we've attempted to go live
    setPlayerLoadDelay(true); // Start the 10-second delay
    
    try {
      console.log(`Checking stream status for ${streamData.id}`);
      
      const [dbCheck, updateResult] = await Promise.allSettled([
        supabase
          .from('streams')
          .select('status, playback_id')
          .eq('id', streamData.id)
          .single(),
        updateStreamStatus(
          streamData.id, 
          'active', 
          forceUpdate || failedAttempts > 1,
        )
      ]);
      
      if (dbCheck.status === 'fulfilled' && dbCheck.value.data) {
        const currentData = dbCheck.value.data;
        const isCurrentlyLiveInDb = currentData?.status === 'active';
        
        if (isCurrentlyLiveInDb && currentData?.playback_id) {
          console.log("Stream is already active in database with playback ID:", currentData.playback_id);
          setIsLive(true);
          setCheckingStream(false);
          setUpdateSuccess(true);
          setFailedAttempts(0);
          
          // Start 10-second countdown for player load
          setTimeout(() => {
            setPlayerLoadDelay(false);
            console.log("Player load delay completed - player can now load");
          }, 10000);
          
          setTimeout(() => setUpdateSuccess(false), 3000);
          
          toast.success("Stream is active!", { 
            description: "Player will load in 10 seconds to ensure stable connection" 
          });
          return;
        }
      }
      
      if (updateResult.status === 'fulfilled' && updateResult.value) {
        console.log("Stream status updated successfully to active");
        setIsLive(true);
        setUpdateSuccess(true);
        setFailedAttempts(0);
        
        // Start 10-second countdown for player load
        setTimeout(() => {
          setPlayerLoadDelay(false);
          console.log("Player load delay completed - player can now load");
        }, 10000);
        
        toast.success("Stream activated successfully!", { 
          description: "Player will load in 10 seconds to ensure stable connection" 
        });
        
        refetchStream();
        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        console.warn("Failed to update stream status to active");
        setPlayerLoadDelay(false); // Reset delay on failure
        setFailedAttempts(prev => prev + 1);
        
        if (failedAttempts === 0) {
          toast.error("Checking stream connection...", { 
            description: "Please make sure OBS is properly connected and streaming" 
          });
        } else if (failedAttempts === 1) {
          toast.error("Still trying to connect...", { 
            description: "Click 'Update' again if OBS shows it's streaming" 
          });
        } else {
          setForceUpdate(true);
          toast.error("Couldn't verify stream with Mux", { 
            description: "Click 'Force Update' to manually set stream as active" 
          });
        }
      }
    } catch (error) {
      console.error("Error checking stream status:", error);
      setPlayerLoadDelay(false); // Reset delay on error
      setFailedAttempts(prev => prev + 1);
      toast.error("Error checking stream status");
    } finally {
      setCheckingStream(false);
    }
  };
  
  // End stream function - UPDATED to use proper stream termination
  const handleEndStream = async () => {
    if (!streamData?.id) return;

    setEndingStream(true);
    try {
      console.log(`Ending stream ${streamData.id} using proper termination`);
      
      // Use the new stopStream service function that calls Mux API first
      const success = await stopStream(streamData.id);
      
      if (success) {
        console.log("Stream ended successfully via stopStream service");
        setStreamTerminated(true);
        setIsLive(false);
        setForceUpdate(false);
        setFailedAttempts(0);
        setShowGoLiveSection(false);
        setHasStartedOBS(false);
        setAttemptedGoLive(false);
        setPlayerLoadDelay(false);
        
        toast.success("Stream Ended", {
          description: "Your stream has been properly terminated on both Mux and our servers."
        });
        
        setTimeout(() => {
          toast.info("Create a new stream", {
            description: "Please create a new stream to start broadcasting again."
          });
          navigate('/create/stream');
        }, 3000);
      } else {
        console.error("Failed to end stream via stopStream service");
        toast.error("Failed to End Stream", {
          description: "Could not properly terminate the stream. Please try again."
        });
      }
    } catch (error) {
      console.error("Error ending stream:", error);
      toast.error("Error Ending Stream", {
        description: "An unexpected error occurred while ending the stream."
      });
    } finally {
      setEndingStream(false);
    }
  };
  
  // Stream status checking effect - only when actually live and user has attempted go live
  useEffect(() => {
    if (!streamData?.id || streamTerminated || !attemptedGoLive || !isLive) return;
    
    const checkStreamStatus = async () => {
      if (Date.now() - lastCheck < 2000) return;
      
      try {
        console.log("Auto-checking stream status...");
        const { data } = await supabase
          .from('streams')
          .select('status, playback_id')
          .eq('id', streamData.id)
          .single();
        
        if (data?.status === 'completed') {
          setStreamTerminated(true);
          setIsLive(false);
          setShowGoLiveSection(false);
          setAttemptedGoLive(false);
          return;
        }
        
        const isCurrentlyLive = data?.status === 'active';
        const hasPlaybackId = !!data?.playback_id && data.playback_id.trim() !== '';
        
        if (isCurrentlyLive !== isLive) {
          console.log(`Stream status changed from ${isLive ? 'active' : 'idle'} to ${isCurrentlyLive ? 'active' : 'idle'}`);
          setIsLive(isCurrentlyLive);
          
          if (isCurrentlyLive && hasPlaybackId && !isLive) {
            toast.success("Your stream is now live!", {
              description: "Viewers can now watch your stream on the home page"
            });
          } else if (isCurrentlyLive && !hasPlaybackId) {
            console.log("Stream is active but missing playback ID, attempting to update status...");
            try {
              await updateStreamStatus(streamData.id, 'active', true);
            } catch (err) {
              console.error("Error forcing stream update:", err);
            }
          }
        }
        
        if (hasPlaybackId && (!streamData.playback_id || streamData.playback_id.trim() === '')) {
          console.log("Playback ID is now available, enabling player");
          refetchStream();
        }
      } catch (error) {
        console.error('Error checking stream status:', error);
      }
    };
    
    checkStreamStatus();
    const interval = setInterval(checkStreamStatus, 5000);
    return () => clearInterval(interval);
  }, [streamData?.id, isLive, lastCheck, refetchStream, streamTerminated, attemptedGoLive]);

  // Redirect if stream is terminated
  useEffect(() => {
    if (streamTerminated && !streamLoading) {
      toast.info("Stream has ended", {
        description: "Please create a new stream to start broadcasting again."
      });
      navigate('/create/stream');
    }
  }, [streamTerminated, navigate, streamLoading]);

  if (streamLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-solana mx-auto mb-4" />
          <p className="text-white/70">Loading stream setup...</p>
        </div>
      </div>
    );
  }

  if (!streamData && !streamLoading && userId) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-4">No Stream Found</h2>
        <p className="text-white/70 mb-6">You need to create a stream before you can broadcast.</p>
        <Button 
          onClick={() => navigate('/create/stream')}
          className="bg-solana hover:bg-solana/90"
        >
          Create New Stream
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Back button */}
      <div className="py-4">
        <Link to="/create/stream" className="flex items-center text-white/70 hover:text-white">
          <ArrowLeft className="mr-2" size={16} />
          <span>Back to Stream Setup</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left sidebar - Stream Setup Instructions */}
        <Card className="bg-black/40 border-white/10 md:col-span-1">
          <CardHeader>
            <CardTitle>OBS/RTMP Stream Setup</CardTitle>
            <CardDescription>Follow these steps to start streaming with any RTMP software</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white/70">Stream Name</label>
              <p className="font-medium">{streamData?.title || 'My Stream'}</p>
            </div>
            
            {streamData && !streamTerminated && (
              <div className="space-y-4">
                {/* Step 1: Stream Configuration */}
                <div className="p-3 rounded-md bg-solana/5 border border-solana/20">
                  <h3 className="text-solana font-medium mb-3 flex items-center">
                    <div className="w-6 h-6 rounded-full bg-solana/20 flex items-center justify-center mr-2 text-xs">1</div>
                    Configure RTMP Settings
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm text-white/70">Stream Key</label>
                      <div className="flex">
                        <Input
                          value={streamData.stream_key || ''}
                          readOnly
                          type="password"
                          className="bg-black/40 border-white/10 rounded-r-none text-xs"
                        />
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="rounded-l-none"
                          onClick={() => streamData.stream_key && copyToClipboard(streamData.stream_key)}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-white/70">RTMP URL</label>
                      <div className="flex">
                        <Input
                          value={rtmpUrl || ''}
                          readOnly
                          className="bg-black/40 border-white/10 rounded-r-none text-xs"
                        />
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="rounded-l-none"
                          onClick={() => rtmpUrl && copyToClipboard(rtmpUrl)}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Start Streaming */}
                <div className={`p-3 rounded-md border ${hasStartedOBS ? 'bg-green-950/20 border-green-500/30' : 'bg-black/60 border-white/10'}`}>
                  <h3 className={`font-medium mb-3 flex items-center ${hasStartedOBS ? 'text-green-400' : 'text-white/70'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs ${hasStartedOBS ? 'bg-green-500/20 text-green-400' : 'bg-white/10'}`}>2</div>
                    Start Streaming in Your Software
                  </h3>
                  
                  {!hasStartedOBS ? (
                    <div className="space-y-3">
                      <ol className="text-xs text-white/60 list-decimal ml-4 space-y-1">
                        <li>Open OBS Studio or your preferred RTMP software</li>
                        <li>Go to Stream settings</li>
                        <li>Select "Custom RTMP" or "Custom..." as the service</li>
                        <li>Enter the RTMP URL and Stream Key above</li>
                        <li>Apply settings and start streaming</li>
                        <li>Wait for your software to show streaming is active</li>
                      </ol>
                      
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox 
                          id="obs-started" 
                          checked={hasStartedOBS}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleOBSConfirmation();
                            }
                          }}
                        />
                        <label htmlFor="obs-started" className="text-sm text-white cursor-pointer">
                          ✓ I have started streaming with my RTMP software
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-green-400">
                      ✓ Ready to go live! Make sure your software shows streaming is active
                    </div>
                  )}
                </div>

                {/* Step 3: Go Live */}
                {showGoLiveSection && (
                  <div className={`p-3 rounded-md border ${isLive ? 'bg-green-950/30 border-green-500/20' : 'bg-solana/5 border-solana/20'}`}>
                    <h3 className={`font-medium mb-3 flex items-center ${isLive ? 'text-green-400' : 'text-solana'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs ${isLive ? 'bg-green-500/20 text-green-400' : 'bg-solana/20'}`}>3</div>
                      {isLive ? 'Stream is Live!' : 'Activate Your Stream'}
                    </h3>
                    
                    {isLive ? (
                      <div className="space-y-2">
                        <div className="flex items-center text-green-400 text-sm">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                          Your stream is live and visible to viewers
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full bg-red-700 hover:bg-red-800 text-white"
                          onClick={handleEndStream}
                          disabled={endingStream || checkingStream}
                        >
                          <PowerOff size={16} className={`mr-1.5 ${endingStream ? 'animate-spin' : ''}`} />
                          End Stream
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-white/60 mb-2">
                          Click when OBS shows "Stream: Active"
                        </p>
                        {!hasStartedOBS && (
                          <p className="text-xs text-amber-400/80 mb-2">
                            Please confirm you've started streaming with your RTMP software above
                          </p>
                        )}
                        <Button
                          size="sm"
                          className={`w-full ${
                            updateSuccess 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : forceUpdate 
                                ? 'border-amber-500 text-amber-500 hover:bg-amber-500/10' 
                                : hasStartedOBS
                                  ? 'bg-solana hover:bg-solana/90 text-white'
                                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                          onClick={checkAndUpdateStreamStatus}
                          disabled={checkingStream || endingStream || updateSuccess || !hasStartedOBS}
                        >
                          {updateSuccess ? (
                            <CheckCircle size={16} className="mr-1.5" />
                          ) : (
                            <Play size={16} className={`mr-1.5 ${checkingStream ? 'animate-spin' : ''}`} />
                          )}
                          {updateSuccess ? 'Live!' : forceUpdate ? 'Force Go Live' : 'Go Live'}
                        </Button>
                        
                        {!isLive && failedAttempts > 0 && !forceUpdate && !updateSuccess && hasStartedOBS && (
                          <p className="text-xs text-amber-400/80 mt-2">
                            Ensure OBS shows "Stream: Active" before trying again.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {streamTerminated && (
              <div className="p-4 rounded-md bg-red-950/30 border border-red-500/30 text-center">
                <h3 className="text-lg font-medium mb-2">Stream Ended</h3>
                <p className="text-white/70 mb-4">Create a new stream to broadcast again.</p>
                <Button 
                  onClick={() => navigate('/create/stream')}
                  className="bg-solana hover:bg-solana/90"
                >
                  Create New Stream
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main broadcast area */}
        <div className="md:col-span-2 space-y-4">
          {/* Stream preview card */}
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>Stream Preview</CardTitle>
              <CardDescription>
                {isLive 
                  ? playerLoadDelay 
                    ? "Stream is activating - ultra-low latency preview loading..."
                    : "Ultra-low latency preview - shows your stream with minimal delay"
                  : streamTerminated
                    ? "This stream has been ended"
                    : attemptedGoLive && checkingStream
                      ? "Activating your stream..."
                      : "Stream preview will appear once you go live"}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {/* Use the new StreamPreviewPlayer for optimized latency */}
              {streamData && !streamTerminated && isLive && attemptedGoLive && !playerLoadDelay && streamData.playback_id && streamData.playback_id.trim() !== '' ? (
                <div className="relative">
                  <StreamPreviewPlayer 
                    playbackId={streamData.playback_id}
                    title={streamData.title}
                    onRetry={checkAndUpdateStreamStatus}
                    userId={userId || undefined}
                  />
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-black rounded-lg">
                  {streamTerminated ? (
                    <div className="text-center">
                      <AlertOctagon className="w-16 h-16 mx-auto mb-4 text-red-500/50" />
                      <h3 className="text-xl font-medium mb-2">Stream Ended</h3>
                      <p className="text-white/70 mb-4">This stream has been terminated.</p>
                      <Button 
                        onClick={() => navigate('/create/stream')}
                        className="bg-solana hover:bg-solana/90"
                      >
                        Create New Stream
                      </Button>
                    </div>
                  ) : checkingStream && attemptedGoLive ? (
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-solana mx-auto mb-4" />
                      <h3 className="text-xl mb-3">Activating Stream</h3>
                      <p className="text-white/70">Connecting to Mux servers...</p>
                    </div>
                  ) : isLive && attemptedGoLive && playerLoadDelay ? (
                    <div className="text-center">
                      <div className="w-12 h-12 border-2 border-solana/30 border-t-solana rounded-full animate-spin mx-auto mb-4"></div>
                      <h3 className="text-xl mb-3">Stream Active</h3>
                      <p className="text-white/70">Ultra-low latency preview loading...</p>
                    </div>
                  ) : isLive && attemptedGoLive ? (
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-solana mx-auto mb-4" />
                      <h3 className="text-xl mb-3">Loading Preview</h3>
                      <p className="text-white/70">Stream is active, loading ultra-low latency preview...</p>
                    </div>
                  ) : showGoLiveSection ? (
                    <div className="text-center">
                      <Monitor className="w-16 h-16 mx-auto mb-4 text-solana/50" />
                      <h3 className="text-xl mb-3">Ready to Go Live</h3>
                      <p className="text-white/70">Click "Go Live" when OBS is streaming</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Monitor className="w-16 h-16 mx-auto mb-4 text-white/30" />
                      <h3 className="text-xl mb-3">Stream Setup</h3>
                      <p className="text-white/70">Configure OBS and start streaming to continue</p>
                    </div>
                  )}
                </div>
              )}
              
              {!streamData && !streamLoading && ( 
                 <div className="aspect-video flex items-center justify-center bg-black rounded-lg">
                    <div className="text-center">
                      <AlertOctagon className="w-16 h-16 mx-auto mb-4 text-solana/50" />
                      <p className="text-white/70">No stream found</p>
                    </div>
                  </div>
              )}
            </CardContent>
          </Card>

          {/* Stream Settings Recommendations - Enhanced for low latency */}
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2" size={20} />
                Recommended RTMP Settings for Low Latency
              </CardTitle>
              <CardDescription>
                Optimize your stream quality and reduce latency with these recommended settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Video Settings */}
                <div className="space-y-3">
                  <h4 className="font-medium text-solana">Video Settings (Low Latency)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Output Resolution:</span>
                      <span className="font-medium">1920x1080</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">FPS:</span>
                      <span className="font-medium">30 (for lower latency)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Video Bitrate:</span>
                      <span className="font-medium">3,000-4,500 kbps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Encoder:</span>
                      <span className="font-medium">x264 ultrafast</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Rate Control:</span>
                      <span className="font-medium">CBR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Keyframe Interval:</span>
                      <span className="font-medium">2 seconds</span>
                    </div>
                  </div>
                </div>

                {/* Audio Settings */}
                <div className="space-y-3">
                  <h4 className="font-medium text-solana">Audio Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Audio Bitrate:</span>
                      <span className="font-medium">128 kbps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Sample Rate:</span>
                      <span className="font-medium">44.1 kHz</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Channels:</span>
                      <span className="font-medium">Stereo</span>
                    </div>
                  </div>
                </div>

                {/* Performance Tips - Enhanced for latency */}
                <div className="md:col-span-2 space-y-3">
                  <h4 className="font-medium text-solana">Low Latency Performance Tips</h4>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-md bg-solana/5 border border-solana/20">
                      <div className="font-medium text-white/90 mb-1">OBS Low Latency</div>
                      <div className="text-white/60">Enable "Reduce Latency" in Advanced settings</div>
                    </div>
                    <div className="p-3 rounded-md bg-solana/5 border border-solana/20">
                      <div className="font-medium text-white/90 mb-1">Network Optimization</div>
                      <div className="text-white/60">Use wired connection and close bandwidth-heavy apps</div>
                    </div>
                    <div className="p-3 rounded-md bg-solana/5 border border-solana/20">
                      <div className="font-medium text-white/90 mb-1">Encoder Preset</div>
                      <div className="text-white/60">Use "ultrafast" x264 preset for minimal encoding delay</div>
                    </div>
                    <div className="p-3 rounded-md bg-solana/5 border border-solana/20">
                      <div className="font-medium text-white/90 mb-1">Preview Latency</div>
                      <div className="text-white/60">Creator preview optimized for ~1-2 second delay</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OBSStreamingStudio;
