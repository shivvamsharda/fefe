import React, { useMemo, useCallback } from 'react';
import { Loader2, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTopContent } from '@/hooks/useTopContent';
import { getActiveStreams } from '@/services/streamService';
import { getActivePromotedStreams } from '@/services/promotedStreamIntegrationService';
import FeaturedContentSlideshow from './FeaturedContentSlideshow';
import FeatureBanner from './FeatureBanner';
import type { CreatorProfile } from '@/services/creatorProfileService';

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
  total_views?: number | null;
  user_profiles: NestedUserProfile;
  streams?: { category?: string | null } | null;
};

// Define a unified content type for the hero section
type HeroContentItem = {
  id: string;
  title: string;
  creator: {
    id?: string;
    name: string;
    avatar: string;
    walletAddress?: string;
  };
  thumbnail: string;
  viewerCount?: number;
  isLive: boolean;
  isSpace?: boolean;
  category?: string;
  playbackUrl?: string;
  muxPlaybackId?: string;
  isPromoted?: boolean;
  embedUrl?: string;
  platform?: string;
};

const VideoHeroSection: React.FC = () => {
  const { topContent, isLoading: vodsLoading } = useTopContent();

  // Fetch promoted streams using the working service from Index.tsx
  const { data: promotedStreamsData, isLoading: promotedStreamsLoading } = useQuery({
    queryKey: ['allActivePromotedStreams'],
    queryFn: () => getActivePromotedStreams(),
    refetchInterval: 30000,
    staleTime: 25000,
  });

  // Fetch live streams
  const { data: liveStreamsData, isLoading: liveStreamsLoading } = useQuery({
    queryKey: ['heroLiveStreams'],
    queryFn: getActiveStreams,
    refetchInterval: 30000,
    staleTime: 25000,
  });

  // Get user profile IDs for both live streams and VODs
  const userProfileIds = useMemo(() => {
    const ids = new Set<string>();
    liveStreamsData?.forEach(s => {
      if (s.user_profiles?.id) ids.add(s.user_profiles.id);
    });
    topContent.vods.forEach(v => {
      if (v.user_profiles?.id) ids.add(v.user_profiles.id);
    });
    return Array.from(ids);
  }, [liveStreamsData, topContent]);

  // Fetch associated user profiles for wallet addresses
  const { data: associatedUserProfilesData } = useQuery<{ id: string; wallet_address: string }[]>({
    queryKey: ['heroAssociatedUserProfiles', userProfileIds],
    queryFn: async () => {
      if (!userProfileIds || userProfileIds.length === 0) return [];
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, wallet_address')
        .in('id', userProfileIds);
      
      if (error) {
        console.error('Error fetching associated user profiles:', error);
        return []; 
      }
      return data || [];
    },
    enabled: userProfileIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Create user ID to wallet mapping
  const userIdToWalletMap = useMemo(() => {
    const map = new Map<string, string>();
    associatedUserProfilesData?.forEach(profile => {
      if (profile.wallet_address) {
        map.set(profile.id, profile.wallet_address);
      }
    });
    return map;
  }, [associatedUserProfilesData]);

  // Get wallet addresses for creator profiles
  const walletAddresses = useMemo(() => {
    const addresses = new Set<string>();
    liveStreamsData?.forEach(s => {
      if (s.user_profiles?.id) {
        const walletAddress = userIdToWalletMap.get(s.user_profiles.id);
        if (walletAddress) addresses.add(walletAddress);
      }
    });
    topContent.vods.forEach(v => {
      if (v.user_profiles?.id) {
        const walletAddress = userIdToWalletMap.get(v.user_profiles.id);
        if (walletAddress) addresses.add(walletAddress);
      }
    });
    return Array.from(addresses);
  }, [liveStreamsData, topContent, userIdToWalletMap]);

  // Fetch creator profiles
  const { data: creatorProfilesData } = useQuery<CreatorProfile[]>({
    queryKey: ['heroCreatorProfiles', walletAddresses],
    queryFn: async () => {
      if (!walletAddresses || walletAddresses.length === 0) return [];
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('wallet_address, display_name, profile_picture_url, subscription_enabled, subscription_price_sol')
        .in('wallet_address', walletAddresses);
      
      if (error) {
        console.error('Error fetching creator profiles:', error);
        return []; 
      }
      return (data || []).map(profile => ({
        ...profile,
        subscription_enabled: profile.subscription_enabled ?? false, 
        subscription_price_sol: profile.subscription_price_sol ?? null,
      })) as CreatorProfile[];
    },
    enabled: walletAddresses.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Create creator profiles map
  const creatorProfilesMap = useMemo(() => {
    const map = new Map<string, CreatorProfile>();
    if (creatorProfilesData) {
      creatorProfilesData.forEach(profile => {
        map.set(profile.wallet_address, profile);
      });
    }
    return map;
  }, [creatorProfilesData]);

  // Transform live stream data to unified format
  const transformLiveData = useCallback((stream: LiveStreamData): HeroContentItem => {
    const userProfile = stream.user_profiles;
    const userProfileId = userProfile?.id;
    const walletAddress = userProfileId ? userIdToWalletMap.get(userProfileId) : undefined;
    const creatorProfile = walletAddress ? creatorProfilesMap.get(walletAddress) : undefined;
    
    const creatorDisplayName = creatorProfile?.display_name || userProfile?.username || 'Anonymous';
    const creatorAvatar = creatorProfile?.profile_picture_url || userProfile?.avatar_url || 
      `https://placehold.co/100x100/212121/FFFFFF?text=${creatorDisplayName.substring(0, 2).toUpperCase()}`;

    return {
      id: stream.id,
      title: stream.title,
      creator: {
        id: userProfile?.id || '',
        name: creatorDisplayName,
        avatar: creatorAvatar,
        walletAddress: walletAddress || '',
      },
      thumbnail: stream.thumbnail || `https://placehold.co/800x450/101010/FFFFFF?text=${encodeURIComponent(stream.title || 'LIVE')}`,
      viewerCount: stream.viewer_count || 0,
      isLive: true,
      category: stream.category,
    };
  }, [creatorProfilesMap, userIdToWalletMap]);

  // Transform VOD data to unified format
  const transformVodData = useCallback((vod: VodData): HeroContentItem => {
    const userProfile = vod.user_profiles;
    const userProfileId = userProfile?.id;
    const walletAddress = userProfileId ? userIdToWalletMap.get(userProfileId) : undefined;
    const creatorProfile = walletAddress ? creatorProfilesMap.get(walletAddress) : undefined;
    
    const creatorDisplayName = creatorProfile?.display_name || userProfile?.username || 'Anonymous';
    const creatorAvatar = creatorProfile?.profile_picture_url || userProfile?.avatar_url || 
      `https://placehold.co/100x100/212121/FFFFFF?text=${creatorDisplayName.substring(0, 2).toUpperCase()}`;

    return {
      id: vod.id,
      title: vod.title || 'Untitled VOD',
      creator: {
        id: userProfile?.id || '',
        name: creatorDisplayName,
        avatar: creatorAvatar,
        walletAddress: walletAddress || '',
      },
      thumbnail: vod.thumbnail_url || `https://placehold.co/800x450/101010/FFFFFF?text=${encodeURIComponent(vod.title || 'VOD')}`,
      viewerCount: vod.total_views || 0,
      isLive: false,
      category: vod.streams?.category,
      muxPlaybackId: vod.mux_playback_id,
    };
  }, [creatorProfilesMap, userIdToWalletMap]);


  // Prepare trending content with promoted streams integration
  const trendingContent = useMemo((): HeroContentItem[] => {
    const liveStreams = (liveStreamsData || []).map(transformLiveData);
    const popularVods = topContent.vods.map(transformVodData);
    const promotedStreams = promotedStreamsData || [];
    
    // Combine all content
    let allContent: HeroContentItem[] = [...liveStreams, ...popularVods];
    
    // Start with promoted content (already in correct format), then fill remaining slots with other content
    const finalContent: HeroContentItem[] = [...promotedStreams];
    
    // Fill remaining slots up to 6 with other content
    if (finalContent.length < 6) {
      const remainingSlots = 6 - finalContent.length;
      finalContent.push(...allContent.slice(0, remainingSlots));
    }
    
    // Return exactly 6 items for the featured slideshow
    return finalContent.slice(0, 6);
  }, [liveStreamsData, transformLiveData, topContent.vods, transformVodData, promotedStreamsData]);


  const isLoading = liveStreamsLoading || vodsLoading || promotedStreamsLoading;

  // If no content available, show original FeatureBanner
  if (!isLoading && trendingContent.length === 0 && (!promotedStreamsData || promotedStreamsData.length === 0)) {
    return <FeatureBanner />;
  }

  // Content for slideshow - use all 6 trending content items
  const slideshowContent = trendingContent;


  return (
    <div className="relative w-full bg-black">
      <div className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Featured Content Title */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 text-green-500" />
                <h2 className="text-2xl font-bold text-foreground">Featured Content</h2>
              </div>
            </div>

            {/* Featured Content Slideshow */}
            <FeaturedContentSlideshow content={slideshowContent} />
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoHeroSection;