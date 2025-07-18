
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreatorProfile {
  display_name: string;
  bio?: string;
  profile_picture_url?: string;
  content_categories?: string[];
  wallet_address: string;
  email?: string;
  full_name?: string;
  website_url?: string;
  social_x_url?: string;
  social_instagram_url?: string;
  social_youtube_url?: string;
  social_twitch_url?: string;
  social_kick_url?: string;
  social_telegram_url?: string;
  language_preference?: string;
  subscription_enabled: boolean;
  subscription_price_sol?: number;
  persistent_stream_key?: string;
  persistent_rtmp_url?: string;
  persistent_ingress_id?: string;
  persistent_room_name?: string;
  created_at: string;
  updated_at: string;
  user_id_uuid?: string; // Added to include the user_profiles.id
}

export interface CreatorProfileData {
  wallet_address: string;
  display_name: string;
  bio?: string | null;
  profile_picture_url?: string | null;
  content_categories?: string[] | null;
  email?: string | null;
  full_name?: string | null;
  website_url?: string | null;
  social_x_url?: string | null;
  social_instagram_url?: string | null;
  social_youtube_url?: string | null;
  social_twitch_url?: string | null;
  social_kick_url?: string | null;
  social_telegram_url?: string | null;
  language_preference?: string | null;
  subscription_enabled: boolean;
  subscription_price_sol?: number | null;
}

export interface UpdateCreatorProfileData {
  display_name?: string;
  bio?: string | null;
  profile_picture_url?: string | null;
  content_categories?: string[] | null;
  email?: string | null;
  full_name?: string | null;
  website_url?: string | null;
  social_x_url?: string | null;
  social_instagram_url?: string | null;
  social_youtube_url?: string | null;
  social_twitch_url?: string | null;
  social_kick_url?: string | null;
  social_telegram_url?: string | null;
  language_preference?: string | null;
  subscription_enabled?: boolean;
  subscription_price_sol?: number | null;
}

/**
 * Get all creator profiles with their user_profiles.id included
 * This optimized version uses a single query with JOIN to improve performance
 */
