
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useVodWatchSession = (vodId: string, isPlaying: boolean = false, userId?: string) => {
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!vodId || !userId || !isPlaying) {
      // Stop session if no VOD ID, user ID, or not playing
      if (sessionIdRef.current && heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
        endSession();
      }
      return;
    }

    // Start new session if not already tracking
    if (!sessionIdRef.current) {
      startSession();
    }

    return () => {
      if (sessionIdRef.current && heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
        endSession();
      }
    };
  }, [vodId, userId, isPlaying]);

  const startSession = async () => {
    if (!userId || !vodId) return;

    try {
      console.log('Starting VOD watch session for:', { vodId, userId });
      startTimeRef.current = new Date();

      const { data, error } = await supabase
        .from('user_watch_sessions')
        .insert({
          user_id: userId,
          vod_id: vodId,
          session_type: 'vod',
          started_at: startTimeRef.current.toISOString(),
          last_heartbeat_at: startTimeRef.current.toISOString(),
          is_active: true
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create VOD watch session:', error);
        return;
      }

      sessionIdRef.current = data.id;
      console.log('VOD watch session created:', data.id);

      // Start heartbeat interval every 10 seconds
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 10000);

    } catch (error) {
      console.error('Error starting VOD watch session:', error);
    }
  };

  const sendHeartbeat = async () => {
    if (!sessionIdRef.current || !startTimeRef.current) return;

    try {
      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);

      const { error } = await supabase
        .from('user_watch_sessions')
        .update({
          last_heartbeat_at: now.toISOString(),
          duration_seconds: durationSeconds
        })
        .eq('id', sessionIdRef.current);

      if (error) {
        console.error('Failed to send VOD session heartbeat:', error);
      } else {
        console.log('VOD session heartbeat sent:', { sessionId: sessionIdRef.current, durationSeconds });
      }
    } catch (error) {
      console.error('Error sending VOD session heartbeat:', error);
    }
  };

  const endSession = async () => {
    if (!sessionIdRef.current || !startTimeRef.current) return;

    try {
      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);

      console.log('Ending VOD watch session:', { sessionId: sessionIdRef.current, durationSeconds });

      const { error } = await supabase
        .from('user_watch_sessions')
        .update({
          ended_at: now.toISOString(),
          last_heartbeat_at: now.toISOString(),
          duration_seconds: durationSeconds,
          is_active: false
        })
        .eq('id', sessionIdRef.current);

      if (error) {
        console.error('Failed to end VOD watch session:', error);
      } else {
        console.log('VOD watch session ended successfully');
      }

      sessionIdRef.current = null;
      startTimeRef.current = null;
    } catch (error) {
      console.error('Error ending VOD watch session:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (sessionIdRef.current) {
        endSession();
      }
    };
  }, []);
};
