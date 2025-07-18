
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { addBaselineForLiveStream } from '@/utils/viewerCountUtils';

export const useOptimisticViewerCount = (streamId: string | undefined, enabled: boolean = true, isLive: boolean = true) => {
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [optimisticCount, setOptimisticCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedRef = useRef(false);

  // Optimistically increment count when user joins
  useEffect(() => {
    if (streamId && enabled && !hasJoinedRef.current) {
      setOptimisticCount(prev => prev + 1);
      hasJoinedRef.current = true;
    }
  }, [streamId, enabled]);

  useEffect(() => {
    if (!streamId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setViewerCount(0);
      setOptimisticCount(0);
      return;
    }

    const fetchViewerCount = async () => {
      try {
        setIsLoading(true);
        
        const SUPABASE_URL = "https://gusyejevgytoaodujgbm.supabase.co";
        const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1c3llamV2Z3l0b2FvZHVqZ2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMTExNjksImV4cCI6MjA2MjU4NzE2OX0.AsOLU_qW9-24rOkNoHnGd23fzPRlxxYakOFRd7F7uXo";
        
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/viewer-tracking?streamId=${encodeURIComponent(streamId)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch viewer count:', response.status, errorText);
          return;
        }

        const responseData = await response.json();
        const actualCount = responseData?.viewerCount || 0;
        const displayCount = addBaselineForLiveStream(actualCount, streamId, isLive);
        setViewerCount(displayCount);
        // Update optimistic count to display count if it's higher
        setOptimisticCount(prev => Math.max(prev, displayCount));
      } catch (error) {
        console.error('Error fetching viewer count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchViewerCount();

    // Faster polling: reduced from 7s to 3s for active streams
    intervalRef.current = setInterval(fetchViewerCount, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [streamId, enabled]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return { 
    viewerCount: Math.max(viewerCount, optimisticCount), 
    isLoading,
    isOptimistic: optimisticCount > viewerCount 
  };
};
