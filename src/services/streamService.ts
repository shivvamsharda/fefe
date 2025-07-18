import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export const createStream = async (
  userId: string,
  title: string,
  description: string = "",
  category: string = "",
  tags: string[] = [],
  tokenContractAddress?: string,
  language?: string
): Promise<any> => {
  try {
    console.log("Creating stream with params:", { userId, title, description, category, tags, tokenContractAddress, language });
    
    const bodyPayload: any = {
      action: 'create',
      userId,
      title,
      description,
      category,
      tags,
      language,
      // Enhanced configuration for low latency
      lowLatencyMode: true,
      reducedLatency: true
    };

    if (tokenContractAddress) {
      bodyPayload.tokenContractAddress = tokenContractAddress;
    }
    
    const { data, error } = await supabase.functions.invoke('mux-streaming', {
      method: 'POST',
      body: bodyPayload
    });

    if (error) {
      console.error("Error from edge function:", error);
      throw new Error(`Failed to create stream: ${error.message}`);
    }

    if (!data) {
      throw new Error("No data returned from stream creation");
    }

    console.log("Stream created successfully:", data);
    return data;
  } catch (error: any) {
    console.error("Error in createStream service:", error);
    throw new Error(`Error creating stream: ${error.message}`);
  }
};

export const stopStream = async (streamId: string): Promise<boolean> => {
  try {
    console.log(`Stopping stream: ${streamId}`);
    
    const { data, error } = await supabase.functions.invoke('mux-streaming', {
      method: 'POST',
      body: { 
        action: 'stop', 
        streamId
      }
    });

    if (error) {
      console.error("Error from edge function when stopping stream:", error);
      return false;
    }

    if (data?.success) {
      console.log("Stream stopped successfully:", data.message);
      return true;
    } else {
      console.error("Stream stop failed:", data?.error || "Unknown error");
      return false;
    }
  } catch (error: any) {
    console.error("Error in stopStream service:", error);
    return false;
  }
};

export const checkMuxEnvironment = async (): Promise<{ 
  success: boolean, 
  error?: string, 
  isProduction?: boolean 
}> => {
  try {
    console.log("Checking Mux environment configuration...");
    
    const { data, error } = await supabase.functions.invoke('mux-streaming', {
      method: 'GET',
    });

    if (error) {
      console.error("Error checking Mux environment:", error);
      if (error.message && error.message.toLowerCase().includes("request with get/head method cannot have body")) {
        console.warn("Attempted to send GET request with body to mux-streaming for check-env. Adjusting...");
        const { data: retryData, error: retryError } = await supabase.functions.invoke('mux-streaming', {
          method: 'GET',
        });
        if (retryError) {
           return { success: false, error: `Failed to check Mux environment (retry): ${retryError.message}` };
        }
        console.log("Mux environment check response (retry):", retryData);
        return {
          success: retryData?.success || false,
          error: retryData?.error,
          isProduction: retryData?.isProduction
        };
      }
      return { 
        success: false, 
        error: `Failed to check Mux environment: ${error.message}` 
      };
    }

    console.log("Mux environment check response:", data);
    return {
      success: data?.success || false,
      error: data?.error,
      isProduction: data?.isProduction
    };
  } catch (error: any) {
    console.error("Error in checkMuxEnvironment service:", error);
    return { 
      success: false, 
      error: `Error checking Mux environment: ${error.message}`
    };
  }
};

export const getMuxRtmpUrl = (): string => {
  return "rtmp://global-live.mux.com/app";
};

export const getMuxPlaybackUrl = (playbackId: string): string => {
  return `https://stream.mux.com/${playbackId}.m3u8`;
};

