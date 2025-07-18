import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UploadedVideo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  original_filename: string;
  file_size_bytes?: number;
  duration?: number;
  bunny_video_id: string;
  bunny_library_id: string;
  bunny_playback_url: string;
  bunny_thumbnail_url?: string;
  bunny_encoding_status: string;
  video_width?: number;
  video_height?: number;
  video_format?: string;
  bitrate?: number;
  category?: string;
  tags?: string[];
  language?: string;
  upload_status: string;
  visibility: string;
  upload_metadata?: any;
  deleted_by_user: boolean;
  deleted_at?: string;
  deleted_by_wallet_address?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadedVideoWithCreator extends UploadedVideo {
  creator?: {
    id: string;
    display_name?: string;
    profile_picture_url?: string;
    wallet_address?: string;
  };
}

export interface CreateUploadedVideoData {
  title: string;
  description?: string;
  original_filename: string;
  file_size_bytes?: number;
  bunny_video_id: string;
  bunny_library_id: string;
  bunny_playback_url: string;
  bunny_thumbnail_url?: string;
  category?: string;
  tags?: string[];
  language?: string;
  visibility?: string;
  upload_metadata?: any;
}

/**
 * Get all uploaded videos for a user
 */
export const getUserUploadedVideos = async (userId: string): Promise<UploadedVideo[]> => {
  try {
    console.log('=== getUserUploadedVideos Debug ===');
    console.log('1. Input userId:', userId);
    console.log('2. About to query creator_uploaded_videos table');
    
    const { data, error } = await supabase
      .from('creator_uploaded_videos')
      .select('*')
      .eq('user_id', userId)
      .eq('deleted_by_user', false)
      .order('created_at', { ascending: false });

    console.log('3. Query completed');
    console.log('4. Raw query result:', { data, error });
    console.log('5. Data length:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('6. First video details:', data[0]);
      console.log('7. Video statuses:', data.map(v => ({ id: v.id, title: v.title, status: v.upload_status })));
    }

    if (error) {
      console.error('8. Supabase query error:', error);
      toast.error("Failed to fetch uploaded videos");
      return [];
    }

    console.log('9. Returning videos array with length:', data?.length || 0);
    return data as UploadedVideo[];
  } catch (error) {
    console.error('10. Catch block error in getUserUploadedVideos:', error);
    toast.error("Failed to fetch uploaded videos");
    return [];
  }
};

/**
 * Get all uploaded videos with creator information
 */
export const getUploadedVideosWithCreators = async (
  limit: number = 20,
  offset: number = 0
): Promise<UploadedVideoWithCreator[]> => {
  try {
    const { data, error } = await supabase
      .from('creator_uploaded_videos')
      .select(`
        *,
        user_profiles!inner(
          id,
          wallet_address
        )
      `)
      .eq('deleted_by_user', false)
      .in('upload_status', ['ready', 'processing']) // Include processing videos
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching uploaded videos with creators:', error);
      return [];
    }

    // Now fetch creator profiles separately for each video
    const videosWithCreators = await Promise.all(
      data.map(async (video) => {
        const { data: creatorProfile } = await supabase
          .from('creator_profiles')
          .select('display_name, profile_picture_url')
          .eq('wallet_address', video.user_profiles.wallet_address)
          .single();

        return {
          ...video,
          creator: {
            id: video.user_profiles.id,
            display_name: creatorProfile?.display_name,
            profile_picture_url: creatorProfile?.profile_picture_url,
            wallet_address: video.user_profiles.wallet_address
          }
        };
      })
    );

    return videosWithCreators as UploadedVideoWithCreator[];
  } catch (error) {
    console.error('Error fetching uploaded videos with creators:', error);
    return [];
  }
};

/**
 * Get a single uploaded video by ID
 */
export const getUploadedVideoById = async (videoId: string): Promise<UploadedVideo | null> => {
  try {
    const { data, error } = await supabase
      .from('creator_uploaded_videos')
      .select('*')
      .eq('id', videoId)
      .eq('deleted_by_user', false)
      .single();

    if (error) {
      console.error('Error fetching uploaded video:', error);
      return null;
    }

    return data as UploadedVideo;
  } catch (error) {
    console.error('Error fetching uploaded video:', error);
    return null;
  }
};

/**
 * Get a single uploaded video by ID with creator information
 */
