
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CachedViewerData {
  count: number;
  timestamp: number;
  streamId: string;
}

// In-memory cache for viewer counts
const viewerCache = new Map<string, CachedViewerData>();
const CACHE_DURATION = 2000; // 2 seconds cache

export const useCachedViewerCount = (streamId: string | undefined, enabled: boolean = true, isLive: boolean = true) => {
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const optimisticCountRef = useRef<number>(0);

  // Optimistically increment when user joins
  useEffect(() => {
    if (streamId && enabled && optimisticCountRef.current === 0) {
      optimisticCountRef.current = 1;
      setViewerCount(prev => prev + 1);
    }
  }, [streamId, enabled]);

  useEffect(() => {
    if (!streamId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setViewerCount(0);
      return;
    }

    const fetchViewerCount = async () => {
      // Check cache first
      const cached = viewerCache.get(streamId);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setViewerCount(Math.max(cached.count, optimisticCountRef.current));
        return;
      }

      try {
        setIsLoading(true);
        
        // Use optimized edge function for viewer counts
        const { data, error } = await supabase.functions.invoke('cached-viewer-count', {
          body: { streamId },
          method: 'POST',
        });

        if (error) {
          console.error('Failed to fetch cached viewer count:', error);
          return;
        }

        const viewerCount = data?.viewerCount || 0;
        
        // Update cache with viewer count (already includes baseline from database)
        viewerCache.set(streamId, {
          count: viewerCount,
          timestamp: now,
          streamId
        });

        setViewerCount(Math.max(viewerCount, optimisticCountRef.current));
      } catch (error) {
        console.error('Error fetching cached viewer count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchViewerCount();

    // Faster polling with cache
    intervalRef.current = setInterval(fetchViewerCount, 2500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [streamId, enabled]);

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return { 
    viewerCount, 
    isLoading,
    isOptimistic: optimisticCountRef.current > 0
  };
};
