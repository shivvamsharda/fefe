import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import PromotedStreamPlayer from '@/components/promote/PromotedStreamPlayer';
import TwitchChat from '@/components/promote/TwitchChat';
import KickChat from '@/components/promote/KickChat';
import YouTubeChat from '@/components/promote/YouTubeChat';
import YouTubeSubscribe from '@/components/promote/YouTubeSubscribe';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/context/WalletContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePromotedStreamHeartbeat } from '@/hooks/usePromotedStreamHeartbeat';
import { 
  ArrowLeft,
  AlertCircle,
  Star
} from 'lucide-react';

const PromotedStreamView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { connected, publicKey, userUuid } = useWallet();
  const isMobile = useIsMobile();

  // Track viewing for points (only for authenticated users)
  usePromotedStreamHeartbeat(id, userUuid, connected);

  console.log('PromotedStreamView - ID from params:', id);

  // Fetch promoted stream data with proper relationships
  const { 
    data: promotedStream, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['promoted-stream', id],
    queryFn: async () => {
      if (!id) {
        console.error('No promoted stream ID provided');
        throw new Error("Promoted stream ID is required");
      }
      
      console.log('Fetching promoted stream with ID:', id);
      
      const { data, error } = await supabase
        .from('promoted_streams')
        .select(`
          id,
          stream_title,
          stream_url,
          description,
          thumbnail_url,
          category,
          tags,
          placement_type,
          wallet_address,
          viewer_count,
          embed_url,
          stream_platform,
          base_payment_expires_at,
          created_at,
          is_active,
          creator_user_id,
          user_profiles (
            id,
            username,
            display_name,
            avatar_url,
            wallet_address,
            creator_profiles (
              profile_picture_url,
              display_name
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching promoted stream:", error);
        console.error("Error details:", { code: error.code, message: error.message, details: error.details });
        throw error;
      }

      console.log('Promoted stream data received:', data);
      
      // Generate proper embed URL if needed (especially for Twitch)
      let finalEmbedUrl = data.embed_url || data.stream_url;
      if (data.stream_platform === 'twitch') {
        try {
          const { data: embedData, error: embedError } = await supabase.functions.invoke('generate-embed-url', {
            body: {
              streamUrl: data.stream_url,
              platform: data.stream_platform,
              referer: window.location.origin
            }
          });
          
          if (!embedError && embedData?.embedUrl) {
            finalEmbedUrl = embedData.embedUrl;
          }
        } catch (embedError) {
          console.error('Failed to generate proper embed URL:', embedError);
        }
      }
      
      return {
        ...data,
        embed_url: finalEmbedUrl
      };
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 pt-24 md:pt-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-foreground/70">Loading promoted stream...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !promotedStream) {
    console.error('Error or no promoted stream:', { error, promotedStream });
    
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 pt-24 md:pt-8">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500/50" />
            <h2 className="text-2xl font-bold mb-4">Promoted Stream Not Found</h2>
            <p className="text-foreground/70 mb-6">
              The promoted stream you're looking for doesn't exist or has been removed.
            </p>
            <div className="space-y-2 text-sm text-foreground/60 mb-6">
              <p>Searched for ID: {id}</p>
              {error && (
                <p>Error: {error.message}</p>
              )}
            </div>
            <Button 
              onClick={() => navigate('/')}
              className="bg-primary hover:bg-primary/90"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to Home
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const userProfile = promotedStream.user_profiles;
  const creatorProfile = userProfile?.creator_profiles;
  
  // Determine creator name with fallback logic
  let creatorName = 'Anonymous';
  if (creatorProfile?.display_name) {
    creatorName = creatorProfile.display_name;
  } else if (userProfile?.display_name) {
    creatorName = userProfile.display_name;
  } else if (userProfile?.username) {
    creatorName = userProfile.username;
  } else if (promotedStream.wallet_address) {
    creatorName = promotedStream.wallet_address.slice(0, 8) + '...';
  }

  // Determine avatar with fallback logic
  let avatar = `https://placehold.co/100x100/212121/FFFFFF?text=${promotedStream.stream_title.substring(0, 2).toUpperCase()}`;
  if (creatorProfile?.profile_picture_url) {
    avatar = creatorProfile.profile_picture_url;
  } else if (userProfile?.avatar_url) {
    avatar = userProfile.avatar_url;
  }

  // Extract Twitch channel name for chat
  const getTwitchChannelName = (streamUrl: string): string | null => {
    const match = streamUrl.match(/twitch\.tv\/([^/?]+)/);
    return match ? match[1] : null;
  };

  // Extract Kick channel name for chat
  const getKickChannelName = (streamUrl: string): string | null => {
    const match = streamUrl.match(/kick\.com\/([^/?]+)/);
    return match ? match[1] : null;
  };

  // Extract YouTube video ID for chat
  const getYouTubeVideoId = (streamUrl: string): string | null => {
    // Handle youtube.com/watch?v= format
    const watchMatch = streamUrl.match(/youtube\.com\/watch\?v=([^&]+)/);
    if (watchMatch) return watchMatch[1];
    
    // Handle youtu.be/ format
    const shortMatch = streamUrl.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) return shortMatch[1];
    
    return null;
  };

  // Extract YouTube channel name for subscribe button
  const getYouTubeChannelName = (streamUrl: string): string | null => {
    // Handle youtube.com/c/ or youtube.com/channel/ or youtube.com/@username format
    const channelMatch = streamUrl.match(/youtube\.com\/(?:c\/|channel\/|@)([^/?]+)/);
    if (channelMatch) return channelMatch[1];
    
    // Handle youtube.com/user/ format (legacy)
    const userMatch = streamUrl.match(/youtube\.com\/user\/([^/?]+)/);
    if (userMatch) return userMatch[1];
    
    return null;
  };

  const isTwitch = promotedStream.stream_platform === 'twitch';
  const isKick = promotedStream.stream_platform === 'kick';
  const isYouTube = promotedStream.stream_platform === 'youtube';
  const twitchChannelName = isTwitch ? getTwitchChannelName(promotedStream.stream_url) : null;
  const kickChannelName = isKick ? getKickChannelName(promotedStream.stream_url) : null;
  const youtubeVideoId = isYouTube ? getYouTubeVideoId(promotedStream.stream_url) : null;
  const youtubeChannelName = isYouTube ? getYouTubeChannelName(promotedStream.stream_url) : null;
  const parentDomain = window.location.hostname;

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-4 pt-20 md:pt-8">
          <div className="max-w-7xl mx-auto">
            {/* Video Player and Chat Layout */}
            {((isTwitch && twitchChannelName) || (isKick && kickChannelName) || (isYouTube && youtubeVideoId)) && !isMobile ? (
              <div className="grid grid-cols-3 gap-6">
                {/* Video Player - 2/3 width */}
                <div className="col-span-2">
                  <PromotedStreamPlayer
                    embedUrl={promotedStream.embed_url || promotedStream.stream_url}
                    platform={promotedStream.stream_platform || 'unknown'}
                    streamUrl={promotedStream.stream_url}
                    title={promotedStream.stream_title}
                  />
                </div>
                {/* Chat - 1/3 width */}
                <div className="col-span-1 h-[400px] md:h-[500px] lg:h-[600px]">
                  {isTwitch && twitchChannelName && (
                    <TwitchChat 
                      channelName={twitchChannelName}
                      parentDomain={parentDomain}
                    />
                  )}
                  {isKick && kickChannelName && (
                    <KickChat 
                      channelName={kickChannelName}
                    />
                  )}
                  {isYouTube && youtubeVideoId && (
                    <YouTubeChat 
                      videoId={youtubeVideoId}
                      channelName={youtubeChannelName}
                    />
                  )}
                </div>
              </div>
            ) : (
              /* Regular Single Column Layout */
              <div className="w-full">
                <PromotedStreamPlayer
                  embedUrl={promotedStream.embed_url || promotedStream.stream_url}
                  platform={promotedStream.stream_platform || 'unknown'}
                  streamUrl={promotedStream.stream_url}
                  title={promotedStream.stream_title}
                />
                {/* Mobile Chat */}
                {isMobile && (
                  <div className="mt-4 h-[300px]">
                    {isTwitch && twitchChannelName && (
                      <TwitchChat 
                        channelName={twitchChannelName}
                        parentDomain={parentDomain}
                      />
                    )}
                    {isKick && kickChannelName && (
                      <KickChat 
                        channelName={kickChannelName}
                      />
                    )}
                    {isYouTube && youtubeVideoId && (
                      <YouTubeChat 
                        videoId={youtubeVideoId}
                        channelName={youtubeChannelName}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stream Info - Directly under the player with no gap */}
            <div className="space-y-4">
              {/* Stream Title with Promoted Badge */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-md">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    <span>LIVE</span>
                  </div>
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                    <Star className="w-3 h-3 mr-1" />
                    PROMOTED
                  </Badge>
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {promotedStream.stream_title}
                </h1>
              </div>

              {/* Description */}
              {promotedStream.description && (
                <div className="text-foreground/80 text-sm leading-relaxed">
                  {promotedStream.description}
                </div>
              )}

              {/* Creator Info */}
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={avatar} alt={creatorName} />
                  <AvatarFallback>{creatorName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  {userProfile?.id ? (
                    <Link 
                      to={`/creator/${userProfile.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {creatorName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-foreground">{creatorName}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PromotedStreamView;
