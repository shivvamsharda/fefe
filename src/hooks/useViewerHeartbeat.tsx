
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useViewerHeartbeat = (streamId: string | undefined, isActive: boolean = true) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
        const { data, error } = await supabase.functions.invoke('viewer-tracking', {
          body: { streamId },
          method: 'POST',
        });

        if (error) {
          console.error('Failed to send heartbeat:', error);
          return;
        }
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    };

    sendHeartbeat();

    // Faster heartbeat for better tracking accuracy
    intervalRef.current = setInterval(sendHeartbeat, 12000); // Reduced from 15s to 12s

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
