
import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { getCreatorProfileByWallet } from '@/services/creatorProfileService';
import { sendDonation } from '@/services/walletService';
import { toast } from 'sonner';
import { PublicKey } from '@solana/web3.js';

interface PremiumContentAccess {
  hasAccess: boolean;
  isPremium: boolean;
  unlockContent: () => Promise<boolean>;
  unlockPrice?: number;
  isLoading: boolean;
  isSubscriptionLocked: boolean; // New: to differentiate subscription locks
}

/**
 * Hook to check if user has access to premium content, including subscriptions
 * @param contentId The ID of the content/stream to check access for
 * @param creatorWallet The creator's wallet address
 */
export const usePremiumContent = (
  contentId: string,
  creatorWallet: string
): PremiumContentAccess => {
  const { connected, publicKey, provider } = useWallet();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [unlockPrice, setUnlockPrice] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubscriptionLocked, setIsSubscriptionLocked] = useState<boolean>(false);

  const checkAccess = async () => {
    if (!creatorWallet) {
      setIsLoading(false);
      setHasAccess(true); 
      setIsPremium(false);
      console.log('usePremiumContent: No creatorWallet provided, assuming public content.');
      return;
    }

    setIsLoading(true);

    // Check if the current user is the creator of the content
    if (connected && publicKey && publicKey === creatorWallet) {
      console.log('usePremiumContent: Creator accessing their own content. Granting full access.');
      setHasAccess(true);
      setIsPremium(false); // For the creator, their own content isn't "premium locked"
      setIsSubscriptionLocked(false);
      setUnlockPrice(undefined);
      setIsLoading(false);
      return;
    }

    try {
      console.log(`usePremiumContent: Checking access for contentId: ${contentId}, creatorWallet: ${creatorWallet}, userWallet: ${publicKey}`);
      const creatorProfile = await getCreatorProfileByWallet(creatorWallet);

      if (creatorProfile && creatorProfile.subscription_enabled && creatorProfile.subscription_price_sol) {
        console.log('usePremiumContent: Creator has subscriptions enabled.');
        setIsPremium(true);
        setIsSubscriptionLocked(true);
        setUnlockPrice(creatorProfile.subscription_price_sol);

        if (!connected || !publicKey) {
          console.log('usePremiumContent: Wallet not connected for subscription check.');
          setHasAccess(false);
        } else {
          console.log(`usePremiumContent: Checking active subscription for user ${publicKey} to creator ${creatorWallet}.`);
          const { data: activeSubscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select('id')
            .eq('user_wallet_address', publicKey)
            .eq('creator_wallet_address', creatorWallet)
            .gte('expires_at', new Date().toISOString())
            .maybeSingle();

          if (subError) {
            console.error('usePremiumContent: Error checking user subscription:', subError);
            setHasAccess(false);
          } else {
            setHasAccess(!!activeSubscription);
            console.log(`usePremiumContent: Subscription active: ${!!activeSubscription}`);
          }
        }
      } else {
        console.log('usePremiumContent: Creator does not have subscriptions enabled or no profile. Fallback to p- content logic.');
        setIsSubscriptionLocked(false);
        const contentIsPPremium = contentId?.startsWith('p-');
        setIsPremium(contentIsPPremium);
        
        if (!contentIsPPremium) {
          setHasAccess(true); 
          console.log('usePremiumContent: Content is not p-premium, granting access.');
        } else {
          if (!connected || !publicKey) {
            setHasAccess(false);
            console.log('usePremiumContent: Wallet not connected for p-premium check.');
          } else {
            const purchasedContent = localStorage.getItem(`premium-access-${contentId}`);
            if (purchasedContent === publicKey) {
              setHasAccess(true);
              console.log('usePremiumContent: p-premium content already purchased (localStorage).');
            } else {
              setHasAccess(false);
              setUnlockPrice(contentId.includes('super') ? 5 : 2);
              console.log('usePremiumContent: p-premium content not purchased.');
            }
          }
        }
      }
    } catch (error) {
      console.error('usePremiumContent: Error checking premium access:', error);
      setHasAccess(false); // Default to no access on error
      setIsPremium(true); // Assume premium if error occurs during check, to be safe
    } finally {
      setIsLoading(false);
      console.log(`usePremiumContent: Final access state - hasAccess: ${hasAccess}, isPremium: ${isPremium}, isLoading: false`);
    }
  };

  const unlockContent = async (): Promise<boolean> => {
    // Note: 'provider' is now available from useWallet() above
    if (!isPremium || hasAccess || !unlockPrice || !connected || !publicKey || !provider) {
      toast.error("Cannot unlock content at this time.", {
        description: !isPremium ? "Content is not premium." :
                     hasAccess ? "You already have access." :
                     !unlockPrice ? "Unlock price not set." :
                     !connected ? "Wallet not connected." :
                     !publicKey ? "Public key not available." :
                     !provider ? "Wallet provider not available." : ""
      });
      return false;
    }
    
    setIsLoading(true);
    try {
      if (isSubscriptionLocked) {
        const paymentMessage = `Subscription to ${creatorWallet} for 1 month.`;
        // Fix the TypeScript error by explicitly typing the tokenType parameter
        const signature = await sendDonation(
          provider, 
          new PublicKey(publicKey), 
          creatorWallet, 
          unlockPrice, 
          'SOL' as 'SOL' | 'WENLIVE', // Explicitly type as the union type
          paymentMessage
        );

        if (signature) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const { error: insertError } = await supabase
            .from('user_subscriptions')
            .insert({
              user_wallet_address: publicKey,
              creator_wallet_address: creatorWallet,
              subscribed_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              price_paid_sol: unlockPrice,
              transaction_signature: signature,
            });

          if (insertError) {
            console.error('Error saving subscription record:', insertError);
            toast.error("Subscription payment succeeded, but failed to save record.", { description: insertError.message });
            return false;
          }
          
          setHasAccess(true);
          toast.success("Subscribed successfully!");
          return true;
        } else {
          toast.error("Subscription payment failed.");
          return false;
        }
      } else {
        // Handle old p- content unlock logic (demo)
        const success = window.confirm(
          `This is a demo for one-time unlock. In a real implementation, this would initiate a ${unlockPrice} SOL payment to unlock this premium content.`
        );
        
        if (success) {
          localStorage.setItem(`premium-access-${contentId}`, publicKey);
          setHasAccess(true);
          toast.success("Content unlocked (demo)!");
          return true;
        }
        return false;
      }
    } catch (error: any) {
      console.error('Error unlocking content:', error);
      toast.error("Error unlocking content.", { description: error.message });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Ensure creatorWallet is a valid string before proceeding.
    // An empty string or null/undefined for creatorWallet means we can't determine ownership or premium status correctly.
    if (typeof creatorWallet === 'string' && creatorWallet.trim() !== '') {
      console.log(`usePremiumContent: useEffect triggered. ContentId: ${contentId}, CreatorWallet: ${creatorWallet}, Connected: ${connected}, UserPK: ${publicKey}`);
      checkAccess();
    } else {
      // If creatorWallet is not valid, assume content is public or accessible.
      // This prevents locking content unnecessarily if creator info is missing.
      console.log('usePremiumContent: useEffect - creatorWallet is missing or invalid. Assuming public content.');
      setIsLoading(false);
      setHasAccess(true);
      setIsPremium(false);
      setIsSubscriptionLocked(false);
    }
  }, [contentId, creatorWallet, connected, publicKey]); // Add creatorWallet to dependencies

  return {
    hasAccess,
    isPremium,
    unlockContent,
    unlockPrice,
    isLoading,
    isSubscriptionLocked,
  };
};
