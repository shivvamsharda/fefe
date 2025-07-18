import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Interface for user profile data
export interface UserProfile {
  id: string;
  wallet_address?: string;
  email?: string;
  google_id?: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  location?: string;
  created_at: string;
  referral_code?: string;
  referral_code_used?: string;
  referred_by_wallet?: string;
  notification_preferences?: any;
  privacy_settings?: any;
  appearance_settings?: any;
  private_key_encrypted?: string;
}

/**
 * Check if a username already exists
 */
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .single();
    
    return !data;
  } catch (error) {
    return true;
  }
};

/**
 * Create a new user profile with the given username (for wallet users)
 */
export const createUserProfile = async (
  walletAddress: string, 
  username: string
): Promise<UserProfile | null> => {
  try {
    const profileData: any = {
      wallet_address: walletAddress,
      username
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .insert([profileData])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        toast.error("Username already taken", {
          description: "Please choose a different username"
        });
      } else {
        toast.error("Failed to create profile", {
          description: error.message
        });
      }
      console.error('Error creating profile:', error);
      return null;
    }
    
    console.log('Profile created successfully:', data);
    toast.success("Profile created successfully!");
    return data as UserProfile;
  } catch (error: any) {
    console.error('Error creating profile:', error);
    toast.error("Failed to create profile", {
      description: error.message
    });
    return null;
  }
};

/**
 * Create a new user profile for Google users
 */
export const createGoogleUserProfile = async (email: string, googleId: string, username: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([
        { email, google_id: googleId, username, wallet_address: null }
      ])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        toast.error("Username already taken", {
          description: "Please choose a different username"
        });
      } else {
        toast.error("Failed to create profile", {
          description: error.message
        });
      }
      console.error('Error creating Google profile:', error);
      return null;
    }
    
    // Google users don't participate in referral system
    toast.success("Profile created successfully!");
    return data as UserProfile;
  } catch (error: any) {
    console.error('Error creating Google profile:', error);
    toast.error("Failed to create profile", {
      description: error.message
    });
    return null;
  }
};

/**
 * Get user profile by wallet address
 */
export const getUserProfileByWallet = async (walletAddress: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data as UserProfile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
};

/**
 * Get user profile by email (for Google users)
 */
export const getUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error fetching profile by email:', error);
      return null;
    }
    
    return data as UserProfile;
  } catch (error) {
    console.error('Error fetching profile by email:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (profileId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', profileId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile", {
        description: error.message
      });
      return null;
    }
    
    toast.success("Profile updated successfully!");
    return data as UserProfile;
  } catch (error: any) {
    console.error('Error updating profile:', error);
    toast.error("Failed to update profile", {
      description: error.message
    });
    return null;
  }
};

/**
 * Get Google user profile with robust lookup (checks both google_id and email)
 * Similar to getCurrentUserProfileId in followService but specifically for Google users
 */
export const getGoogleUserProfile = async (user: any): Promise<UserProfile | null> => {
  try {
    console.log('Looking up Google user profile for:', user.id, user.email);
    
    // First try to find profile by google_id
    if (user.id) {
      const { data: profileByGoogleId, error: googleIdError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('google_id', user.id)
        .maybeSingle();
      
      if (!googleIdError && profileByGoogleId) {
        console.log('Found Google user profile by google_id:', profileByGoogleId.id);
        return profileByGoogleId as UserProfile;
      }
      
      if (googleIdError) {
        console.warn('Error querying by google_id:', googleIdError);
      }
    }
    
    // Then try to find profile by email
    if (user.email) {
      const { data: profileByEmail, error: emailError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      
      if (!emailError && profileByEmail) {
        console.log('Found Google user profile by email:', profileByEmail.id);
        return profileByEmail as UserProfile;
      }
      
      if (emailError) {
        console.warn('Error querying by email:', emailError);
      }
    }
    
    console.warn('No user profile found for Google user:', user.id, user.email);
    return null;
  } catch (error) {
    console.error('Error getting Google user profile:', error);
    return null;
  }
};
