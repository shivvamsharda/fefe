
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTopContent = () => {
  // Fetch top VODs from unique creators ordered by total_views DESC
  const {
    data: uniqueCreatorVodsData,
    isLoading: uniqueVodsLoading,
    error: uniqueVodsError
  } = useQuery({
    queryKey: ['topVodsByViewsUniqueCreators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vods')
        .select(`
          id,
          mux_playback_id,
          title,
          thumbnail_url,
          total_views,
          user_id,
          user_profiles!inner(
            id,
            username,
            avatar_url,
            wallet_address
          ),
          streams(category)
        `)
        .eq('deleted_by_user', false)
        .order('total_views', { ascending: false });
      
      if (error) throw error;
      
      // Filter to get unique creators (top VOD per creator) and limit to 12
      const uniqueCreatorVods = [];
      const seenCreators = new Set();
      
      for (const vod of data || []) {
        if (!seenCreators.has(vod.user_id) && uniqueCreatorVods.length < 12) {
          seenCreators.add(vod.user_id);
          uniqueCreatorVods.push(vod);
        }
      }
      
      return uniqueCreatorVods;
    },
    staleTime: Infinity, // Don't refetch until page reload
  });

  // Fetch additional VODs if we need more content (fallback)
  const {
    data: additionalVodsData,
    isLoading: additionalVodsLoading,
    error: additionalVodsError
  } = useQuery({
    queryKey: ['additionalVodsByViews', uniqueCreatorVodsData?.length || 0],
    queryFn: async () => {
      // Only fetch if we have fewer than 18 unique creator VODs
      if ((uniqueCreatorVodsData?.length || 0) >= 18) return [];
      
      const excludeIds = uniqueCreatorVodsData?.map(vod => vod.id) || [];
      const needed = 18 - (uniqueCreatorVodsData?.length || 0);
      
      const { data, error } = await supabase
        .from('vods')
        .select(`
          id,
          mux_playback_id,
          title,
          thumbnail_url,
          total_views,
          user_id,
          user_profiles!inner(
            id,
            username,
            avatar_url,
            wallet_address
          ),
          streams(category)
        `)
        .eq('deleted_by_user', false)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('total_views', { ascending: false })
        .limit(needed);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!uniqueCreatorVodsData && uniqueCreatorVodsData.length < 18,
    staleTime: Infinity,
  });

  const topContent = useMemo(() => {
    const uniqueVods = uniqueCreatorVodsData || [];
    const additionalVods = additionalVodsData || [];
    
    // Combine unique creator VODs with additional VODs
    const allVods = [...uniqueVods, ...additionalVods];
    
    return {
      vods: allVods,
      total: allVods.length
    };
  }, [uniqueCreatorVodsData, additionalVodsData]);

  const isLoading = uniqueVodsLoading || additionalVodsLoading;
  const error = uniqueVodsError || additionalVodsError;

  return {
    topContent,
    isLoading,
    error
  };
};
