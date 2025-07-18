
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Generate a unique referral code based on user ID - now truly unique
export const generateReferralCode = async (userUuid: string): Promise<string> => {
  // Safety check - don't generate code for empty or invalid UUID
  if (!userUuid || userUuid.length < 8) {
    console.warn('Invalid userUuid provided for referral code generation');
    return '';
  }
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Create a unique code using timestamp + random + part of UUID
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    const random = Math.random().toString(36).slice(-4).toUpperCase();
    const uuidPart = userUuid.replace(/-/g, '').slice(-4).toUpperCase();
    const code = `${timestamp}${random}${uuidPart}`.slice(0, 8);
    
    console.log(`Attempt ${attempts + 1}: Generated referral code candidate:`, code, 'for user:', userUuid);
    
    // Check if this code already exists
    const { data: existingCode } = await supabase
      .from('user_profiles')
      .select('referral_code')
      .eq('referral_code', code)
      .single();
    
    if (!existingCode) {
      console.log('Unique referral code generated:', code, 'for user:', userUuid);
      return code;
    }
    
    attempts++;
    console.log(`Code ${code} already exists, trying again...`);
  }
  
  // Fallback - use UUID with timestamp if we can't generate unique code
  const fallbackCode = `${userUuid.replace(/-/g, '').slice(-8)}${Date.now().toString(36).slice(-4)}`.toUpperCase();
  console.warn('Using fallback referral code:', fallbackCode);
  return fallbackCode;
};

// Get or create referral code for a user (synchronous version for display)
export const getUserReferralCode = (userUuid: string): string => {
  if (!userUuid) {
    console.warn('No userUuid provided for referral code generation');
    return '';
  }
  // For display purposes, generate a temporary code (not stored)
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const uuidPart = userUuid.replace(/-/g, '').slice(-4).toUpperCase();
  return `${timestamp}${uuidPart}`;
};

// Validate if a referral code exists and get the referrer user
export const validateReferralCode = async (code: string): Promise<string | null> => {
  try {
    console.log('Validating referral code:', code);
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, username, referral_code')
      .eq('referral_code', code)
      .not('id', 'eq', '00000000-0000-0000-0000-000000000000')
      .single();

    if (error) {
      console.log('No profile found with referral code:', code, error.message);
      return null;
    }

    if (profile) {
      console.log('Found matching referrer:', profile.username, profile.id);
      return profile.id;
    }

    console.log('No matching referral code found');
    return null;
  } catch (error) {
    console.error('Error validating referral code:', error);
    return null;
  }
};

// Create a referral relationship
export const createReferralRelationship = async (
  referrerUserId: string,
  referredUserId: string,
  referralCode: string
): Promise<boolean> => {
  try {
    console.log('Creating referral relationship:', {
      referrerUserId,
      referredUserId,
      referralCode
    });

    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_user_id: referrerUserId,
        referred_user_id: referredUserId,
        referral_code: referralCode
      })
      .select();

    if (error) {
      console.error('Error creating referral relationship:', error);
      return false;
    }

    console.log('Referral relationship created:', data);
    return true;
  } catch (error) {
    console.error('Error in createReferralRelationship:', error);
    return false;
  }
};

// Get referral statistics for a user
export const getUserReferralStats = async (userUuid: string) => {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        id,
        created_at,
        referred_user_id,
        user_profiles!referrals_referred_user_id_fkey(username)
      `)
      .eq('referrer_user_id', userUuid);

    if (error) {
      console.error('Error fetching referral stats:', error);
      return { totalReferrals: 0, referredUsers: [] };
    }

    return {
      totalReferrals: data?.length || 0,
      referredUsers: data || []
    };
  } catch (error) {
    console.error('Error in getUserReferralStats:', error);
    return { totalReferrals: 0, referredUsers: [] };
  }
};

// Get top referrers for leaderboard
export const getTopReferrers = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        referrer_user_id,
        user_profiles!referrals_referrer_user_id_fkey(username)
      `);

    if (error) {
      console.error('Error fetching top referrers:', error);
      return [];
    }

    // Count referrals per user
    const referralCounts: { [key: string]: { username: string; count: number; userId: string } } = {};
    
    data?.forEach((referral: any) => {
      const userId = referral.referrer_user_id;
      const username = referral.user_profiles?.username || 'Unknown';
      
      if (!referralCounts[userId]) {
        referralCounts[userId] = { username, count: 0, userId };
      }
      referralCounts[userId].count++;
    });

    // Convert to array and sort by count
    return Object.values(referralCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('Error in getTopReferrers:', error);
    return [];
  }
};
