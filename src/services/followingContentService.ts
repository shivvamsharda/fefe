import { supabase } from '@/integrations/supabase/client';

export interface FollowingStream {
  id: string;
  title: string;
  description?: string;
  category?: string;
  language?: string;
  status: string;
  viewer_count: number;
  created_at: string;
  thumbnail?: string;
  playback_id?: string;
  user_id: string;
  creator_profile: {
    display_name: string;
    profile_picture_url?: string;
    wallet_address: string;
  };
}

export interface FollowingVod {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  thumbnail_url?: string;
  mux_playback_id: string;
  created_at: string;
  user_id: string;
  creator_profile: {
    display_name: string;
    profile_picture_url?: string;
    wallet_address: string;
  };
}

/**
 * Get the current user's profile ID directly from user_profiles table
 * Same logic as followService.ts to ensure consistency
 */
const getCurrentUserProfileId = async (): Promise<string | null> => {
  try {
    // Check if user is authenticated with Supabase (Google users)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error getting user:', authError);
      return null;
    }
    
    if (user) {
      console.log('Found authenticated user for following content:', user.id, user.email);
      
      // First try to find profile by google_id
      if (user.id) {
        const { data: profileByGoogleId, error: googleIdError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('google_id', user.id)
          .maybeSingle();
        
        if (!googleIdError && profileByGoogleId) {
          console.log('Found Google user profile by google_id for following content:', profileByGoogleId.id);
          return profileByGoogleId.id;
        }
        
        if (googleIdError) {
          console.warn('Error querying by google_id for following content:', googleIdError);
        }
      }
      
      // Then try to find profile by email
      if (user.email) {
        const { data: profileByEmail, error: emailError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (!emailError && profileByEmail) {
          console.log('Found Google user profile by email for following content:', profileByEmail.id);
          return profileByEmail.id;
        }
        
        if (emailError) {
          console.warn('Error querying by email for following content:', emailError);
        }
      }
      
      console.warn('No user profile found for Google user in following content:', user.id, user.email);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user profile ID for following content:', error);
    return null;
  }
};

/**
 * Get live streams from creators the user is following
 */
export const getFollowingLiveStreams = async (currentUserUuid: string): Promise<FollowingStream[]> => {
  try {
    if (!currentUserUuid) {
      return [];
    }

    // Use consistent logic to get the correct follower_id
    let followerIdToUse = await getCurrentUserProfileId();
    
    // If no authenticated user found, try to use the provided UUID
    if (!followerIdToUse && currentUserUuid) {
      followerIdToUse = currentUserUuid;
    }
    
    if (!followerIdToUse) {
      console.log('No follower ID found for following streams');
      return [];
    }

    console.log('Using follower_id for following streams:', followerIdToUse);

    // Get followed creator IDs
    const { data: followedCreators, error: followError } = await supabase
      .from('following')
      .select('followed_id')
      .eq('follower_id', followerIdToUse);

    if (followError || !followedCreators || followedCreators.length === 0) {
      console.log('No followed creators found or error:', followError);
      return [];
    }

    const followedIds = followedCreators.map(f => f.followed_id);
    console.log('Found followed creator IDs:', followedIds);

    // Get live streams from followed creators with proper JOINs through user_profiles
    const { data: streams, error: streamsError } = await supabase
      .from('streams')
      .select(`
        id,
        title,
        description,
        category,
        language,
        status,
        viewer_count,
        created_at,
        thumbnail,
        playback_id,
        user_id,
        user_profiles!inner (
          wallet_address,
          display_name,
          creator_profiles (
            display_name,
            profile_picture_url,
            wallet_address
          )
        )
      `)
      .in('user_id', followedIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (streamsError) {
      console.error('Error fetching following streams:', streamsError);
      return [];
    }

    if (!streams || streams.length === 0) {
      console.log('No active streams found from followed creators');
      return [];
    }

    console.log('Found streams from followed creators:', streams.length);

    // Map streams with creator profiles
    return streams.map(stream => {
      const userProfile = stream.user_profiles;
      const creatorProfile = userProfile?.creator_profiles;
      
      return {
        id: stream.id,
        title: stream.title,
        description: stream.description,
        category: stream.category,
        language: stream.language,
        status: stream.status,
        viewer_count: stream.viewer_count,
        created_at: stream.created_at,
        thumbnail: stream.thumbnail,
        playback_id: stream.playback_id,
        user_id: stream.user_id,
        creator_profile: {
          display_name: creatorProfile?.display_name || userProfile?.display_name || 'Unknown Creator',
          profile_picture_url: creatorProfile?.profile_picture_url,
          wallet_address: userProfile?.wallet_address || stream.user_id,
        }
      };
    });
  } catch (error) {
    console.error('Error getting following live streams:', error);
    return [];
  }
};

/**
 * Get VODs from creators the user is following
 */
export const getFollowingVods = async (currentUserUuid: string): Promise<FollowingVod[]> => {
  try {
    if (!currentUserUuid) {
      return [];
    }

    // Use consistent logic to get the correct follower_id
    let followerIdToUse = await getCurrentUserProfileId();
    
    // If no authenticated user found, try to use the provided UUID
    if (!followerIdToUse && currentUserUuid) {
      followerIdToUse = currentUserUuid;
    }
    
    if (!followerIdToUse) {
      console.log('No follower ID found for following VODs');
      return [];
    }

    console.log('Using follower_id for following VODs:', followerIdToUse);

    // Get followed creator IDs
    const { data: followedCreators, error: followError } = await supabase
      .from('following')
      .select('followed_id')
      .eq('follower_id', followerIdToUse);

    if (followError || !followedCreators || followedCreators.length === 0) {
      console.log('No followed creators found or error for VODs:', followError);
      return [];
    }

    const followedIds = followedCreators.map(f => f.followed_id);
    console.log('Found followed creator IDs for VODs:', followedIds);

    // Get VODs from followed creators with proper JOINs through user_profiles to creator_profiles
    const { data: vods, error: vodsError } = await supabase
      .from('vods')
      .select(`
        id,
        title,
        description,
        duration,
        thumbnail_url,
        mux_playback_id,
        created_at,
        user_id,
        user_profiles!inner (
          wallet_address,
          display_name,
          creator_profiles (
            display_name,
            profile_picture_url,
            wallet_address
          )
        )
      `)
      .in('user_id', followedIds)
      .eq('deleted_by_user', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (vodsError) {
      console.error('Error fetching following VODs:', vodsError);
      return [];
    }

    if (!vods || vods.length === 0) {
      console.log('No VODs found from followed creators');
      return [];
    }

    console.log('Found VODs from followed creators:', vods.length);

    // Map VODs with creator profiles
    return vods.map(vod => {
      const userProfile = vod.user_profiles;
      const creatorProfile = userProfile?.creator_profiles;
      
      return {
        id: vod.id,
        title: vod.title,
        description: vod.description,
        duration: vod.duration,
        thumbnail_url: vod.thumbnail_url,
        mux_playback_id: vod.mux_playback_id,
        created_at: vod.created_at,
        user_id: vod.user_id,
        creator_profile: {
          display_name: creatorProfile?.display_name || userProfile?.display_name || 'Unknown Creator',
          profile_picture_url: creatorProfile?.profile_picture_url,
          wallet_address: userProfile?.wallet_address || vod.user_id,
        }
      };
    });
  } catch (error) {
    console.error('Error getting following VODs:', error);
    return [];
  }
};
