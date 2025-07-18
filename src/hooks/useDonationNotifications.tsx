
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DonationData {
  username: string;
  amount: number;
  tokenType: 'SOL' | 'WENLIVE';
  message?: string;
  avatar?: string;
}

export const useDonationNotifications = (streamId: string) => {
  const [currentDonation, setCurrentDonation] = useState<DonationData | null>(null);

  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`donation-notifications-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `stream_id=eq.${streamId} AND is_donation=eq.true`
        },
        async (payload) => {
          console.log('New donation received:', payload);
          const newMessage = payload.new;
          
          if (newMessage.is_donation && newMessage.donation_amount) {
            // Get user avatar if available
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('avatar_url')
              .eq('wallet_address', newMessage.sender_wallet_address)
              .single();

            // Extract token type from message content if it includes our metadata prefix
            let tokenType: 'SOL' | 'WENLIVE' = 'SOL';
            let cleanMessage = newMessage.message_content;
            
            if (newMessage.message_content?.startsWith('DONATION_TOKEN_TYPE:')) {
              const parts = newMessage.message_content.split('|');
              if (parts.length >= 2) {
                const tokenTypePart = parts[0];
                if (tokenTypePart.includes('WENLIVE')) {
                  tokenType = 'WENLIVE';
                }
                // Remove the metadata prefix from the message
                cleanMessage = parts.slice(1).join('|');
              }
            } else {
              // Fallback detection for older messages without metadata
              if (newMessage.message_content?.includes('WENLIVE') || 
                  newMessage.message_content?.includes('$WENLIVE') ||
                  newMessage.donation_amount >= 100) {
                tokenType = 'WENLIVE';
              }
            }

            setCurrentDonation({
              username: newMessage.sender_display_name,
              amount: newMessage.donation_amount,
              tokenType: tokenType,
              message: cleanMessage,
              avatar: userProfile?.avatar_url || undefined
            });

            // Clear the notification after showing
            setTimeout(() => {
              setCurrentDonation(null);
            }, 6500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  return currentDonation;
};
