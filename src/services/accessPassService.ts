
import { supabase } from '@/integrations/supabase/client';

export interface AccessPass {
  id: string;
  expires_at: string;
  created_at: string;
  transaction_signature: string;
  hours_remaining: number;
}

export const checkActiveAccessPass = async (walletAddress: string): Promise<AccessPass | null> => {
  try {
    console.log('🔍 Checking active access pass for wallet:', walletAddress);
    
    const { data, error } = await supabase.rpc('check_active_access_pass', {
      input_wallet_address: walletAddress
    });

    if (error) {
      console.error('❌ Error checking access pass:', error);
      return null;
    }

    if (data && data.length > 0) {
      const pass = data[0];
      console.log('✅ Active access pass found:', {
        id: pass.id,
        expires_at: pass.expires_at,
        hours_remaining: pass.hours_remaining
      });
      return pass;
    }

    console.log('❌ No active access pass found');
    return null;
  } catch (error) {
    console.error('❌ Error in checkActiveAccessPass:', error);
    return null;
  }
};

export const createAccessPass = async (
  walletAddress: string, 
  transactionSignature: string
): Promise<string | null> => {
  try {
    console.log('🎫 Creating access pass for wallet:', walletAddress);
    
    const { data, error } = await supabase.rpc('create_access_pass', {
      input_wallet_address: walletAddress,
      input_transaction_signature: transactionSignature
    });

    if (error) {
      console.error('❌ Error creating access pass:', error);
      return null;
    }

    console.log('✅ Access pass created with ID:', data);
    return data;
  } catch (error) {
    console.error('❌ Error in createAccessPass:', error);
    return null;
  }
};

export const getAccessPassStatus = async (walletAddress: string) => {
  const pass = await checkActiveAccessPass(walletAddress);
  
  if (!pass) {
    return {
      hasActivePass: false,
      hoursRemaining: 0,
      expiresAt: null
    };
  }

  return {
    hasActivePass: true,
    hoursRemaining: Math.max(0, pass.hours_remaining),
    expiresAt: pass.expires_at,
    passId: pass.id
  };
};

export const formatRemainingTime = (hoursRemaining: number): string => {
  if (hoursRemaining <= 0) return 'Expired';
  
  const hours = Math.floor(hoursRemaining);
  const minutes = Math.floor((hoursRemaining - hours) * 60);
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};
