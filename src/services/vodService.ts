import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Helper function to get effective wallet address for authenticated users
const getEffectiveWalletAddress = async (): Promise<string | null> => {
  // First check for wallet session (external wallets)
  const walletSession = localStorage.getItem('wallet_session');
  if (walletSession) {
    try {
      const sessionData = JSON.parse(walletSession);
      if (sessionData.wallet_address) {
        return sessionData.wallet_address;
      }
    } catch (error) {
      console.error('Error parsing wallet session:', error);
    }
  }

  // Check for Supabase auth session (Google users)
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    return null;
  }

  // For Google users, get wallet address from user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('wallet_address')
    .eq('google_id', session.user.id)
    .single();

  if (profileError || !userProfile?.wallet_address) {
    console.error('Error getting user profile wallet address:', profileError);
    return null;
  }

  return userProfile.wallet_address;
};

export const deleteVod = async (vodId: string): Promise<boolean> => {
  console.log('Deleting VOD with ID:', vodId);
  
  try {
    const walletAddress = await getEffectiveWalletAddress();
    
    if (!walletAddress) {
      console.error('User not authenticated - no wallet address found');
      toast.error('You must be logged in to delete VODs');
      return false;
    }

    console.log('Using wallet address for deletion:', walletAddress);

    // Call the database function to delete the VOD using wallet address
    const { data, error } = await supabase.rpc('delete_user_vod', {
      vod_id: vodId,
      requesting_wallet_address: walletAddress
    });

    if (error) {
      console.error('Error deleting VOD:', error);
      toast.error(`Failed to delete VOD: ${error.message}`);
      return false;
    }

    if (data) {
      console.log('VOD deleted successfully');
      toast.success('VOD deleted successfully');
      return true;
    }
    
    console.error('VOD deletion failed - no data returned');
    toast.error('Failed to delete VOD');
    return false;
  } catch (error: any) {
    console.error('Error deleting VOD:', error);
    toast.error(`Failed to delete VOD: ${error.message}`);
    return false;
  }
};

export const refreshAllVodDurations = async (): Promise<{
  success: boolean;
  message: string;
  results?: { updated: number; errors: number; total: number };
}> => {
  console.log('Triggering bulk VOD duration refresh...');
  
  try {
    const { data, error } = await supabase.functions.invoke('refresh-vod-durations', {
      body: { refreshAll: true }
    });

    if (error) {
      console.error('Error refreshing VOD durations:', error);
      toast.error(`Failed to refresh VOD durations: ${error.message}`);
      return {
        success: false,
        message: `Failed to refresh VOD durations: ${error.message}`
      };
    }

    console.log('VOD duration refresh completed:', data);
    toast.success(data.message || 'VOD durations refreshed successfully');
    return {
      success: data.success || false,
      message: data.message || 'Unknown result',
      results: data.results
    };
  } catch (error: any) {
    console.error('Error in refreshAllVodDurations:', error);
    toast.error(`Error refreshing VOD durations: ${error.message}`);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
};

export const refreshSingleVodDuration = async (vodId: string, silent: boolean = false): Promise<boolean> => {
  console.log('Refreshing duration for single VOD:', vodId);
  
  try {
    const { data, error } = await supabase.functions.invoke('refresh-vod-durations', {
      body: { vodId }
    });

    if (error) {
      console.error('Error refreshing VOD duration:', error);
      if (!silent) {
        toast.error(`Failed to refresh VOD duration: ${error.message}`);
      }
      return false;
    }

    console.log('VOD duration refresh completed:', data);
    if (data.success && !silent) {
      toast.success(data.message || 'VOD duration refreshed successfully');
    }
    return data.success || false;
  } catch (error: any) {
    console.error('Error in refreshSingleVodDuration:', error);
    if (!silent) {
      toast.error(`Error refreshing VOD duration: ${error.message}`);
    }
    return false;
  }
};
