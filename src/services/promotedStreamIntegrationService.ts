
import { supabase } from '@/integrations/supabase/client';

// Generate consistent fudged viewer count between 40-65 based on stream ID
const getFudgedViewerCount = (streamId: string): number => {
  // Use stream ID as seed for consistent randomness
  let hash = 0;
  for (let i = 0; i < streamId.length; i++) {
    const char = streamId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate random number between 40-65 using the hash as seed
  const seed = Math.abs(hash);
  return 40 + (seed % 26); // 26 possible values (40-65)
};

export interface PromotedStreamForHomepage {
  id: string;
  title: string;
  creator: {
    id?: string;
    name: string;
    avatar: string;
    walletAddress?: string;
  };
  thumbnail: string;
  viewerCount: number;
  isLive: boolean;
  isSpace: boolean;
  isPromoted: boolean;
  category?: string;
  placementType: string;
  embedUrl: string;
  platform: string;
  streamUrl: string;
  expiresAt: string;
}

// Function to generate proper embed URLs using the edge function
const generateEmbedUrl = async (streamUrl: string, platform: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embed-url', {
      body: {
        streamUrl,
        platform,
        referer: window.location.origin
      }
    });

    if (error) {
      console.error('Error generating embed URL:', error);
      return streamUrl; // Fallback to original URL
    }

    return data.embedUrl || streamUrl;
  } catch (error) {
    console.error('Failed to call generate-embed-url function:', error);
    return streamUrl; // Fallback to original URL
  }
};

export const getActivePromotedStreams = async (): Promise<PromotedStreamForHomepage[]> => {
  try {
    // First, auto-expire any streams that should be expired
    await supabase.rpc('auto_expire_promoted_streams');

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
        user_profiles!creator_user_id (
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
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promoted streams:', error);
      return [];
    }

    // Process each stream and generate proper embed URLs
    const processedStreams = await Promise.all((data || []).map(async (stream) => {
      const userProfile = stream.user_profiles;
      const creatorProfile = userProfile?.creator_profiles;
      
      // Determine creator name with fallback logic
      let creatorName = 'Anonymous';
      if (creatorProfile?.display_name) {
        creatorName = creatorProfile.display_name;
      } else if (userProfile?.display_name) {
        creatorName = userProfile.display_name;
      } else if (userProfile?.username) {
        creatorName = userProfile.username;
      } else if (stream.wallet_address) {
        creatorName = stream.wallet_address.slice(0, 8) + '...';
      }

      // Determine avatar with fallback logic
      let avatar = `https://placehold.co/100x100/212121/FFFFFF?text=${stream.stream_title.substring(0, 2).toUpperCase()}`;
      if (creatorProfile?.profile_picture_url) {
        avatar = creatorProfile.profile_picture_url;
      } else if (userProfile?.avatar_url) {
        avatar = userProfile.avatar_url;
      }

      // Generate proper embed URL using the edge function
      const embedUrl = await generateEmbedUrl(stream.stream_url, stream.stream_platform || 'unknown');

      return {
        id: stream.id,
        title: stream.stream_title,
        creator: {
          id: userProfile?.id,
          name: creatorName,
          avatar: avatar,
          walletAddress: stream.wallet_address,
        },
        thumbnail: stream.thumbnail_url || `https://placehold.co/800x450/101010/FFFFFF?text=${encodeURIComponent(stream.stream_title)}`,
        viewerCount: getFudgedViewerCount(stream.id),
        isLive: true, // Promoted streams are always shown as live
        isSpace: false,
        isPromoted: true,
        category: stream.category,
        placementType: stream.placement_type,
        embedUrl: embedUrl,
        platform: stream.stream_platform || 'unknown',
        streamUrl: stream.stream_url,
        expiresAt: stream.base_payment_expires_at,
      };
    }));

    return processedStreams;
  } catch (error) {
    console.error('Error in getActivePromotedStreams:', error);
    return [];
  }
};

export const getPromotedStreamsByPlacement = (
  promotedStreams: PromotedStreamForHomepage[],
  placement: string
): PromotedStreamForHomepage[] => {
  return promotedStreams.filter(stream => stream.placementType === placement);
};
