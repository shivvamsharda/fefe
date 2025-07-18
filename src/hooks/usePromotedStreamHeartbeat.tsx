import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePromotedStreamHeartbeat = (
  promotedStreamId: string | undefined, 
  userUuid: string | undefined,
  isActive: boolean = true
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!promotedStreamId || !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('viewer-tracking', {
          body: { 
            promotedStreamId,
            userUuid 
          },
          method: 'POST',
        });

        if (error) {
          console.error('Failed to send promoted stream heartbeat:', error);
          return;
        }

        console.log('Promoted stream heartbeat sent successfully');
      } catch (error) {
        console.error('Error sending promoted stream heartbeat:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 15 seconds for points tracking
    intervalRef.current = setInterval(sendHeartbeat, 15000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [promotedStreamId, userUuid, isActive]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
};