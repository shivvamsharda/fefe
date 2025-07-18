
import { useEffect } from 'react';

export const useReferralTracking = () => {
  useEffect(() => {
    // Referral tracking is now handled in WalletContext
    // This hook remains for compatibility
    console.log('Referral tracking initialized - handled by WalletContext');
  }, []);

  return {
    checkAndProcessReferral: () => {
      console.log('Referral processing handled by WalletContext');
    }
  };
};
