
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/context/WalletContext';

interface ActiveStream {
  id: string;
  title: string;
}

export const useActiveLiveKitStream = () => {
  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { hasWalletCapability, userProfile } = useWallet();

  useEffect(() => {
    if (!hasWalletCapability || !userProfile?.id) {
      setActiveStream(null);
      setIsLoading(false);
      return;
    }

    const fetchActiveStream = async () => {
      try {
        const { data, error } = await supabase
          .from('streams')
          .select('id, title')
          .eq('user_id', userProfile.id)
          .eq('status', 'active')
          .eq('source_type', 'livekit')
          .eq('stream_type', 'obs')
          .maybeSingle();

        if (error) {
          console.error('Error fetching active stream:', error);
          setActiveStream(null);
        } else {
          setActiveStream(data);
        }
      } catch (error) {
        console.error('Error in fetchActiveStream:', error);
        setActiveStream(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveStream();

    // Set up real-time subscription to detect stream status changes
    const channel = supabase
      .channel('active-stream-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streams',
          filter: `user_id=eq.${userProfile.id}`
        },
        () => {
          // Refetch when streams table changes for this user
          fetchActiveStream();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id, hasWalletCapability]);

  return { activeStream, isLoading };
};
