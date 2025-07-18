
import { supabase } from '@/integrations/supabase/client';

export interface FollowRelationship {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
}

/**
 * Get the current user's profile ID directly from user_profiles table
 * Fixed version with proper Google user lookup and error handling
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
      console.log('Found authenticated user:', user.id, user.email);
      
      // First try to find profile by google_id
      if (user.id) {
        const { data: profileByGoogleId, error: googleIdError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('google_id', user.id)
          .maybeSingle();
        
        if (!googleIdError && profileByGoogleId) {
          console.log('Found Google user profile by google_id:', profileByGoogleId.id);
          return profileByGoogleId.id;
        }
        
        if (googleIdError) {
          console.warn('Error querying by google_id:', googleIdError);
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
          console.log('Found Google user profile by email:', profileByEmail.id);
          return profileByEmail.id;
        }
        
        if (emailError) {
          console.warn('Error querying by email:', emailError);
        }
      }
      
      console.warn('No user profile found for Google user:', user.id, user.email);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user profile ID:', error);
    return null;
  }
};

/**
 * Follow a creator
 */
export const followCreator = async (followedUserId: string, currentUserUuid: string): Promise<boolean> => {
  try {
    if (!followedUserId) {
      console.error('No followed user ID provided');
      return false;
    }

    // First try to get authenticated user's profile ID
    let followerProfileId = await getCurrentUserProfileId();
    
    // If no authenticated user found, try to find profile by the provided UUID
    if (!followerProfileId && currentUserUuid) {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', currentUserUuid)
        .maybeSingle();
      
      if (!error && profile) {
        followerProfileId = profile.id;
      } else if (error) {
        console.error('Error finding profile by UUID:', error);
      }
    }
    
    if (!followerProfileId) {
      console.error('Could not find user profile for following');
      return false;
    }

    console.log('Following creator with follower_id:', followerProfileId, 'followed_id:', followedUserId);

    const { error } = await supabase
      .from('following')
      .insert({
        follower_id: followerProfileId,
        followed_id: followedUserId
      });

    if (error) {
      console.error('Error following creator:', error);
      return false;
    }

    console.log('Successfully followed creator');
    return true;
  } catch (error) {
    console.error('Error following creator:', error);
    return false;
  }
};

/**
 * Unfollow a creator
 */
export const unfollowCreator = async (followedUserId: string, currentUserUuid: string): Promise<boolean> => {
  try {
    if (!followedUserId) {
      console.error('No followed user ID provided');
      return false;
    }

    // First try to get authenticated user's profile ID
    let followerProfileId = await getCurrentUserProfileId();
    
    // If no authenticated user found, try to find profile by the provided UUID
    if (!followerProfileId && currentUserUuid) {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', currentUserUuid)
        .maybeSingle();
      
      if (!error && profile) {
        followerProfileId = profile.id;
      } else if (error) {
        console.error('Error finding profile by UUID:', error);
      }
    }
    
    if (!followerProfileId) {
      console.error('Could not find user profile for unfollowing');
      return false;
    }

    console.log('Unfollowing creator with follower_id:', followerProfileId, 'followed_id:', followedUserId);

    const { error } = await supabase
      .from('following')
      .delete()
      .eq('follower_id', followerProfileId)
      .eq('followed_id', followedUserId);

    if (error) {
      console.error('Error unfollowing creator:', error);
      return false;
    }

    console.log('Successfully unfollowed creator');
    return true;
  } catch (error) {
    console.error('Error unfollowing creator:', error);
    return false;
  }
};

/**
 * Check if current user is following a creator
 */
export const isFollowingCreator = async (followedUserId: string, currentUserUuid: string): Promise<boolean> => {
  try {
    if (!followedUserId) {
      return false;
    }

    // First try to get authenticated user's profile ID
    let followerProfileId = await getCurrentUserProfileId();
    
    // If no authenticated user found, try to find profile by the provided UUID
    if (!followerProfileId && currentUserUuid) {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', currentUserUuid)
        .maybeSingle();
      
      if (!error && profile) {
        followerProfileId = profile.id;
      } else if (error) {
        console.error('Error finding profile by UUID:', error);
      }
    }
    
    if (!followerProfileId) {
      console.log('No follower profile ID found, user is not following');
      return false;
    }

    const { data, error } = await supabase
      .from('following')
      .select('id')
      .eq('follower_id', followerProfileId)
      .eq('followed_id', followedUserId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking follow status:', error);
      return false;
    }

    const isFollowing = !!data;
    console.log('Follow status check:', { followerProfileId, followedUserId, isFollowing });
    return isFollowing;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
};

/**
 * Get follower count for a creator
 */
export const getFollowerCount = async (creatorUserId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('following')
      .select('*', { count: 'exact', head: true })
      .eq('followed_id', creatorUserId);

    if (error) {
      console.error('Error getting follower count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting follower count:', error);
    return 0;
  }
};

export const getFollowers = async (creatorUserId: string): Promise<FollowRelationship[]> => {
  try {
    const { data, error } = await supabase
      .from('following')
      .select('*')
      .eq('followed_id', creatorUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting followers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting followers:', error);
    return [];
  }
};
