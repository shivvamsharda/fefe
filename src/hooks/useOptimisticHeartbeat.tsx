
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useOptimisticHeartbeat = (streamId: string | undefined, isActive: boolean = true) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingHeartbeats = useRef<string[]>([]);

  useEffect(() => {
    if (!streamId || !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendHeartbeat = async () => {
      try {
        // Add to pending queue for batching
        pendingHeartbeats.current.push(streamId);
        
        const { data, error } = await supabase.functions.invoke('viewer-tracking', {
          body: { streamId },
          method: 'POST',
        });

        if (error) {
          console.error('Failed to send heartbeat:', error);
          return;
        }

        // Remove from pending queue on success
        pendingHeartbeats.current = pendingHeartbeats.current.filter(id => id !== streamId);
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    };

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Faster heartbeat: reduced from 12s to 5s for better engagement tracking
    intervalRef.current = setInterval(sendHeartbeat, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [streamId, isActive]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
};
