import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Monitor, Copy, ArrowLeft, Loader2, Users, Clock, Wifi, AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { startLiveKitOBSStream, stopLiveKitOBSStream, getLiveKitOBSStreamStatus, createLiveKitOBSStream } from '@/services/livekitOBSService';
import LiveKitStreamPlayer from '@/components/stream/LiveKitStreamPlayer';
import { supabase } from '@/integrations/supabase/client';
import StreamKeyManager from '@/components/stream/StreamKeyManager';
import ChatBox from '@/components/stream/ChatBox';

const OBSStreamingV2 = () => {
  const { hasWalletCapability, effectiveWalletAddress, userUuid } = useWallet();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const streamIdFromUrl = searchParams.get('streamId');
  
  const [streamData, setStreamData] = useState<any>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streamStatus, setStreamStatus] = useState<string>('idle');
  const [streamDuration, setStreamDuration] = useState<string>('00:00:00');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [error, setError] = useState<string>('');
  const [connectionHealth, setConnectionHealth] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);

  // Function to fetch stream data from database with fresh status check
  const fetchStreamFromDatabase = async (streamId: string) => {
    try {
      console.log('🔍 Fetching fresh stream data from database for streamId:', streamId);
      
      const { data: streamRecord, error } = await supabase
        .from('streams')
        .select('*')
        .eq('id', streamId)
        .eq('user_id', userUuid)
        .eq('source_type', 'livekit')
        .eq('stream_type', 'obs')
        .single();

      if (error) {
        console.error('❌ Error fetching stream from database:', error);
        throw new Error('Stream not found or access denied');
      }

      if (!streamRecord) {
        throw new Error('Stream not found');
      }

      console.log('📊 Fresh stream record from database:', {
        id: streamRecord.id,
        status: streamRecord.status,
        started_at: streamRecord.started_at,
        ended_at: streamRecord.ended_at,
        created_at: streamRecord.created_at,
        title: streamRecord.title
      });

      // Format the data to match the expected structure
      const formattedStreamData = {
        stream: streamRecord,
        room_name: streamRecord.livekit_room_name,
        rtmp_url: streamRecord.livekit_rtmp_url,
        stream_key: streamRecord.livekit_stream_key,
        ingress_id: streamRecord.livekit_ingress_id
      };

      console.log('✅ Successfully fetched and formatted fresh stream data:', {
        streamId: formattedStreamData.stream.id,
        status: formattedStreamData.stream.status,
        started_at: formattedStreamData.stream.started_at,
        ended_at: formattedStreamData.stream.ended_at,
        room_name: formattedStreamData.room_name
      });

      return formattedStreamData;
    } catch (error: any) {
      console.error('💥 Error in fetchStreamFromDatabase:', error);
      throw error;
    }
  };

  // Enhanced function to properly set stream state from database data with immediate UI updates and ended state handling
  const setStreamStateFromData = (streamData: any) => {
    console.log('🔄 Setting stream state from data with immediate updates and ended state handling:', {
      status: streamData.stream?.status,
      started_at: streamData.stream?.started_at,
      ended_at: streamData.stream?.ended_at,
      currentTime: new Date().toISOString()
    });

    const dbStatus = streamData.stream?.status || 'idle';
    const dbStartedAt = streamData.stream?.started_at;
    const dbEndedAt = streamData.stream?.ended_at;
    
    console.log('📊 Database values:', { dbStatus, dbStartedAt, dbEndedAt });

    // Use React's batched updates to set all related state synchronously
    React.startTransition(() => {
      console.log('🔄 Setting streamStatus to:', dbStatus);
      setStreamStatus(dbStatus);

      // Handle different stream states
      if (dbStatus === 'ended') {
        console.log('🛑 Stream is ended, setting final state');
        
        // Calculate final duration if we have both start and end times
        if (dbStartedAt && dbEndedAt) {
          const startedAtDate = new Date(dbStartedAt);
          const endedAtDate = new Date(dbEndedAt);
          
          if (!isNaN(startedAtDate.getTime()) && !isNaN(endedAtDate.getTime())) {
            const diffMs = endedAtDate.getTime() - startedAtDate.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            const hours = Math.floor(diffSeconds / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);
            const seconds = diffSeconds % 60;
            const finalDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            console.log('⏱️ Calculated final stream duration:', {
              dbStartedAt,
              dbEndedAt,
              diffMs,
              diffSeconds,
              finalDuration
            });
            
            setStreamDuration(finalDuration);
            setStartTime(startedAtDate);
            setEndTime(endedAtDate);
          }
        } else {
          console.log('⚠️ Missing start/end times for ended stream');
          setStartTime(null);
          setEndTime(null);
          setStreamDuration('00:00:00');
        }
      } else if (dbStatus === 'active') {
        // Handle active stream state
        if (dbStartedAt) {
          const startedAtDate = new Date(dbStartedAt);
          console.log('⏰ Parsing started_at date for active stream:', {
            original: dbStartedAt,
            parsed: startedAtDate.toISOString(),
            isValid: !isNaN(startedAtDate.getTime())
          });

          if (!isNaN(startedAtDate.getTime())) {
            console.log('✅ Setting startTime to:', startedAtDate.toISOString());
            setStartTime(startedAtDate);
            setEndTime(null);
            
            // Calculate initial duration immediately using database timestamp
            const now = new Date();
            const diffMs = now.getTime() - startedAtDate.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            const hours = Math.floor(diffSeconds / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);
            const seconds = diffSeconds % 60;
            const initialDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            console.log('⏱️ Calculated initial duration from database for active stream:', {
              dbStartedAt,
              now: now.toISOString(),
              diffMs,
              diffSeconds,
              duration: initialDuration
            });
            
            setStreamDuration(initialDuration);
          } else {
            console.warn('⚠️ Invalid started_at timestamp for active stream, setting startTime to null');
            setStartTime(null);
            setEndTime(null);
          }
        } else {
          console.log('ℹ️ No started_at timestamp for active stream, setting startTime to null');
          setStartTime(null);
          setEndTime(null);
        }
      } else {
        // Handle idle or other states
        console.log('ℹ️ Stream is idle or other state, resetting times');
        setStartTime(null);
        setEndTime(null);
        setStreamDuration('00:00:00');
      }
    });

    // Log final state for debugging
    setTimeout(() => {
      console.log('🎯 Final state after batched updates:', {
        streamStatus: dbStatus,
        startTime: dbStartedAt ? new Date(dbStartedAt).toISOString() : null,
        endTime: dbEndedAt ? new Date(dbEndedAt).toISOString() : null,
        isActive: dbStatus === 'active',
        isEnded: dbStatus === 'ended'
      });
    }, 100);
  };

  useEffect(() => {
    // Check if user has wallet capability
    if (!hasWalletCapability) {
      toast.error('Wallet authentication required');
      navigate('/create/stream');
      return;
    }

    const loadStreamData = async () => {
      try {
        let streamDataToUse = null;
        
        // Always fetch fresh data from database first if streamId is provided
        if (streamIdFromUrl) {
          console.log('🌐 Fetching fresh stream data from database for URL streamId...');
          streamDataToUse = await fetchStreamFromDatabase(streamIdFromUrl);
          
          // Update sessionStorage with fresh data
          sessionStorage.setItem('livekitStreamData', JSON.stringify(streamDataToUse));
        } else {
          // Try to get stream data from sessionStorage
          const storedStreamData = sessionStorage.getItem('livekitStreamData');
          
          if (storedStreamData) {
            try {
              const parsedData = JSON.parse(storedStreamData);
              console.log('💾 Loaded stream data from sessionStorage:', parsedData);
              
              // If sessionStorage data shows ended status, fetch fresh data to confirm
              if (parsedData.stream?.status === 'ended') {
                console.log('🔄 SessionStorage shows ended stream, fetching fresh data to confirm...');
                streamDataToUse = await fetchStreamFromDatabase(parsedData.stream.id);
              } else {
                // Check if stream data is recent (within last 2 hours)
                const streamCreatedAt = new Date(parsedData.stream?.created_at || 0);
                const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
                
                if (streamCreatedAt < twoHoursAgo) {
                  console.log('⏰ Stream data is stale, will need fresh keys');
                  toast.info('Stream data is older than 2 hours. You may want to generate fresh keys.');
                }
                
                streamDataToUse = parsedData;
              }
            } catch (error) {
              console.error('💥 Error parsing stored stream data:', error);
              throw new Error('Invalid stream data found');
            }
          } else {
            throw new Error('No stream data found. Please create a stream first.');
          }
        }
        
        if (streamDataToUse) {
          setStreamData(streamDataToUse);
          setStreamStateFromData(streamDataToUse);
        }
      } catch (error: any) {
        console.error('💥 Error loading stream data:', error);
        toast.error(error.message || 'Failed to load stream data');
        navigate('/create/stream');
        return;
      }
      
      setLoading(false);
    };

    loadStreamData();
  }, [hasWalletCapability, navigate, streamIdFromUrl, userUuid]);

  // Enhanced real-time subscription with immediate handling for ended streams
  useEffect(() => {
    if (!streamData?.stream?.id) return;

    console.log('🔄 Setting up enhanced real-time subscription for stream:', streamData.stream.id);

    // Add a small delay only for non-ended streams to prevent conflicts with initial load
    const subscriptionDelay = streamStatus === 'ended' ? 0 : 500;
    
    const subscriptionTimer = setTimeout(() => {
      const subscription = supabase
        .channel('stream-status-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'streams',
            filter: `id=eq.${streamData.stream.id}`
          },
          (payload) => {
            console.log('📡 Stream status updated via real-time:', payload);
            const newStatus = payload.new.status;
            const newStartedAt = payload.new.started_at;
            const newEndedAt = payload.new.ended_at;
            
            console.log('🔄 Real-time update details:', {
              oldStatus: streamStatus,
              newStatus,
              newStartedAt,
              newEndedAt,
              currentStartTime: startTime?.toISOString(),
              currentEndTime: endTime?.toISOString()
            });
            
            // Only update if the status actually changed to prevent unnecessary re-renders
            if (newStatus !== streamStatus) {
              console.log('📊 Status change detected, updating from', streamStatus, 'to', newStatus);
              
              React.startTransition(() => {
                setStreamStatus(newStatus);
                
                // Clear any existing errors when status changes successfully
                if (newStatus === 'active') {
                  setError('');
                  setIsStarting(false);
                  if (newStartedAt && (!startTime || new Date(newStartedAt).getTime() !== startTime.getTime())) {
                    const newStartTime = new Date(newStartedAt);
                    console.log('⏰ Setting startTime from real-time update:', newStartTime.toISOString());
                    setStartTime(newStartTime);
                    setEndTime(null);
                    toast.success('🎉 Stream is now live!', {
                      description: 'Your stream is broadcasting successfully'
                    });
                  }
                } else if (newStatus === 'ended' && newEndedAt) {
                  console.log('🛑 Stream ended via real-time, setting final state');
                  
                  // Calculate final duration if we have both times
                  if (newStartedAt && newEndedAt) {
                    const startedAtDate = new Date(newStartedAt);
                    const endedAtDate = new Date(newEndedAt);
                    
                    if (!isNaN(startedAtDate.getTime()) && !isNaN(endedAtDate.getTime())) {
                      const diffMs = endedAtDate.getTime() - startedAtDate.getTime();
                      const diffSeconds = Math.floor(diffMs / 1000);
                      const hours = Math.floor(diffSeconds / 3600);
                      const minutes = Math.floor((diffSeconds % 3600) / 60);
                      const seconds = diffSeconds % 60;
                      const finalDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                      
                      console.log('⏱️ Setting final duration from real-time:', finalDuration);
                      setStreamDuration(finalDuration);
                      setStartTime(startedAtDate);
                      setEndTime(endedAtDate);
                    }
                  } else {
                    setStartTime(null);
                    setEndTime(null);
                    setStreamDuration('00:00:00');
                  }
                  
                  setError('');
                  setIsStarting(false);
                  setIsStopping(false);
                  toast.info('📺 Stream has ended', {
                    description: 'Stream ended successfully and cannot be restarted'
                  });
                }
              });
            }
          }
        )
        .subscribe();

      return () => {
        console.log('🧹 Cleaning up real-time subscription');
        supabase.removeChannel(subscription);
      };
    }, subscriptionDelay);

    return () => {
      clearTimeout(subscriptionTimer);
    };
  }, [streamData?.stream?.id, streamStatus, startTime, endTime]);

  // Update stream duration timer - only for active streams, stop for ended streams
  useEffect(() => {
    if (streamStatus === 'ended') {
      console.log('⏱️ Stream ended, duration timer stopped');
      return;
    }
    
    if (!startTime || streamStatus !== 'active') {
      console.log('⏱️ Duration timer conditions not met:', {
        hasStartTime: !!startTime,
        streamStatus,
        startTimeISO: startTime?.toISOString()
      });
      return;
    }

    console.log('⏱️ Starting duration timer with startTime:', startTime.toISOString());

    const updateDuration = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      const newDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Only log every 10 seconds to avoid spam
      if (diff % 10 === 0) {
        console.log('⏱️ Duration update:', {
          startTime: startTime.toISOString(),
          now: now.toISOString(),
          diffSeconds: diff,
          duration: newDuration
        });
      }
      
      setStreamDuration(newDuration);
    };

    // Update immediately
    updateDuration();
    
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startTime, streamStatus]);

  const handleGenerateNewKeys = async () => {
    if (!streamData?.stream || !effectiveWalletAddress) {
      toast.error('No stream data or wallet address found');
      return;
    }
    
    // Check wallet authentication
    if (!hasWalletCapability) {
      toast.error('Wallet not connected or authenticated');
      return;
    }
    
    // Prevent generating keys for ended streams
    if (streamStatus === 'ended') {
      toast.error('Cannot generate new keys for an ended stream. Please create a new stream.');
      return;
    }
    
    setIsGeneratingKeys(true);
    setError('');
    setConnectionHealth('unknown');
    
    try {
      console.log('Generating fresh stream keys with enhanced error handling...');
      
      // Show progress feedback
      toast.info('🔄 Generating fresh stream keys...', {
        description: 'This may take a few moments'
      });
      
      const freshStreamData = await createLiveKitOBSStream({
        title: streamData.stream.title,
        description: streamData.stream.description,
        category: streamData.stream.category,
        language: streamData.stream.language,
        tags: streamData.stream.tags || [],
        walletAddress: effectiveWalletAddress,
        tokenContractAddress: streamData.stream.token_contract_address
      });

      // Update local state and sessionStorage with fresh data
      setStreamData(freshStreamData);
      setStreamStatus('idle');
      setStartTime(null);
      setEndTime(null);
      setStreamDuration('00:00:00');
      
      // Store fresh data in sessionStorage
      sessionStorage.setItem('livekitStreamData', JSON.stringify(freshStreamData));
      
      toast.success('✅ Fresh stream keys generated!', {
        description: 'New RTMP credentials are ready for OBS'
      });
      
    } catch (error: any) {
      console.error('Error generating fresh stream keys:', error);
      const errorMessage = error.message || 'Failed to generate fresh stream keys';
      setError(errorMessage);
      
      // Provide actionable error messages
      if (errorMessage.includes('timeout')) {
        toast.error('⏱️ Request timeout', {
          description: 'Please check your connection and try again'
        });
      } else if (errorMessage.includes('Service temporarily unavailable')) {
        toast.error('🔧 Service maintenance', {
          description: 'Streaming service is temporarily unavailable'
        });
      } else {
        toast.error('❌ Failed to generate keys', {
          description: errorMessage
        });
      }
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const handleStartStream = async () => {
    if (!streamData?.stream?.id) return;
    
    // Prevent starting ended streams
    if (streamStatus === 'ended') {
      toast.error('❌ Stream has ended', {
        description: 'This stream cannot be restarted. Please create a new stream.'
      });
      return;
    }
    
    // Prevent concurrent operations
    if (isStarting || isStopping) {
      toast.warning('⏳ Operation in progress', {
        description: 'Please wait for the current operation to complete'
      });
      return;
    }
    
    setIsStarting(true);
    setError('');
    
    try {
      console.log('Starting LiveKit OBS stream with enhanced error handling:', streamData.stream.id);
      
      // Show progress feedback
      toast.info('🚀 Starting your stream...', {
        description: 'This may take up to 30 seconds'
      });
      
      await startLiveKitOBSStream(streamData.stream.id);
      
      // Immediately check the database status to ensure UI updates
      console.log('Stream started successfully, checking database status...');
      try {
        const { data: statusData } = await supabase
          .from('streams')
          .select('status, started_at')
          .eq('id', streamData.stream.id)
          .single();
        
        if (statusData?.status === 'active') {
          console.log('Database confirms stream is active, updating UI...');
          setStreamStatus('active');
          setIsStarting(false);
          if (statusData.started_at && !startTime) {
            setStartTime(new Date(statusData.started_at));
          }
          toast.success('🎉 Stream is now live!', {
            description: 'Your stream is broadcasting successfully'
          });
        }
      } catch (statusError) {
        console.error('Error checking stream status after start:', statusError);
        // Don't fail the entire operation, real-time subscription will handle it
      }
      
    } catch (error: any) {
      console.error('Error starting stream:', error);
      const errorMessage = error.message || 'Failed to start stream';
      setError(errorMessage);
      setIsStarting(false); // Only clear starting state on error
      
      // Provide specific error guidance
      if (errorMessage.includes('too old')) {
        toast.error('⏰ Stream expired', {
          description: 'Please generate fresh keys and try again'
        });
      } else if (errorMessage.includes('timeout')) {
        toast.error('⏱️ Connection timeout', {
          description: 'Please check OBS is running and try again'
        });
      } else if (errorMessage.includes('Service temporarily unavailable')) {
        toast.error('🔧 Service issues', {
          description: 'Streaming service is experiencing problems'
        });
      } else {
        toast.error('❌ Failed to start stream', {
          description: errorMessage
        });
      }
    }
  };

  const handleStopStream = async () => {
    if (!streamData?.stream?.id) return;
    
    // Prevent concurrent operations
    if (isStarting || isStopping) {
      toast.warning('⏳ Operation in progress', {
        description: 'Please wait for the current operation to complete'
      });
      return;
    }
    
    setIsStopping(true);
    setError('');
    
    try {
      console.log('Stopping LiveKit OBS stream with graceful shutdown:', streamData.stream.id);
      
      // Show progress feedback
      toast.info('🛑 Stopping your stream...', {
        description: 'Safely terminating OBS connection...'
      });
      
      await stopLiveKitOBSStream(streamData.stream.id);
      
      toast.success('✅ Stream stopped successfully', {
        description: 'OBS connection terminated safely. Stream ended.'
      });
      
      // Show info about creating new stream after a brief delay
      setTimeout(() => {
        toast.info('💡 Ready for your next stream?', {
          description: 'Create a new stream to broadcast again'
        });
      }, 3000);
      
    } catch (error: any) {
      console.error('Error stopping stream:', error);
      const errorMessage = error.message || 'Failed to stop stream';
      setError(errorMessage);
      
      // Even if stop fails, inform user about potential OBS issues
      toast.error('⚠️ Stream stop issues', {
        description: 'If OBS is unresponsive, please restart the application'
      });
    } finally {
      setIsStopping(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard!`);
    });
  };

  const getStatusBadge = () => {
    if (isStarting) {
      return <Badge className="bg-yellow-500 text-white">Starting...</Badge>;
    }
    if (isStopping) {
      return <Badge className="bg-orange-500 text-white">Stopping...</Badge>;
    }
    
    switch (streamStatus) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Live</Badge>;
      case 'idle':
        return <Badge className="bg-blue-500 text-white">Ready</Badge>;
      case 'ended':
        return <Badge className="bg-red-500 text-white">Ended</Badge>;
      default:
        return <Badge className="bg-blue-500 text-white">Ready</Badge>;
    }
  };

  const getStreamAge = () => {
    if (!streamData?.stream?.created_at) return null;
    
    const createdAt = new Date(streamData.stream.created_at);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffMinutes / 1440)}d ago`;
    }
  };

  const getConnectionStatusBadge = () => {
    if (connectionHealth === 'unknown') return null;
    
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className={`w-2 h-2 rounded-full ${
          connectionHealth === 'healthy' ? 'bg-green-400' : 'bg-red-400'
        }`} />
        <span className="text-white/70">
          Connection: {connectionHealth}
          {lastHealthCheck && (
            <span className="ml-1">
              ({Math.round((Date.now() - lastHealthCheck.getTime()) / 1000)}s ago)
            </span>
          )}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 pt-24 md:pt-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-white/70">Loading stream data...</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!streamData) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 pt-24 md:pt-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <p className="text-white mb-4">No stream data found</p>
              <Button onClick={() => navigate('/create/stream')}>
                Create New Stream
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 pt-24 md:pt-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/create/stream')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Stream Creation
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Monitor className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-white">Low-Latency RTMP</h1>
              <p className="text-white/70">Stream with OBS to LiveKit</p>
            </div>
          </div>

          {/* Enhanced Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium">Stream Error</p>
                <p className="text-white/70 text-sm">{error}</p>
                {error.includes('timeout') && (
                  <div className="mt-2 text-xs text-white/60">
                    💡 Tip: Make sure OBS is running and check your internet connection
                  </div>
                )}
                {error.includes('OBS is unresponsive') && (
                  <div className="mt-2 text-xs text-white/60">
                    💡 Tip: You may need to restart OBS Studio
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stream Ended Notice */}
          {streamStatus === 'ended' && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Stream Ended</p>
                <p className="text-white/70 text-sm">
                  This stream has ended and cannot be restarted. The final duration was {streamDuration}.
                </p>
                <Button
                  onClick={() => navigate('/create/stream')}
                  className="mt-3 bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Stream
                </Button>
              </div>
            </div>
          )}

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Stream Settings & Controls */}
            <div className="space-y-6">
              {/* Enhanced Stream Status Card */}
              <Card className="bg-secondary/50 border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      Stream Status
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge()}
                      {getStreamAge() && (
                        <span className="text-white/50 text-xs">Created {getStreamAge()}</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-white/70" />
                      <span className="text-white/70">Duration:</span>
                      <span className="text-white font-mono">{streamDuration}</span>
                      {streamStatus === 'ended' && (
                        <span className="text-white/50 text-xs">(Final)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-white/70" />
                      <span className="text-white/70">Status:</span>
                      <span className="text-white capitalize">{isStarting ? 'starting' : isStopping ? 'stopping' : streamStatus}</span>
                    </div>
                  </div>
                  
                  {/* Connection Health Status */}
                  {getConnectionStatusBadge()}
                  
                  <div className="flex gap-2">
                    {streamStatus === 'idle' && !isStarting && !isStopping ? (
                      <Button
                        onClick={handleStartStream}
                        className="bg-green-500 hover:bg-green-600 text-white"
                        disabled={isStarting || isStopping}
                      >
                        🚀 Go Live!
                      </Button>
                    ) : streamStatus === 'active' && !isStarting && !isStopping ? (
                      <Button
                        onClick={handleStopStream}
                        variant="destructive"
                        disabled={isStopping || isStarting}
                      >
                        🛑 Stop Stream
                      </Button>
                    ) : isStarting ? (
                      <Button disabled className="bg-yellow-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting Stream...
                      </Button>
                    ) : isStopping ? (
                      <Button disabled className="bg-orange-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Stopping Stream...
                      </Button>
                    ) : streamStatus === 'ended' ? (
                      <Button
                        onClick={() => navigate('/create/stream')}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Stream
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartStream}
                        className="bg-green-500 hover:bg-green-600 text-white"
                        disabled={isStarting || isStopping}
                      >
                        🔄 Restart Stream
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* OBS/RTMP Configuration Card */}
              <StreamKeyManager
                streamData={streamData}
                isGeneratingKeys={isGeneratingKeys}
                onGenerateNewKeys={handleGenerateNewKeys}
                onCopyToClipboard={copyToClipboard}
                streamStatus={streamStatus}
                streamAge={getStreamAge()}
              />
            </div>

            {/* Right Column - Live Preview and Chat */}
            <div className="space-y-6">
              <Card className="bg-secondary/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="aspect-video rounded-lg overflow-hidden">
                    {streamStatus !== 'ended' ? (
                      <LiveKitStreamPlayer 
                        roomName={streamData.room_name}
                        className="w-full h-full"
                        showControls={true}
                      />
                    ) : (
                      <div className="w-full h-full bg-black rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                          <h3 className="text-xl font-medium text-white mb-2">Stream Ended</h3>
                          <p className="text-white/70">This stream has permanently ended</p>
                          <p className="text-white/50 text-sm mt-2">Final duration: {streamDuration}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Chat Box */}
              {streamData?.stream?.id && (
                <Card className="bg-secondary/50 border-white/10">
                  <CardContent className="p-0">
                    <div className="h-[500px]">
                      <ChatBox 
                        streamId={streamData.stream.id}
                        streamCreatorWallet={effectiveWalletAddress}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OBSStreamingV2;