export const getStreamDetails = async (streamId: string): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('mux-streaming', {
      method: 'GET',
    });

    if (error) {
      console.error("Error getting stream details:", error);
      throw new Error(`Failed to get stream details: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error("Error in getStreamDetails service:", error);
    return null;
  }
};

export const updateStreamStatus = async (
  streamId: string, 
  status: string,
  forceUpdate: boolean = false,
  debug: boolean = false
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('mux-streaming', {
      method: 'POST',
      body: { 
        action: 'update-status', 
        streamId, 
        status,
        forceUpdate,
        debug 
      }
    });

    if (error) {
      console.error("Error updating stream status:", error);
      return false;
    }

    return data?.success || false;
  } catch (error: any) {
    console.error("Error in updateStreamStatus service:", error);
    return false;
  }
};

export const debugStreamStatus = async (streamId: string): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('mux-streaming', {
      method: 'GET',
    });

    if (error) {
      console.error("Error debugging stream status:", error);
      return { error: error.message };
    }

    return data;
  } catch (error: any) {
    console.error("Error in debugStreamStatus service:", error);
    return { error: error.message };
  }
};

export const getActiveStreams = async () => {
  const { data, error } = await supabase
    .from('streams')
    .select(`
      id,
      title,
      description,
      category,
      thumbnail,
      viewer_count,
      livekit_room_name,
      stream_type,
      source_type,
      user_profiles (
        id,
        username,
        avatar_url,
        wallet_address
      )
    `)
    .in('status', ['active'])
    .order('viewer_count', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching active streams:', error);
    throw error;
  }

  return data || [];
};

export const getLiveSpacesV2 = async () => {
  const { data, error } = await supabase
    .from('spaces_v2')
    .select(`
      id,
      title,
      description,
      category,
      room_name,
      participant_count,
      thumbnail_url,
      host_wallet,
      user_profiles!spaces_v2_host_user_id_fkey (
        id,
        username,
        avatar_url,
        wallet_address
      )
    `)
    .eq('is_live', true)
    .eq('is_public', true)
    .order('participant_count', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching live spaces v2:', error);
    throw error;
  }

  return data || [];
};

export interface ActiveStreamData {
  id: string;
  title: string;
  playback_id: string | null;
  thumbnail: string | null;
  viewer_count: number | null;
  category: string | null;
  language: string | null;
  user_id: string;
  created_at: string;
  user_profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    wallet_address: string | null;
  } | null;
}

export const getActiveStreamByUserId = async (userId: string): Promise<ActiveStreamData | null> => {
  console.log(`Fetching active stream for user ID: ${userId}`);
  const { data, error } = await supabase
    .from('streams')
    .select(`
      id, 
      title,
      playback_id,
      thumbnail,
      viewer_count,
      category,
      language,
      user_id,
      created_at,
      user_profiles (
        id,
        username,
        display_name,
        avatar_url,
        wallet_address
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error(`Error fetching active stream for user ${userId}:`, error);
    throw error;
  }
  if (data) {
    console.log(`Found active stream for user ${userId}:`, data.title);
  } else {
    console.log(`No active stream found for user ${userId}`);
  }
  return data as ActiveStreamData | null;
};

export const getPreviousStreams = async (limit?: number): Promise<any[]> => {
  try {
    console.log("Fetching previous streams...");
    let query = supabase
      .from('streams')
      .select(`
        *,
        language,
        user_profiles (*)
      `)
      .neq('status', 'active')
      .order('updated_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }
      
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching previous streams:", error);
      throw error;
    }
    console.log(`Found ${data?.length || 0} previous streams`);
    return data || [];
  } catch (error: any) {
    console.error("Error in getPreviousStreams service:", error);
    return [];
  }
};

export const syncStreamStatuses = async (): Promise<{
  success: boolean;
  message: string;
  checked: number;
  updated: number;
  errors?: number;
}> => {
  try {
    console.log("Syncing stream statuses with automated cleanup...");
    
    const { data, error } = await supabase.functions.invoke('sync-mux-stream-statuses', {
      method: 'GET'
    });

    if (error) {
      console.error("Error syncing stream statuses:", error);
      toast({
        title: "Sync Failed",
        description: `Could not sync stream statuses: ${error.message}`,
        variant: "destructive"
      });
      return { 
        success: false, 
        message: `Failed to sync stream statuses: ${error.message}`,
        checked: 0,
        updated: 0
      };
    }

    console.log("Stream status sync results:", data);
    
    if (data.success) {
      const message = `Synced ${data.updated} of ${data.checked} streams`;
      toast({
        title: "Stream Statuses Synced",
        description: message
      });
    }
    
    return {
      success: data.success || false,
      message: data.message || "Unknown result",
      checked: data.checked || 0,
      updated: data.updated || 0,
      errors: data.errors
    };
  } catch (error: any) {
    console.error("Error in syncStreamStatuses service:", error);
    toast({
      title: "Sync Error",
      description: `Error syncing stream statuses: ${error.message}`,
      variant: "destructive"
    });
    return {
      success: false,
      message: `Error: ${error.message}`,
      checked: 0,
      updated: 0
    };
  }
};

export const getVods = async (limit?: number): Promise<VodData[]> => {
  console.log('Fetching VODs...');
  
  try {
    let query = supabase
      .from('vods')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        mux_playback_id,
        user_id,
        created_at,
        duration,
        total_views,
        user_profiles (
          id,
          username,
          avatar_url,
          wallet_address,
          display_name,
          creator_profiles (
            display_name,
            profile_picture_url,
            wallet_address
          )
        ),
        streams (
          category,
          language
        )
      `)
      .eq('deleted_by_user', false)
      .order('created_at', { ascending: false });

    // Only apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching VODs:', error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} VODs`);
    return data || [];
  } catch (error) {
    console.error('Error in getVods:', error);
    throw error;
  }
};

