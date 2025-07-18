
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ViewerTrackingBatch {
  streamId: string;
  timestamp: number;
}

export const useBatchedViewerTracking = (streamId: string | undefined, isActive: boolean = true) => {
  const batchRef = useRef<ViewerTrackingBatch[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const flushBatch = useCallback(async () => {
    if (batchRef.current.length === 0) return;

    const batch = [...batchRef.current];
    batchRef.current = [];

    try {
      const { error } = await supabase.functions.invoke('batched-viewer-tracking', {
        body: { batch },
        method: 'POST',
      });

      if (error) {
        console.error('Failed to send batched viewer tracking:', error);
        // Re-add failed items to batch for retry
        batchRef.current.unshift(...batch);
      }
    } catch (error) {
      console.error('Error in batched viewer tracking:', error);
      // Re-add failed items to batch for retry
      batchRef.current.unshift(...batch);
    }
  }, []);

  const addToBatch = useCallback((streamId: string) => {
    batchRef.current.push({
      streamId,
      timestamp: Date.now()
    });

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Batch requests for 1 second before sending
    timeoutRef.current = setTimeout(flushBatch, 1000);
  }, [flushBatch]);

  useEffect(() => {
    if (!streamId || !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Send initial tracking immediately
    addToBatch(streamId);

    // Reduced interval for better tracking
    intervalRef.current = setInterval(() => {
      addToBatch(streamId);
    }, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Flush any remaining items
      flushBatch();
    };
  }, [streamId, isActive, addToBatch, flushBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);
};
