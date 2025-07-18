
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BunnyVideoStatus {
  videoId: string;
  status: number;
  width?: number;
  height?: number;
  length?: number;
}

/**
 * Manually check and update a single video's status
 */
export const checkVideoStatus = async (videoId: string): Promise<boolean> => {
  try {
    console.log('Checking status for video:', videoId);
    
    const { data, error } = await supabase.functions.invoke('bunny-stream-status', {
      body: { videoId }
    });

    if (error) {
      console.error('Error checking video status:', error);
      toast.error("Failed to check video status");
      return false;
    }

    console.log('Video status check result:', data);
    return true;
  } catch (error) {
    console.error('Error checking video status:', error);
    toast.error("Failed to check video status");
    return false;
  }
};

/**
 * Check status for multiple videos
 */
export const checkMultipleVideoStatuses = async (videoIds: string[]): Promise<void> => {
  console.log('Checking status for multiple videos:', videoIds);
  
  const promises = videoIds.map(videoId => checkVideoStatus(videoId));
  await Promise.allSettled(promises);
};
