import React, { useEffect, useMemo, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import StreamCard from '../components/stream/StreamCard';
import VideoHeroSection from '../components/home/VideoHeroSection';
import StaticHeroMobile from '../components/home/StaticHeroMobile';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Loader2, Clock, Upload, TrendingUp, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { getActiveStreams, getVods } from '@/services/streamService';
import { getUploadedVideosWithCreators } from '@/services/uploadedVideoService';
import { getLiveSpaces } from '@/services/spacesV2Service';
import { getActivePromotedStreams } from '@/services/promotedStreamIntegrationService';
import PromotedStreamCard from '@/components/promote/PromotedStreamCard';
import type { SpaceV2 } from '@/services/spacesV2Service';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import type { CreatorProfile } from '@/services/creatorProfileService';
import { toast } from 'sonner';

type NestedUserProfile = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  wallet_address?: string | null;
} | null | undefined;

type LiveStreamData = {
  id: string;
  title: string;
  thumbnail?: string | null;
  viewer_count?: number | null;
  category?: string | null;
  user_profiles: NestedUserProfile;
};

type VodData = {
  id: string;
  mux_playback_id: string;
  title?: string | null;
  thumbnail_url?: string | null;
  user_profiles: NestedUserProfile;
  streams?: { category?: string | null } | null;
};

// Define proper types for space host queries
type SpaceHostUserProfile = {
  id: string;
  wallet_address: string;
  username?: string;
  avatar_url?: string;
};

