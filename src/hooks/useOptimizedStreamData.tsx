
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OptimizedStreamData {
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
  user_profiles: {
    id?: string;
    username: string;
    display_name?: string | null;
    wallet_address: string;
    avatar_url?: string | null;
  };
  created_at: string;
  updated_at: string;
  started_at?: string;
  token_contract_address?: string | null;
}

export const useOptimizedStreamData = (streamId: string | undefined) => {
  return useQuery({
    queryKey: ['optimizedStream', streamId],
    queryFn: async (): Promise<OptimizedStreamData | null> => {
      if (!streamId) return null;
      
      // Use optimized edge function for faster response
      const { data, error } = await supabase.functions.invoke('optimized-stream-data', {
        body: { streamId },
        method: 'POST',
      });

      if (error) {
        console.error('Error fetching optimized stream data:', error);
        throw error;
      }

      return data;
    },
    enabled: !!streamId,
    staleTime: 2000, // Reduced to 2s for live streams
    refetchInterval: 4000, // Faster refetch
    retry: 1, // Quick failure for faster fallbacks
    retryDelay: 300,
    // Enable background refetching for seamless updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true
  });
};