export const getUploadedVideoByIdWithCreator = async (videoId: string): Promise<UploadedVideoWithCreator | null> => {
  try {
    const { data, error } = await supabase
      .from('creator_uploaded_videos')
      .select(`
        *,
        user_profiles!inner(
          id,
          wallet_address
        )
      `)
      .eq('id', videoId)
      .eq('deleted_by_user', false)
      .single();

    if (error) {
      console.error('Error fetching uploaded video with creator:', error);
      return null;
    }

    // Fetch creator profile separately
    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('display_name, profile_picture_url')
      .eq('wallet_address', data.user_profiles.wallet_address)
      .single();

    return {
      ...data,
      creator: {
        id: data.user_profiles.id,
        display_name: creatorProfile?.display_name,
        profile_picture_url: creatorProfile?.profile_picture_url,
        wallet_address: data.user_profiles.wallet_address
      }
    } as UploadedVideoWithCreator;
  } catch (error) {
    console.error('Error fetching uploaded video with creator:', error);
    return null;
  }
};

/**
 * Create a new uploaded video record
 */
export const createUploadedVideo = async (
  userId: string,
  videoData: CreateUploadedVideoData
): Promise<UploadedVideo | null> => {
  try {
    const { data, error } = await supabase
      .from('creator_uploaded_videos')
      .insert([
        {
          user_id: userId,
          ...videoData
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating uploaded video:', error);
      toast.error("Failed to create video record");
      return null;
    }

    toast.success("Video record created successfully!");
    return data as UploadedVideo;
  } catch (error) {
    console.error('Error creating uploaded video:', error);
    toast.error("Failed to create video record");
    return null;
  }
};

/**
 * Update an uploaded video
 */
export const updateUploadedVideo = async (
  videoId: string,
  updates: Partial<UploadedVideo>
): Promise<UploadedVideo | null> => {
  try {
    const { data, error } = await supabase
      .from('creator_uploaded_videos')
      .update(updates)
      .eq('id', videoId)
      .select()
      .single();

    if (error) {
      console.error('Error updating uploaded video:', error);
      toast.error("Failed to update video");
      return null;
    }

    toast.success("Video updated successfully!");
    return data as UploadedVideo;
  } catch (error) {
    console.error('Error updating uploaded video:', error);
    toast.error("Failed to update video");
    return null;
  }
};

/**
 * Delete an uploaded video
 */
export const deleteUploadedVideo = async (
  videoId: string,
  walletAddress: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('delete_user_uploaded_video', {
      video_id: videoId,
      requesting_wallet_address: walletAddress
    });

    if (error) {
      console.error('Error deleting uploaded video:', error);
      toast.error("Failed to delete video");
      return false;
    }

    toast.success("Video deleted successfully!");
    return data;
  } catch (error) {
    console.error('Error deleting uploaded video:', error);
    toast.error("Failed to delete video");
    return false;
  }
};

/**
 * Get public uploaded videos (for browsing)
 */
export const getPublicUploadedVideos = async (
  limit: number = 20,
  offset: number = 0
): Promise<UploadedVideo[]> => {
  try {
    const { data, error } = await supabase
      .from('creator_uploaded_videos')
      .select('*')
      .eq('deleted_by_user', false)
      .eq('upload_status', 'ready')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching public uploaded videos:', error);
      return [];
    }

    return data as UploadedVideo[];
  } catch (error) {
    console.error('Error fetching public uploaded videos:', error);
    return [];
  }
};

// Test function to check database connectivity and user data
export const debugUserVideosQuery = async (userId: string) => {
  try {
    console.log('=== Debug Query Test ===');
    
    // Test 1: Check if user exists in user_profiles
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('User profile test:', { userProfile, userError });
    
    // Test 2: Check all videos in the table (no filters)
    const { data: allVideos, error: allError } = await supabase
      .from('creator_uploaded_videos')
      .select('*')
      .limit(5);
    
    console.log('All videos test (first 5):', { allVideos, allError });
    
    // Test 3: Check videos for this specific user (including deleted)
    const { data: userVideos, error: videoError } = await supabase
      .from('creator_uploaded_videos')
      .select('*')
      .eq('user_id', userId);
    
    console.log('User videos test (including deleted):', { userVideos, videoError });
    
    // Test 4: Check videos by upload status
    const { data: processingVideos, error: processingError } = await supabase
      .from('creator_uploaded_videos')
      .select('*')
      .eq('user_id', userId)
      .eq('upload_status', 'processing');
    
    console.log('Processing videos test:', { processingVideos, processingError });
    
    return {
      userProfile,
      allVideos,
      userVideos,
      processingVideos
    };
  } catch (error) {
    console.error('Debug query error:', error);
    return null;
  }
};
