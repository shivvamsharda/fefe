
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import MuxPlayer from '@/components/stream/MuxPlayer';
import StreamInteraction from '@/components/stream/StreamInteraction';
import { supabase } from '@/integrations/supabase/client';
import { refreshSingleVodDuration } from '@/services/vodService';
import { Loader2, Video, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useVodViewStats } from '@/hooks/useVodViewStats';
import { Eye, Clock } from 'lucide-react';


const VodView = () => {
  const { playbackId } = useParams<{ playbackId: string }>();
  const queryClient = useQueryClient();

  // Get current user for session tracking
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      // Try to get wallet session from localStorage
      const walletSession = localStorage.getItem('wallet_session');
      if (!walletSession) return null;
      
      try {
        const sessionData = JSON.parse(walletSession);
        const walletAddress = sessionData.wallet_address;
        
        if (!walletAddress) return null;
        
        // Get user profile from wallet address
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, username, wallet_address')
          .eq('wallet_address', walletAddress)
          .single();
        
        return profile;
      } catch (error) {
        console.error('Error getting current user:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Updated query to fetch VOD data with user profile and creator profile
  const { data: vodData, isLoading, error } = useQuery({
    queryKey: ['vod', playbackId],
    queryFn: async () => {
      if (!playbackId) throw new Error('No playback ID provided');
      
      const { data, error } = await supabase
        .from('vods')
        .select(`
          *,
          user_profiles!vods_user_id_fkey (
            id,
            username,
            display_name,
            wallet_address
          ),
          streams!vods_original_stream_id_fkey (
            id,
            category,
            language
          )
        `)
        .eq('mux_playback_id', playbackId)
        .eq('deleted_by_user', false)
        .single();

      if (error) throw error;

      // Fetch creator profile separately using wallet address
      let creatorProfile = null;
      if (data?.user_profiles?.wallet_address) {
        const { data: profile } = await supabase
          .from('creator_profiles')
          .select('profile_picture_url, display_name')
          .eq('wallet_address', data.user_profiles.wallet_address)
          .single();

        creatorProfile = profile;
      }

      return { vod: data, creatorProfile };
    },
    enabled: !!playbackId,
  });

  const vod = vodData?.vod;
  const creatorProfile = vodData?.creatorProfile;

  // Add view stats query
  const { data: viewStats } = useVodViewStats(vod?.id || '');

  // Auto-refresh duration when page loads (silently)
  const { } = useQuery({
    queryKey: ['refresh-vod-duration', playbackId],
    queryFn: async () => {
      if (!vod) return null;
      console.log('Auto-refreshing VOD duration silently...');
      const success = await refreshSingleVodDuration(vod.id, true); // silent = true
      if (success) {
        // Refetch the VOD data to get updated duration
        queryClient.invalidateQueries({ queryKey: ['vod', playbackId] });
      }
      return success;
    },
    enabled: !!vod,
    staleTime: 5 * 60 * 1000, // Only refresh every 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading video...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !vod) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Video Not Found</h2>
              <p className="text-muted-foreground">
                The video you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const createdDate = new Date(vod.created_at);
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });

  // Helper function to format duration properly
  const formatDuration = (durationInSeconds: number) => {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };

  const creatorInfo = {
    username: vod.user_profiles?.username || 'anonymous',
    display_name: creatorProfile?.display_name || vod.user_profiles?.display_name || vod.user_profiles?.username || 'Unknown Creator',
    avatar_url: creatorProfile?.profile_picture_url || null,
    wallet_address: vod.user_profiles?.wallet_address
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Video and description section */}
            <div className="lg:col-span-3">
              <div className="aspect-video mb-6 bg-black rounded-lg overflow-hidden">
                <MuxPlayer
                  playbackId={vod.mux_playback_id}
                  title={vod.title}
                  isLive={false}
                  vodId={vod.id}
                  userId={currentUser?.id}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <h1 className="text-2xl font-bold mb-4">{vod.title}</h1>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <Link 
                      to={`/creator/${vod.user_profiles?.id}`}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={creatorInfo.avatar_url || undefined}
                          alt={creatorInfo.username || 'Creator'}
                        />
                        <AvatarFallback className="bg-black/50 text-white/70">
                          {creatorInfo.display_name?.charAt(0) || creatorInfo.username?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {creatorInfo.display_name}
                        </p>
                      </div>
                    </Link>
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{timeAgo}</span>
                    </div>

                    {/* Use simplified total views from database */}
                    {viewStats && viewStats.totalViews > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>{viewStats.totalViews} views</span>
                      </div>
                    )}
                  </div>

                  {vod.description && (
                    <div className="bg-card rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {vod.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1">
                  <div className="bg-card rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Video Details</h3>
                    <div className="space-y-3">
                      {vod.streams?.category && (
                        <div>
                          <span className="text-muted-foreground">Category:</span>
                          <span className="ml-2 font-medium">{vod.streams.category}</span>
                        </div>
                      )}
                      {vod.streams?.language && (
                        <div>
                          <span className="text-muted-foreground">Language:</span>
                          <span className="ml-2 font-medium">{vod.streams.language}</span>
                        </div>
                      )}
                      {vod.duration && (
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="ml-2 font-medium">
                            {formatDuration(vod.duration)}
                          </span>
                        </div>
                      )}

                      {/* Show total watch time */}
                      {viewStats && viewStats.totalWatchTime > 0 && (
                        <div>
                          <span className="text-muted-foreground">Total Watch Time:</span>
                          <span className="ml-2 font-medium">
                            {formatDuration(viewStats.totalWatchTime)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stream interaction section - now using unified component */}
            <div className="lg:col-span-1">
              <div className="h-[500px]">
                <StreamInteraction
                  streamId={vod.original_stream_id || vod.id}
                  creatorName={creatorInfo.username}
                  creatorWallet={creatorInfo.wallet_address}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VodView;