export const getAllCreatorProfilesWithUserUuid = async (): Promise<CreatorProfile[]> => {
  try {
    console.log('Fetching all creator profiles with user UUIDs...');
    
    // Single optimized query that joins creator_profiles with user_profiles
    const { data, error } = await supabase
      .from('creator_profiles')
      .select(`
        *,
        user_profiles!inner(id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching creator profiles:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No creator profiles found');
      return [];
    }

    // Transform the data to include user_id_uuid
    const profiles: CreatorProfile[] = data.map(profile => ({
      display_name: profile.display_name,
      bio: profile.bio,
      profile_picture_url: profile.profile_picture_url,
      content_categories: profile.content_categories,
      wallet_address: profile.wallet_address,
      email: profile.email,
      full_name: profile.full_name,
      website_url: profile.website_url,
      social_x_url: profile.social_x_url,
      social_instagram_url: profile.social_instagram_url,
      social_youtube_url: profile.social_youtube_url,
      social_twitch_url: profile.social_twitch_url,
      social_kick_url: profile.social_kick_url,
      social_telegram_url: profile.social_telegram_url,
      language_preference: profile.language_preference,
      subscription_enabled: profile.subscription_enabled || false,
      subscription_price_sol: profile.subscription_price_sol,
      persistent_stream_key: profile.persistent_stream_key,
      persistent_rtmp_url: profile.persistent_rtmp_url,
      persistent_ingress_id: profile.persistent_ingress_id,
      persistent_room_name: profile.persistent_room_name,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      user_id_uuid: profile.user_profiles?.id || undefined
    }));

    console.log(`Successfully fetched ${profiles.length} creator profiles`);
    return profiles.filter(p => p.user_id_uuid); // Only return profiles with valid user_id_uuid
  } catch (error) {
    console.error('Error in getAllCreatorProfilesWithUserUuid:', error);
    return [];
  }
};

/**
 * Get a single creator profile by wallet address
 */
export const getCreatorProfile = async (walletAddress: string): Promise<CreatorProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select(`
        *,
        user_profiles!inner(id)
      `)
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      console.error('Error fetching creator profile:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      display_name: data.display_name,
      bio: data.bio,
      profile_picture_url: data.profile_picture_url,
      content_categories: data.content_categories,
      wallet_address: data.wallet_address,
      email: data.email,
      full_name: data.full_name,
      website_url: data.website_url,
      social_x_url: data.social_x_url,
      social_instagram_url: data.social_instagram_url,
      social_youtube_url: data.social_youtube_url,
      social_twitch_url: data.social_twitch_url,
      social_kick_url: data.social_kick_url,
      social_telegram_url: data.social_telegram_url,
      language_preference: data.language_preference,
      subscription_enabled: data.subscription_enabled || false,
      subscription_price_sol: data.subscription_price_sol,
      persistent_stream_key: data.persistent_stream_key,
      persistent_rtmp_url: data.persistent_rtmp_url,
      persistent_ingress_id: data.persistent_ingress_id,
      persistent_room_name: data.persistent_room_name,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_id_uuid: data.user_profiles?.id || undefined
    };
  } catch (error) {
    console.error('Error in getCreatorProfile:', error);
    return null;
  }
};

/**
 * Get a single creator profile by wallet address (alias for backward compatibility)
 */
export const getCreatorProfileByWallet = async (walletAddress: string): Promise<CreatorProfile | null> => {
  return getCreatorProfile(walletAddress);
};

/**
 * Get a single creator profile by user UUID
 */
export const getCreatorProfileByUserUuid = async (userUuid: string): Promise<CreatorProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select(`
        *,
        user_profiles!inner(id)
      `)
      .eq('user_profiles.id', userUuid)
      .single();

    if (error) {
      console.error('Error fetching creator profile by user UUID:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      display_name: data.display_name,
      bio: data.bio,
      profile_picture_url: data.profile_picture_url,
      content_categories: data.content_categories,
      wallet_address: data.wallet_address,
      email: data.email,
      full_name: data.full_name,
      website_url: data.website_url,
      social_x_url: data.social_x_url,
      social_instagram_url: data.social_instagram_url,
      social_youtube_url: data.social_youtube_url,
      social_twitch_url: data.social_twitch_url,
      social_kick_url: data.social_kick_url,
      social_telegram_url: data.social_telegram_url,
      language_preference: data.language_preference,
      subscription_enabled: data.subscription_enabled || false,
      subscription_price_sol: data.subscription_price_sol,
      persistent_stream_key: data.persistent_stream_key,
      persistent_rtmp_url: data.persistent_rtmp_url,
      persistent_ingress_id: data.persistent_ingress_id,
      persistent_room_name: data.persistent_room_name,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_id_uuid: data.user_profiles?.id || undefined
    };
  } catch (error) {
    console.error('Error in getCreatorProfileByUserUuid:', error);
    return null;
  }
};

/**
 * Create a new creator profile
 */
export const createCreatorProfile = async (profileData: CreatorProfileData): Promise<CreatorProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('creator_profiles')
      .insert(profileData)
      .select(`
        *,
        user_profiles!inner(id)
      `)
      .single();

    if (error) {
      console.error('Error creating creator profile:', error);
      toast.error(`Failed to create profile: ${error.message}`);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      display_name: data.display_name,
      bio: data.bio,
      profile_picture_url: data.profile_picture_url,
      content_categories: data.content_categories,
      wallet_address: data.wallet_address,
      email: data.email,
      full_name: data.full_name,
      website_url: data.website_url,
      social_x_url: data.social_x_url,
      social_instagram_url: data.social_instagram_url,
      social_youtube_url: data.social_youtube_url,
      social_twitch_url: data.social_twitch_url,
      social_kick_url: data.social_kick_url,
      social_telegram_url: data.social_telegram_url,
      language_preference: data.language_preference,
      subscription_enabled: data.subscription_enabled || false,
      subscription_price_sol: data.subscription_price_sol,
      persistent_stream_key: data.persistent_stream_key,
      persistent_rtmp_url: data.persistent_rtmp_url,
      persistent_ingress_id: data.persistent_ingress_id,
      persistent_room_name: data.persistent_room_name,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_id_uuid: data.user_profiles?.id || undefined
    };
  } catch (error) {
    console.error('Error in createCreatorProfile:', error);
    return null;
  }
};

/**
 * Update a creator profile
 */
export const updateCreatorProfile = async (walletAddress: string, updates: UpdateCreatorProfileData): Promise<CreatorProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('creator_profiles')
      .update(updates)
      .eq('wallet_address', walletAddress)
      .select(`
        *,
        user_profiles!inner(id)
      `)
      .single();

    if (error) {
      console.error('Error updating creator profile:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      display_name: data.display_name,
      bio: data.bio,
      profile_picture_url: data.profile_picture_url,
      content_categories: data.content_categories,
      wallet_address: data.wallet_address,
      email: data.email,
      full_name: data.full_name,
      website_url: data.website_url,
      social_x_url: data.social_x_url,
      social_instagram_url: data.social_instagram_url,
      social_youtube_url: data.social_youtube_url,
      social_twitch_url: data.social_twitch_url,
      social_kick_url: data.social_kick_url,
      social_telegram_url: data.social_telegram_url,
      language_preference: data.language_preference,
      subscription_enabled: data.subscription_enabled || false,
      subscription_price_sol: data.subscription_price_sol,
      persistent_stream_key: data.persistent_stream_key,
      persistent_rtmp_url: data.persistent_rtmp_url,
      persistent_ingress_id: data.persistent_ingress_id,
      persistent_room_name: data.persistent_room_name,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_id_uuid: data.user_profiles?.id || undefined
    };
  } catch (error) {
    console.error('Error in updateCreatorProfile:', error);
    return null;
  }
};

/**
 * Upload profile picture to Supabase storage
 */
export const uploadProfilePicture = async (walletAddress: string, file: File): Promise<string | null> => {
  try {
    console.log('Uploading profile picture for wallet:', walletAddress, 'file:', file.name);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${walletAddress}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('creator_profile_pictures')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      toast.error('Failed to upload profile picture');
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('creator_profile_pictures')
      .getPublicUrl(fileName);

    console.log('Profile picture uploaded successfully:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    toast.error('Failed to upload profile picture');
    return null;
  }
};

/**
 * Create or update a creator profile (fixed type issues)
 */
export const upsertCreatorProfile = async (profile: CreatorProfileData): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('creator_profiles')
      .upsert(profile, { onConflict: 'wallet_address' });

    if (error) {
      console.error('Error upserting creator profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in upsertCreatorProfile:', error);
    return false;
  }
};

/**
 * Regenerate stream key for a creator
 */
export const regenerateStreamKey = async (walletAddress: string): Promise<CreatorProfile | null> => {
  try {
    console.log('Regenerating stream key for wallet:', walletAddress);
    
    // Clear existing persistent credentials so new ones will be generated on next stream creation
    const { error: updateError } = await supabase
      .from('creator_profiles')
      .update({
        persistent_stream_key: null,
        persistent_rtmp_url: null,
        persistent_ingress_id: null,
        persistent_room_name: null,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress);

    if (updateError) {
      console.error('Error clearing stream credentials:', updateError);
      toast.error('Failed to regenerate stream key');
      throw updateError;
    }

    // Fetch the updated profile
    const updatedProfile = await getCreatorProfile(walletAddress);
    
    if (updatedProfile) {
      toast.success('Stream key will be regenerated on your next stream creation');
    }
    
    return updatedProfile;
  } catch (error) {
    console.error('Error regenerating stream key:', error);
    toast.error('Failed to regenerate stream key');
    throw error;
  }
};
