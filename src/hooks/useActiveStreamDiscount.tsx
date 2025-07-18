
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/context/WalletContext';

export const useActiveStreamDiscount = () => {
  const { walletAddress } = useWallet();
  const [hasActiveStream, setHasActiveStream] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) {
      setHasActiveStream(false);
      setIsLoading(false);
      return;
    }

    const checkActiveStream = async () => {
      try {
        // Check for any active stream by the user
        const { data, error } = await supabase
          .from('streams')
          .select('id, status, user_id')
          .eq('status', 'active')
          .eq('user_id', (await supabase
            .from('user_profiles')
            .select('id')
            .eq('wallet_address', walletAddress)
            .single()
          ).data?.id || '')
          .limit(1);

        if (error) {
          console.error('Error checking active streams:', error);
          setHasActiveStream(false);
        } else {
          setHasActiveStream((data || []).length > 0);
        }
      } catch (error) {
        console.error('Error in active stream check:', error);
        setHasActiveStream(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkActiveStream();

    // Set up real-time subscription to monitor stream status changes
    const channel = supabase
      .channel('stream-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streams',
          filter: `status=eq.active`
        },
        () => {
          checkActiveStream();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletAddress]);

  const applyDiscount = (originalPrice: number) => {
    return hasActiveStream ? originalPrice * 0.5 : originalPrice;
  };

  const getDiscountPercentage = () => {
    return hasActiveStream ? 50 : 0;
  };

  return {
    hasActiveStream,
    isLoading,
    applyDiscount,
    getDiscountPercentage
  };
};
