
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createStream, getStreamDetails, getMuxRtmpUrl, getMuxPlaybackUrl } from "./streamService";

// This service acts as a bridge for Mux streaming functionality
export { getMuxRtmpUrl, getMuxPlaybackUrl } from "./streamService";

// Create Mux stream for OBS streaming
export const createMuxStream = async (title: string): Promise<any> => {
  try {
    // Get the current user's profile ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Not authenticated", {
        description: "Please connect your wallet to create a stream"
      });
      return null;
    }
    
    // Get user profile ID from wallet address
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('wallet_address', user.id)
      .single();
    
    if (!userProfile?.id) {
      toast.error("Profile not found", {
        description: "Could not find your user profile"
      });
      return null;
    }
    
    // Create the stream using our stream service
    const stream = await createStream(userProfile.id, title, "", "", []);
    return stream;
  } catch (error: any) {
    console.error("Error creating Mux stream:", error);
    toast.error("Failed to create stream", {
      description: error.message || "There was an error creating your stream"
    });
    return null;
  }
};

export { getStreamDetails };