export const getVodsByCategory = async (category: string, limit?: number): Promise<VodData[]> => {
  console.log(`Fetching VODs for category: ${category}`);
  
  try {
    let query = supabase
      .from('vods')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        mux_playback_id,
        user_id,
        created_at,
        duration,
        total_views,
        user_profiles (
          id,
          username,
          avatar_url,
          wallet_address,
          display_name,
          creator_profiles (
            display_name,
            profile_picture_url,
            wallet_address
          )
        ),
        streams (
          category,
          language
        )
      `)
      .eq('deleted_by_user', false)
      .eq('streams.category', category)
      .order('created_at', { ascending: false });

    // Only apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching VODs for category ${category}:`, error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} VODs for category ${category}`);
    return data || [];
  } catch (error) {
    console.error(`Error in getVodsByCategory for ${category}:`, error);
    throw error;
  }
};

export const getVodByPlaybackId = async (playbackId: string) => {
  console.log(`Fetching VOD by playbackId: ${playbackId}`);
  const { data, error } = await supabase
    .from('vods')
    .select(`
      id,
      title,
      description,
      thumbnail_url,
      mux_playback_id,
      user_id,
      created_at,
      duration,
      total_views,
      user_profiles (
        id,
        username,
        avatar_url,
        wallet_address 
      ),
      streams (
        category,
        language
      )
    `)
    .eq('mux_playback_id', playbackId)
    .eq('deleted_by_user', false)
    .maybeSingle(); 

  if (error) {
    console.error('Error fetching VOD by playbackId:', error);
    throw error;
  }
  if (data) {
    console.log(`Fetched VOD: ${data.title}`);
    if (data.user_profiles) {
        console.log('VOD user_profile data:', data.user_profiles);
    }
  } else {
    console.log(`No VOD found for playbackId: ${playbackId}`);
  }
  return data;
};

export interface VodData {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  mux_playback_id: string;
  user_id: string;
  created_at: string;
  duration: number | null;
  total_views: number; // Now includes the database-calculated total views
  user_profiles: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    wallet_address: string | null;
    display_name: string | null;
    creator_profiles?: {
      display_name: string;
      profile_picture_url: string | null;
      wallet_address: string;
    } | null;
  } | null;
  streams: {
    category: string | null;
    language: string | null;
  } | null;
}

// Type alias for consistency with existing code
export type CreatorVod = VodData;

export const getVodsByUserId = async (userId: string, limit?: number): Promise<CreatorVod[]> => {
  console.log(`Fetching VODs for user ID: ${userId} with limit: ${limit}`);
  let query = supabase
    .from('vods')
    .select(`
      id,
      title,
      description,
      thumbnail_url,
      mux_playback_id,
      user_id,
      created_at,
      duration,
      total_views,
      user_profiles (
        id,
        username,
        avatar_url,
        wallet_address,
        display_name,
        creator_profiles (
          display_name,
          profile_picture_url,
          wallet_address
        )
      ),
      streams (
        category,
        language 
      )
    `)
    .eq('user_id', userId)
    .eq('deleted_by_user', false)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching VODs for user ${userId}:`, error);
    throw error;
  }
  console.log(`Fetched ${data?.length || 0} VODs for user ${userId}`);
  return (data as CreatorVod[]) || [];
};

export const getVodsCountByUserId = async (userId: string): Promise<number> => {
  console.log(`Fetching VOD count for user ID: ${userId}`);
  const { count, error } = await supabase
    .from('vods')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('deleted_by_user', false);

  if (error) {
    console.error(`Error fetching VOD count for user ${userId}:`, error);
    throw error;
  }
  console.log(`VOD count for user ${userId} is ${count}`);
  return count || 0;
};

export const getStreamsCountByUserId = async (userId: string): Promise<number> => {
  console.log(`Fetching stream count for user ID: ${userId}`);
  const { count, error } = await supabase
    .from('streams')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error(`Error fetching stream count for user ${userId}:`, error);
    throw error;
  }
  console.log(`Stream count for user ${userId} is ${count ?? 0}`);
  return count || 0;
};

export const getLastStreamedAtByUserId = async (userId: string): Promise<string | null> => {
  console.log(`Fetching last streamed date for user ID: ${userId}`);
  const { data, error } = await supabase
    .from('streams')
    .select('updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching last streamed date for user ${userId}:`, error);
    throw error;
  }
  
  if (data && data.updated_at) {
    console.log(`Last streamed date for user ${userId} is ${data.updated_at}`);
    return data.updated_at;
  } else {
    console.log(`No stream data found to determine last streamed date for user ${userId}`);
    return null;
  }
};