type SpaceHostCreatorProfile = {
  wallet_address: string;
  display_name: string;
  profile_picture_url: string;
  subscription_enabled: boolean;
  subscription_price_sol?: number | null;
};

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Add promoted streams query
  const {
    data: promotedStreamsData,
    isLoading: promotedStreamsLoading,
    error: promotedStreamsError,
    refetch: refetchPromotedStreams
  } = useQuery({
    queryKey: ['promotedStreams'],
    queryFn: getActivePromotedStreams,
    refetchInterval: 30000,
    staleTime: 25000,
  });

  const {
    data: liveStreamsData, 
    isLoading: liveStreamsLoading, 
    error: liveStreamsError,
    refetch: refetchLiveStreams
  } = useQuery<LiveStreamData[]>({
    queryKey: ['activeStreams'],
    queryFn: getActiveStreams,
    refetchInterval: 30000, // Increased from 15s to 30s
    staleTime: 25000, // Allow 25s before considering stale
  });

  const {
    data: vodsData,
    isLoading: vodsLoading,
    error: vodsError,
    refetch: refetchVods
  } = useQuery<VodData[]>({
    queryKey: ['vods'],
    queryFn: () => getVods(8),
    refetchInterval: 120000, // Increased from 60s to 120s
    staleTime: 100000, // Allow 100s before considering stale
  });

  const {
    data: uploadedVideosData,
    isLoading: uploadedVideosLoading,
    error: uploadedVideosError,
    refetch: refetchUploadedVideos
  } = useQuery({
    queryKey: ['uploadedVideos'],
    queryFn: () => getUploadedVideosWithCreators(8),
    refetchInterval: 180000, // 3 minutes
    staleTime: 150000, // Allow 150s before considering stale
  });

  // Add query for live spaces with proper typing
  const {
    data: liveSpacesData,
    isLoading: liveSpacesLoading,
    error: liveSpacesError
  } = useQuery<SpaceV2[]>({
    queryKey: ['liveSpacesV2'],
    queryFn: getLiveSpaces,
    refetchInterval: 30000,
    staleTime: 25000,
  });

  // Get host user profiles for spaces
  const spaceHostUserIds = useMemo(() => {
    const ids = new Set<string>();
    liveSpacesData?.forEach(space => {
      if (space.host_user_id) ids.add(space.host_user_id);
    });
    return Array.from(ids);
  }, [liveSpacesData]);

  const { data: spaceHostProfilesData } = useQuery<SpaceHostUserProfile[]>({
    queryKey: ['spaceHostProfiles', spaceHostUserIds],
    queryFn: async (): Promise<SpaceHostUserProfile[]> => {
      if (!spaceHostUserIds || spaceHostUserIds.length === 0) {
        return [];
      }
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, wallet_address, username, avatar_url')
        .in('id', spaceHostUserIds);
      
      if (error) {
        console.error('Error fetching space host profiles:', error);
        return []; 
      }
      return (data || []).map(profile => ({
        id: profile.id,
        wallet_address: profile.wallet_address,
        username: profile.username || undefined,
        avatar_url: profile.avatar_url || undefined,
      }));
    },
    enabled: spaceHostUserIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Get host wallet addresses to fetch creator profiles
  const spaceHostWalletAddresses = useMemo(() => {
    const addresses = new Set<string>();
    if (spaceHostProfilesData) {
      spaceHostProfilesData.forEach(profile => {
        if (profile.wallet_address) addresses.add(profile.wallet_address);
      });
    }
    return Array.from(addresses);
  }, [spaceHostProfilesData]);

  const { data: spaceHostCreatorProfilesData } = useQuery<SpaceHostCreatorProfile[]>({
    queryKey: ['spaceHostCreatorProfiles', spaceHostWalletAddresses],
    queryFn: async (): Promise<SpaceHostCreatorProfile[]> => {
      if (!spaceHostWalletAddresses || spaceHostWalletAddresses.length === 0) {
        return [];
      }
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('wallet_address, display_name, profile_picture_url, subscription_enabled, subscription_price_sol')
        .in('wallet_address', spaceHostWalletAddresses);
      
      if (error) {
        console.error('Error fetching space host creator profiles:', error);
        return []; 
      }
      return (data || []).map(profile => ({
        wallet_address: profile.wallet_address,
        display_name: profile.display_name,
        profile_picture_url: profile.profile_picture_url,
        subscription_enabled: profile.subscription_enabled || false,
        subscription_price_sol: profile.subscription_price_sol || null,
      }));
    },
    enabled: spaceHostWalletAddresses.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Create maps for easier lookup
  const spaceHostProfilesMap = useMemo(() => {
    const map = new Map<string, SpaceHostUserProfile>();
    if (spaceHostProfilesData) {
      spaceHostProfilesData.forEach(profile => {
        map.set(profile.id, profile);
      });
    }
    return map;
  }, [spaceHostProfilesData]);

  const spaceHostCreatorProfilesMap = useMemo(() => {
    const map = new Map<string, SpaceHostCreatorProfile>();
    if (spaceHostCreatorProfilesData) {
      spaceHostCreatorProfilesData.forEach(profile => {
        map.set(profile.wallet_address, profile);
      });
    }
    return map;
  }, [spaceHostCreatorProfilesData]);

  // Optimized memoization for user profile IDs
  const userProfileIds = useMemo(() => {
    const ids = new Set<string>();
    liveStreamsData?.forEach(s => {
      if (s.user_profiles?.id) ids.add(s.user_profiles.id);
    });
    vodsData?.forEach(v => {
      if (v.user_profiles?.id) ids.add(v.user_profiles.id);
    });
    uploadedVideosData?.forEach(video => {
      if (video.creator?.id) ids.add(video.creator.id);
    });
    return Array.from(ids);
  }, [liveStreamsData, vodsData, uploadedVideosData]);

  const { data: associatedUserProfilesData } = useQuery<{ id: string; wallet_address: string }[]>({
    queryKey: ['associatedUserProfiles', userProfileIds],
    queryFn: async () => {
      if (!userProfileIds || userProfileIds.length === 0) {
        return [];
      }
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, wallet_address')
        .in('id', userProfileIds);
      
      if (error) {
        console.error('Error fetching associated user profiles for cards:', error);
        return []; 
      }
      return data || [];
    },
    enabled: userProfileIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const userIdToWalletMap = useMemo(() => {
    const map = new Map<string, string>();
    associatedUserProfilesData?.forEach(profile => {
      if (profile.wallet_address) {
        map.set(profile.id, profile.wallet_address);
      }
    });
    return map;
  }, [associatedUserProfilesData]);

  const walletAddressesFromMedia = useMemo(() => {
    const addresses = new Set<string>();
    liveStreamsData?.forEach(s => {
      if (s.user_profiles?.id) {
        const walletAddress = userIdToWalletMap.get(s.user_profiles.id);
        if (walletAddress) addresses.add(walletAddress);
      }
    });
    vodsData?.forEach(v => {
      if (v.user_profiles?.id) {
        const walletAddress = userIdToWalletMap.get(v.user_profiles.id);
        if (walletAddress) addresses.add(walletAddress);
      }
    });
    uploadedVideosData?.forEach(video => {
      if (video.creator?.id) {
        const walletAddress = userIdToWalletMap.get(video.creator.id);
        if (walletAddress) addresses.add(walletAddress);
      }
    });
    return Array.from(addresses);
  }, [liveStreamsData, vodsData, uploadedVideosData, userIdToWalletMap]);

  const { data: creatorProfilesData } = useQuery<CreatorProfile[]>({
    queryKey: ['creatorProfilesForCards', walletAddressesFromMedia],
    queryFn: async () => {
      if (!walletAddressesFromMedia || walletAddressesFromMedia.length === 0) {
        return [];
      }
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('wallet_address, display_name, profile_picture_url, subscription_enabled, subscription_price_sol')
        .in('wallet_address', walletAddressesFromMedia);
      
      if (error) {
        console.error('Error fetching creator profiles for cards:', error);
        return []; 
      }
      return (data || []).map(profile => ({
        ...profile,
        subscription_enabled: profile.subscription_enabled ?? false, 
        subscription_price_sol: profile.subscription_price_sol ?? null,
      })) as CreatorProfile[];
    },
    enabled: walletAddressesFromMedia.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const creatorProfilesMap = useMemo(() => {
    const map = new Map<string, CreatorProfile>();
    if (creatorProfilesData) {
      creatorProfilesData.forEach(profile => {
        map.set(profile.wallet_address, profile);
      });
    }
    return map;
  }, [creatorProfilesData]);

  const transformLiveData = useCallback((stream: LiveStreamData) => {
    const userProfileOnStream = stream.user_profiles;
    const userProfileId = userProfileOnStream?.id;
    const walletAddress = userProfileId ? userIdToWalletMap.get(userProfileId) : undefined;

    const creatorProfile = walletAddress ? creatorProfilesMap.get(walletAddress) : undefined;
    
    const creatorDisplayName = creatorProfile?.display_name || userProfileOnStream?.username || 'Anonymous';
    const creatorAvatar = creatorProfile?.profile_picture_url || userProfileOnStream?.avatar_url || `https://placehold.co/100x100/212121/FFFFFF?text=${creatorDisplayName.substring(0, 2).toUpperCase() || 'AN'}`;

    return {
      id: stream.id,
      title: stream.title,
      creator: {
        id: userProfileOnStream?.id || '',
        name: creatorDisplayName,
        avatar: creatorAvatar,
        walletAddress: walletAddress || '',
      },
      // Use dynamic thumbnail if available, otherwise fallback to placeholder
      thumbnail: stream.thumbnail || `https://placehold.co/800x450/101010/FFFFFF?text=${encodeURIComponent(stream.title || 'LIVE')}`,
      viewerCount: stream.viewer_count || 0,
      isLive: true,
      isSpace: false,
      isPromoted: false,
      category: stream.category,
    };
  }, [creatorProfilesMap, userIdToWalletMap]);
  
  const transformVodData = useCallback((vod: VodData) => {
    const userProfileOnVod = vod.user_profiles;
    const userProfileId = userProfileOnVod?.id;
    const walletAddress = userProfileId ? userIdToWalletMap.get(userProfileId) : undefined;

    const creatorProfile = walletAddress ? creatorProfilesMap.get(walletAddress) : undefined;
    
    const creatorDisplayName = creatorProfile?.display_name || userProfileOnVod?.username || 'Anonymous';
    const creatorAvatar = creatorProfile?.profile_picture_url || userProfileOnVod?.avatar_url || `https://placehold.co/100x100/212121/FFFFFF?text=${creatorDisplayName.substring(0, 2).toUpperCase() || 'AN'}`;

    return {
      id: vod.mux_playback_id,
      reactKey: vod.id,
      title: vod.title || 'Untitled VOD',
      creator: {
        id: userProfileOnVod?.id || '',
        name: creatorDisplayName,
        avatar: creatorAvatar,
        walletAddress: walletAddress || '',
      },
      thumbnail: vod.thumbnail_url || `https://placehold.co/800x450/101010/FFFFFF?text=${vod.title || 'VOD'}`,
      viewerCount: 0,
      isLive: false,
      isSpace: false,
      isPromoted: false,
      category: vod.streams?.category,
    };
  }, [creatorProfilesMap, userIdToWalletMap]);

  const transformUploadedVideoData = useCallback((video: any) => {
    const creator = video.creator;
    const fallbackInitial = creator?.display_name?.substring(0, 2)?.toUpperCase() || 'U';
    const creatorAvatar = creator?.profile_picture_url || `https://placehold.co/100x100/212121/FFFFFF?text=${fallbackInitial}`;

    // Transform to match StreamCard format
    return {
      id: video.id,
      title: video.title,
      creator: {
        id: creator?.id || '',
        name: creator?.display_name || 'Unknown Creator',
        avatar: creatorAvatar,
        walletAddress: creator?.wallet_address || '',
      },
      thumbnail: video.bunny_thumbnail_url || `https://placehold.co/800x450/101010/FFFFFF?text=${encodeURIComponent(video.title || 'UPLOAD')}`,
      viewerCount: 0,
      isLive: false,
      isSpace: false,
      isPromoted: false,
      category: video.category,
      language: video.language,
      uploadStatus: video.upload_status, // Add upload status for handling
    };
  }, []);

  // Transform live spaces data to match StreamCard format
  const transformSpaceData = useCallback((space: SpaceV2) => {
    // Get host user profile
    const hostUserProfile = space.host_user_id ? spaceHostProfilesMap.get(space.host_user_id) : null;
    const hostWalletAddress = hostUserProfile?.wallet_address || space.host_wallet;
    
    // Get creator profile if available
    const hostCreatorProfile = hostWalletAddress ? spaceHostCreatorProfilesMap.get(hostWalletAddress) : null;
    
    // Determine display name and avatar
    const hostDisplayName = hostCreatorProfile?.display_name || 
                           hostUserProfile?.username || 
                           `Host (${space.host_wallet?.slice(0, 8)}...)`;
    
    const hostAvatar = hostCreatorProfile?.profile_picture_url || 
                      hostUserProfile?.avatar_url || 
                      `https://placehold.co/100x100/212121/FFFFFF?text=${hostDisplayName.substring(0, 2).toUpperCase()}`;

    return {
      id: space.room_name, // Use room_name as ID for navigation
      title: space.title,
      creator: {
        id: space.host_user_id || '',
        name: hostDisplayName,
        avatar: hostAvatar,
        walletAddress: space.host_wallet || '',
      },
      thumbnail: space.thumbnail_url || `https://placehold.co/800x450/101010/FFFFFF?text=${encodeURIComponent(space.title || 'SPACE')}`,
      viewerCount: space.participant_count || 0,
      isLive: true,
      isSpace: true, // Flag to identify as space
      isPromoted: false,
      category: space.category,
    };
  }, [spaceHostProfilesMap, spaceHostCreatorProfilesMap]);

  // Create the transformed data arrays
  const featuredStreams = useMemo(() => {
    return (liveStreamsData || []).map(transformLiveData);
  }, [liveStreamsData, transformLiveData]);

  const liveSpaces = useMemo(() => {
    return (liveSpacesData || []).map(transformSpaceData);
  }, [liveSpacesData, transformSpaceData]);

  const previousStreams = useMemo(() => {
    return (vodsData || []).map(transformVodData);
  }, [vodsData, transformVodData]);

  const uploadedVideos = useMemo(() => {
    return (uploadedVideosData || []).map(transformUploadedVideoData);
  }, [uploadedVideosData, transformUploadedVideoData]);

  // Transform promoted streams to match regular stream format
  const transformedPromotedStreams = useMemo(() => {
    return (promotedStreamsData || []).map(stream => ({
      id: stream.id,
      title: stream.title,
      creator: {
        id: stream.creator.id || '',
        name: stream.creator.name,
        avatar: stream.creator.avatar,
        walletAddress: stream.creator.walletAddress || '',
      },
      thumbnail: stream.thumbnail,
      viewerCount: stream.viewerCount,
      isLive: stream.isLive,
      isSpace: stream.isSpace,
      isPromoted: stream.isPromoted,
      category: stream.category,
      embedUrl: stream.embedUrl,
      platform: stream.platform,
      streamUrl: stream.streamUrl,
    }));
  }, [promotedStreamsData]);

  // Include promoted streams in live content alongside regular streams and spaces
  const allLiveContent = useMemo(() => {
    const regularContent = [...featuredStreams, ...liveSpaces, ...transformedPromotedStreams];
    
    // Sort by viewer count with promoted streams included
    return regularContent.sort((a, b) => {
      return (b.viewerCount || 0) - (a.viewerCount || 0);
    });
  }, [featuredStreams, liveSpaces, transformedPromotedStreams]);

  const handleVideoPlay = (video: any) => {
    if (video.isSpace) {
      // Validate space exists and is live before navigating
      const space = liveSpacesData?.find(s => s.room_name === video.id);
      if (!space || !space.is_live) {
        toast.error('This space is no longer live');
        return;
      }
      // Navigate with viewer parameter for auto-join
      navigate(`/spacesv2/${video.id}?invite=viewer`);
    } else {
      navigate(`/video/${video.id}`);
    }
  };

  return (
    <Layout>
      {/* Hero Section - Responsive Mobile/Desktop */}
      <section className="relative bg-black pb-0 md:pb-0 pt-20 md:pt-6">
        <div className="container mx-auto px-6 flex justify-center">
          <div className="max-w-6xl lg:max-w-7xl text-center w-full">
            {/* Mobile Hero - Show only on mobile */}
            <div className="block md:hidden">
              <StaticHeroMobile />
            </div>
            
            {/* Desktop Video Hero - Show only on desktop */}
            <div className="hidden md:block">
              <VideoHeroSection />
            </div>
          </div>
        </div>
      </section>
      
      {/* Main Content Area */}
      <div className="container mx-auto px-6 pt-0 pb-3">
        {/* Live Streams Section - WITHOUT promoted streams */}
        {allLiveContent.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Flame size={24} className="text-red-500" />
                    {t('home.live_channels')}
                  </h2>
                </div>
                {(liveStreamsLoading || liveSpacesLoading) && (
                  <Loader2 size={18} className="animate-spin text-primary" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-foreground/70 hover:text-primary flex items-center gap-2"
                  onClick={() => {
                    refetchLiveStreams();
                  }}
                  disabled={liveStreamsLoading || liveSpacesLoading}
                >
                  <Loader2 size={16} />
                  {t('home.refresh')}
                </Button>
                <Link to="/watch" className="text-primary hover:underline text-sm font-medium">
                  {t('home.view_all_live')}
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {allLiveContent.map((content) => {
                if (content.isSpace) {
                  return (
                    <div key={`space-${content.id}`} onClick={() => handleVideoPlay(content)} className="cursor-pointer">
                      <StreamCard {...content} />
                    </div>
                  );
                 } else if (content.isPromoted) {
                   return (
                     <PromotedStreamCard 
                       key={`promoted-${content.id}`}
                       id={content.id}
                       title={content.title}
                       creator={content.creator}
                       thumbnail={content.thumbnail}
                       viewerCount={content.viewerCount}
                       category={content.category}
                       embedUrl={(content as any).embedUrl || ''}
                       platform={(content as any).platform || ''}
                       streamUrl={(content as any).streamUrl || ''}
                     />
                   );
                } else {
                  return <StreamCard key={`stream-${content.id}`} {...content} />;
                }
              })}
            </div>
          </section>
        )}

        {/* Recently Streamed Section (renamed from Recent VODs) */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp size={24} className="text-primary" />
                {t('home.recently_streamed')}
              </h2>
              {vodsLoading && (
                <Loader2 size={18} className="animate-spin text-primary" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-foreground/70 hover:text-primary flex items-center gap-2"
                onClick={() => refetchVods()}
                disabled={vodsLoading}
              >
                <Loader2 size={16} />
                {t('home.refresh')}
              </Button>
              <Link to="/vods" className="text-primary hover:underline text-sm font-medium">
                {t('home.view_all_vods_link')}
              </Link>
            </div>
          </div>
          
          {vodsError ? (
            <div className="text-center py-12 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-foreground/70">{t('home.failed_recent_videos')}</p>
            </div>
          ) : previousStreams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {previousStreams.map((vod) => (
                <StreamCard key={`vod-${vod.reactKey}`} {...vod} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card/50 rounded-lg border border-border">
              {!vodsLoading && (
                <>
                  <Clock size={48} className="mx-auto mb-4 text-foreground/20" />
                  <p className="text-foreground/70 mb-4">{t('home.no_past_streams')}</p>
                  <Link to="/create">
                    <Button variant="outline">{t('home.start_creating')}</Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </section>

        {/* Creator Uploads Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Upload size={24} className="text-primary" />
                {t('home.creator_uploads')}
              </h2>
              {uploadedVideosLoading && (
                <Loader2 size={18} className="animate-spin text-primary" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-foreground/70 hover:text-primary flex items-center gap-2"
                onClick={() => refetchUploadedVideos()}
                disabled={uploadedVideosLoading}
              >
                <Loader2 size={16} />
                {t('home.refresh')}
              </Button>
              <Link to="/uploads" className="text-primary hover:underline text-sm font-medium">
                {t('home.view_all_uploads_link')}
              </Link>
            </div>
          </div>
          
          {uploadedVideosError ? (
            <div className="text-center py-12 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-foreground/70">{t('home.failed_uploads')}</p>
            </div>
          ) : uploadedVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {uploadedVideos.map((video) => (
                <StreamCard
                  key={video.id}
                  {...video}
                  isUpload={true}
                  uploadStatus={video.uploadStatus}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card/50 rounded-lg border border-border">
              {!uploadedVideosLoading && (
                <>
                  <Upload size={48} className="mx-auto mb-4 text-foreground/20" />
                  <p className="text-foreground/70 mb-4">{t('home.no_uploaded_videos')}</p>
                  <Link to="/creator/upload">
                    <Button variant="outline">{t('home.start_uploading')}</Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default Index;
