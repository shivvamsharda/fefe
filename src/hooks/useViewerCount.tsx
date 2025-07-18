
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useViewerCount = (streamId: string | undefined, enabled: boolean = true, isLive: boolean = true) => {
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
        const viewerCount = responseData?.viewerCount || 0;
        setViewerCount(viewerCount);
      } catch (error) {
        console.error('Error fetching viewer count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchViewerCount();

    // Faster updates for better real-time experience
    intervalRef.current = setInterval(fetchViewerCount, 7000); // Reduced from 10s to 7s

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

  return { viewerCount, isLoading };
};
