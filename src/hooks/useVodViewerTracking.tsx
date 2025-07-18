
import { useEffect, useRef } from 'react';

export const useVodViewerTracking = (vodId: string, isPlaying: boolean = true) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTrackingRef = useRef(false);

  useEffect(() => {
    if (!vodId || !isPlaying) {
      // Stop tracking if no VOD ID or not playing
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isTrackingRef.current = false;
      }
      return;
    }

    // Start tracking if not already tracking
    if (!isTrackingRef.current) {
      console.log('Starting VOD viewer tracking for:', vodId);
      isTrackingRef.current = true;

      const sendHeartbeat = async () => {
        try {
          const response = await fetch('https://gusyejevgytoaodujgbm.supabase.co/functions/v1/viewer-tracking', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1c3llamV2Z3l0b2FvZHVqZ2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMTExNjksImV4cCI6MjA2MjU4NzE2OX0.AsOLU_qW9-24rOkNoHnGd23fzPRlxxYakOFRd7F7uXo`
            },
            body: JSON.stringify({ vodId })
          });

          if (!response.ok) {
            console.error('Failed to send VOD heartbeat:', response.status);
          }
        } catch (error) {
          console.error('Error sending VOD heartbeat:', error);
        }
      };

      // Send initial heartbeat
      sendHeartbeat();

      // Set up interval to send heartbeat every 10 seconds
      intervalRef.current = setInterval(sendHeartbeat, 10000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isTrackingRef.current = false;
      }
    };
  }, [vodId, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isTrackingRef.current = false;
      }
    };
  }, []);
};
