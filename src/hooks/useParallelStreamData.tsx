
import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStreamDetails, updateStreamStatus } from '@/services/streamService';

interface UserProfile {
  id?: string;
  username: string;
  display_name?: string | null;
  wallet_address: string;
  avatar_url?: string | null;
}

interface StreamData {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  status?: string | null;
  viewer_count?: number | null;
  category?: string | null;
  language?: string | null;
  tags?: string[] | null;
  playback_id?: string | null;
  stream_key?: string | null;
  user_profiles: UserProfile; 
  created_at: string;
  updated_at: string;
  started_at?: string;
  token_contract_address?: string | null;
}

export const useParallelStreamData = (streamId: string | undefined) => {
  // Parallel queries for faster loading
  const queries = useQueries({
    queries: [
      // Stream data query
      {
        queryKey: ['stream', streamId],
        queryFn: async (): Promise<StreamData | null> => {
          if (!streamId) return null;
          
          const { data: dbStream, error } = await supabase
            .from('streams')
            .select(`
              *,
              language,
              token_contract_address, 
              user_profiles (
                id, 
                username, 
                display_name,
                wallet_address
              )
            `)
            .eq('id', streamId)
            .single();
          
          if (error || !dbStream) {
            console.error('Error fetching stream:', error);
            if (error) throw error;
            return null;
          }
          
          const userProfile: UserProfile = {
            id: dbStream.user_profiles?.id,
            username: dbStream.user_profiles?.username || 'anonymous',
            display_name: dbStream.user_profiles?.display_name || null,
            wallet_address: dbStream.user_profiles?.wallet_address || '',
            avatar_url: null
          };
          
          return {
            ...(dbStream as any),
            user_profiles: userProfile,
            started_at: dbStream.created_at, 
            token_contract_address: dbStream.token_contract_address || null,
            language: dbStream.language || null
          };
        },
        enabled: !!streamId,
        staleTime: 3000, // Reduced from 10s to 3s for live streams
        refetchInterval: 5000, // Faster refetch
        retry: 2,
        retryDelay: 500 // Faster initial retries
      },
      
      // Creator profile query (runs in parallel)
      {
        queryKey: ['creatorProfile', streamId],
        queryFn: async () => {
          if (!streamId) return null;
          
          // Get creator wallet from stream first
          const { data: stream } = await supabase
            .from('streams')
            .select('user_profiles(wallet_address)')
            .eq('id', streamId)
            .single();
            
          if (!stream?.user_profiles?.wallet_address) return null;
          
          const { data: creatorProfile } = await supabase
            .from('creator_profiles')
            .select('profile_picture_url, display_name')
            .eq('wallet_address', stream.user_profiles.wallet_address)
            .single();
            
          return creatorProfile;
        },
        enabled: !!streamId,
        staleTime: 300000, // Cache creator profiles for 5 minutes
        retry: 1
      },
      
      // Mux data query (runs in parallel)
      {
        queryKey: ['muxData', streamId],
        queryFn: async () => {
          if (!streamId) return null;
          return getStreamDetails(streamId);
        },
        enabled: !!streamId,
        staleTime: 5000,
        retry: 1,
        retryDelay: 300
      },
      
      // Recommended streams (background fetch)
      {
        queryKey: ['recommendedStreams', streamId],
        queryFn: async () => {
          if (!streamId) return [];
          
          const { data, error } = await supabase
            .from('streams')
            .select(`
              id,
              title,
              thumbnail_url,
              status,
              viewer_count,
              category,
              language,
              user_profiles (
                id,
                username,
                display_name,
                avatar_url
              )
            `)
            .neq('id', streamId)
            .eq('status', 'active')
            .limit(3);
          
          if (error) {
            console.error('Error fetching recommended streams:', error);
            return [];
          }
          
          return data || [];
        },
        enabled: !!streamId,
        staleTime: 30000, // Cache recommended streams longer
        retry: 1
      }
    ]
  });

  const [streamQuery, creatorProfileQuery, muxDataQuery, recommendedStreamsQuery] = queries;

  // Combine data from parallel queries
  const streamData = streamQuery.data;
  const creatorProfile = creatorProfileQuery.data;
  const muxData = muxDataQuery.data;
  const recommendedStreams = recommendedStreamsQuery.data;

  // Merge creator profile into stream data
  const enhancedStreamData = streamData ? {
    ...streamData,
    user_profiles: {
      ...streamData.user_profiles,
      avatar_url: creatorProfile?.profile_picture_url || null
    },
    playback_id: muxData?.playback_id || streamData.playback_id,
    status: muxData?.status || streamData.status
  } : null;

  return {
    streamData: enhancedStreamData,
    recommendedStreams,
    isLoading: streamQuery.isLoading,
    isLoadingProfile: creatorProfileQuery.isLoading,
    isLoadingMux: muxDataQuery.isLoading,
    error: streamQuery.error,
    refetch: streamQuery.refetch
  };
};
