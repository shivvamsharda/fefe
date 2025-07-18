
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';


export const useVodViewStats = (vodId: string) => {
  return useQuery({
    queryKey: ['vod-view-stats', vodId],
    queryFn: async () => {
      if (!vodId) return null;
      
      // Get VOD with total_views (baseline already included by database trigger)
      const { data: vodData, error: vodError } = await supabase
        .from('vods')
        .select(`
          id,
          total_views,
          original_stream_id
        `)
        .eq('id', vodId)
        .single();

      if (vodError) {
        console.error('Error fetching VOD data:', vodError);
        return { totalViews: 0, totalWatchTime: 0, currentViewerCount: 0 };
      }

      // Get current VOD viewers from vod_viewer_heartbeats (last 20 seconds)  
      const twentySecondsAgo = new Date(Date.now() - 20 * 1000).toISOString();
      const { data: currentVodViewers, error: currentViewersError } = await supabase
        .from('vod_viewer_heartbeats')
        .select('ip_address')
        .eq('vod_id', vodId)
        .gte('last_seen_at', twentySecondsAgo);

      if (currentViewersError) {
        console.error('Error fetching current VOD viewers:', currentViewersError);
      }

      const currentViewerCount = currentVodViewers?.length || 0;

      // Get VOD watch sessions for total watch time
      const { data: vodSessions, error: vodError2 } = await supabase
        .from('user_watch_sessions')
        .select('duration_seconds')
        .eq('vod_id', vodId)
        .not('ended_at', 'is', null);
      
      if (vodError2) {
        console.error('Error fetching VOD watch sessions:', vodError2);
      }
      
      // Calculate total watch time from sessions
      const totalWatchTime = vodSessions?.reduce((sum, session) => sum + (session.duration_seconds || 0), 0) || 0;
      
      // Total views now properly calculated by database (stream baseline + VOD heartbeats)
      const totalViews = vodData?.total_views || 0;
      
      return {
        totalViews,
        totalWatchTime,
        currentViewerCount
      };
    },
    enabled: !!vodId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 10000, // Refetch every 10 seconds to update current viewer count
  });
};
