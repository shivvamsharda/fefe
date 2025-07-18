import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import MuxPlayer from '@/components/stream/MuxPlayer';
import StreamInteraction from '@/components/stream/StreamInteraction';
import DonationNotification from '@/components/stream/DonationNotification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/context/WalletContext';
import { useViewerHeartbeat } from '@/hooks/useViewerHeartbeat';
import { useCachedViewerCount } from '@/hooks/useCachedViewerCount';
import { useDonationNotifications } from '@/hooks/useDonationNotifications';
import { toast } from 'sonner';
import { 
  Users, 
  Heart, 
  Share2, 
  Calendar,
  Clock,
  Eye,
  ArrowLeft,
  AlertCircle,
  PlayCircle,
  ExternalLink,
  Copy
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import FollowButton from '@/components/follow/FollowButton';
import { useIsMobile } from '@/hooks/use-mobile';
import LiveKitStreamPlayer from '@/components/stream/LiveKitStreamPlayer';


const StreamView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [hasJoinedAsViewer, setHasJoinedAsViewer] = useState(false);
  const isMobile = useIsMobile();
  const playerRef = useRef<HTMLDivElement>(null);

  // Fetch donation notifications
  const currentDonation = useDonationNotifications(id || '');

  // Fetch stream data
  const { 
    data: stream, 
    isLoading, 
    error,
    refetch: refetchStream 
  } = useQuery({
    queryKey: ['stream', id],
    queryFn: async () => {
      if (!id) throw new Error("Stream ID is required");
      const { data, error } = await supabase
        .from('streams')
        .select(`
          *,
          user_profiles (
            id,
            username,
            avatar_url,
            wallet_address,
            creator_profiles (
              profile_picture_url
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching stream:", error);
        throw error;
      }
      return data;
    },
    retry: false,
  });

  // Fetch viewer count
  const { 
    viewerCount, 
    isLoading: isLoadingViewerCount 
  } = useCachedViewerCount(id, true, stream?.status === 'active');

  // Viewer heartbeat hook
  useViewerHeartbeat(id);

  // Fetch user profile ID
  useEffect(() => {
    async function fetchUserProfile() {
      if (connected && publicKey) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', publicKey.toString())
          .single();
        
        if (data?.id) {
          setViewerId(data.id);
        }
      }
    }
    
    fetchUserProfile();
  }, [connected, publicKey]);

  // Join as viewer effect - using user_watch_sessions instead of stream_viewers
  useEffect(() => {
    async function joinStreamAsViewer() {
      if (!id || !viewerId || hasJoinedAsViewer) return;

      try {
        const { error } = await supabase
          .from('user_watch_sessions')
          .insert([{ 
            stream_id: id, 
            user_id: viewerId, 
            session_type: 'stream'
          }]);

        if (error) {
          console.error("Error joining stream as viewer:", error);
          toast.error("Failed to join stream as viewer");
        } else {
          setHasJoinedAsViewer(true);
          console.log("Successfully joined stream as viewer");
        }
      } catch (error) {
        console.error("Error joining stream as viewer:", error);
        toast.error("Failed to join stream as viewer");
      }
    }

    joinStreamAsViewer();

    return () => {
      // Clean-up function (end watch session)
      async function endWatchSession() {
        if (!id || !viewerId) return;

        try {
          const { error } = await supabase
            .from('user_watch_sessions')
            .update({ 
              ended_at: new Date().toISOString(),
              is_active: false 
            })
            .eq('stream_id', id)
            .eq('user_id', viewerId)
            .eq('is_active', true);

          if (error) {
            console.error("Error ending watch session:", error);
          } else {
            console.log("Successfully ended watch session");
          }
        } catch (error) {
          console.error("Error ending watch session:", error);
        }
      }

      endWatchSession();
    };
  }, [id, viewerId, hasJoinedAsViewer]);

  const handleCopyContractAddress = (address: string) => {
    navigator.clipboard.writeText(address)
      .then(() => {
        toast.success('Contract address copied!');
      })
      .catch(err => {
        console.error("Failed to copy text: ", err);
        toast.error('Failed to copy address');
      });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 pt-24 md:pt-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-solana mx-auto mb-4"></div>
              <p className="text-white/70">Loading stream...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !stream) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 pt-24 md:pt-8">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500/50" />
            <h2 className="text-2xl font-bold mb-4">Stream Not Found</h2>
            <p className="text-white/70 mb-6">
              The stream you're looking for doesn't exist or has been removed.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-solana hover:bg-solana/90"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to Home
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const isLive = stream.status === 'active';
  const isCompleted = stream.status === 'completed';
  const isLiveKitStream = stream.source_type === 'livekit';

  // Get profile picture with proper fallback logic
  const getProfilePicture = () => {
    return stream.user_profiles?.creator_profiles?.profile_picture_url || stream.user_profiles?.avatar_url;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Donation notification overlay */}
        <DonationNotification donation={currentDonation} />
        
        {/* Mobile-optimized layout - no forced scrolling */}
        <div className="container mx-auto px-4 py-4 pt-20 md:pt-8">
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-4'}`}>
            {/* Main content area */}
            <div className={`space-y-6 ${isMobile ? 'order-1' : 'lg:col-span-3'}`}>
              {/* Stream player */}
              <div ref={playerRef} className="relative">
                <Card className="bg-black/40 border-white/10 overflow-hidden">
                  <CardContent className="p-0">
                    {isLiveKitStream ? (
                      // LiveKit stream player
                      stream.livekit_room_name && (isLive || isCompleted) ? (
                        <LiveKitStreamPlayer 
                          roomName={stream.livekit_room_name}
                          title={stream.title}
                          className="aspect-video"
                        />
                      ) : (
                        <div className="aspect-video flex items-center justify-center bg-black">
                          <div className="text-center">
                            <PlayCircle className="w-16 h-16 mx-auto mb-4 text-white/30" />
                            <h3 className="text-xl font-medium mb-2">LiveKit Stream Offline</h3>
                            <p className="text-white/70">This LiveKit stream is not currently live</p>
                          </div>
                        </div>
                      )
                    ) : (
                      // Existing Mux player logic
                      stream.playback_id && (isLive || isCompleted) ? (
                        <MuxPlayer 
                          playbackId={stream.playback_id}
                          title={stream.title}
                          isLive={isLive}
                          insetMode={false}
                        />
                      ) : (
                        <div className="aspect-video flex items-center justify-center bg-black">
                          <div className="text-center">
                            <PlayCircle className="w-16 h-16 mx-auto mb-4 text-white/30" />
                            <h3 className="text-xl font-medium mb-2">Stream Offline</h3>
                            <p className="text-white/70">This stream is not currently live</p>
                          </div>
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Stream info with integrated creator information */}
              <Card className="bg-black/40 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-2xl font-bold">{stream.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {isLive ? 'Live' : isCompleted ? 'Completed' : 'Offline'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Viewer count */}
                  <div className="text-white/70 flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>
                      {isLoadingViewerCount ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        `${viewerCount} Viewers`
                      )}
                    </span>
                  </div>

                  {/* Creator information */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      {getProfilePicture() ? (
                        <AvatarImage src={getProfilePicture()} alt={stream.user_profiles?.username || 'Creator'} />
                      ) : (
                        <AvatarFallback>{stream.user_profiles?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <Link 
                            to={`/creator/${stream.user_profiles?.id}`}
                            className="font-semibold text-white hover:text-primary transition-colors"
                          >
                            {stream.user_profiles?.username || 'Unknown Creator'}
                          </Link>
                          <p className="text-white/60 text-sm">
                            {stream.user_profiles?.wallet_address?.substring(0, 6)}...{stream.user_profiles?.wallet_address?.substring(stream.user_profiles?.wallet_address.length - 4)}
                          </p>
                        </div>
                        {/* Follow button next to creator name */}
                        {stream.user_profiles?.id && (
                          <FollowButton 
                            creatorUserId={stream.user_profiles.id} 
                            variant="outline"
                            size="sm"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stream description */}
                  {stream.description && (
                    <p className="text-white/70">{stream.description}</p>
                  )}

                  {/* Token Contract Address */}
                  {stream.token_contract_address && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-primary">Token Contract</h4>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyContractAddress(stream.token_contract_address)}
                            className="h-8 px-2"
                          >
                            <Copy size={14} />
                          </Button>
                          <a
                            href={`https://dexscreener.com/solana/${stream.token_contract_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex"
                          >
                            <Button size="sm" variant="outline" className="h-8 px-3">
                              <ExternalLink size={14} className="mr-1" />
                              Dexscreener
                            </Button>
                          </a>
                        </div>
                      </div>
                      <p className="text-white/80 font-mono text-sm break-all">
                        {stream.token_contract_address}
                      </p>
                    </div>
                  )}

                  {/* Creation time */}
                  <div className="flex items-center text-white/70">
                    <Calendar className="mr-2 h-4 w-4" />
                    Created{' '}
                    {formatDistanceToNow(new Date(stream.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className={`space-y-6 ${isMobile ? 'order-2' : ''}`}>
              {/* Combined Chat & Donation Panel */}
              {id && (
                <StreamInteraction 
                  streamId={id}
                  creatorName={stream.user_profiles?.username || 'Creator'}
                  creatorWallet={stream.user_profiles?.wallet_address}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StreamView;
