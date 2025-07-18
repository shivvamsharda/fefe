
import { supabase } from "@/integrations/supabase/client";
import { createUploadedVideo, updateUploadedVideo } from "./uploadedVideoService";
import { toast } from "sonner";
import { useWallet } from "@/context/WalletContext";

export interface BunnyStreamUploadResponse {
  videoId: string;
  libraryId: string;
  playbackUrl: string;
  thumbnailUrl?: string;
}

export interface VideoMetadata {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  language?: string;
  visibility?: string;
  thumbnail?: File;
}

/**
 * Upload video to Bunny Stream via edge function
 */
export const uploadToBunnyStream = async (
  file: File,
  metadata: VideoMetadata,
  onProgress?: (progress: number) => void
): Promise<string | null> => {
  try {
    console.log('Starting Bunny Stream upload for file:', file.name);
    console.log('Metadata:', metadata);
    
    // Create FormData for the upload
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.language) formData.append('language', metadata.language);
    if (metadata.visibility) formData.append('visibility', metadata.visibility);
    if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags));
    if (metadata.thumbnail) formData.append('thumbnail', metadata.thumbnail);

    // Check if user is authenticated and get their information
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no standard session, try to get wallet address from localStorage
    if (!session) {
      const walletSession = localStorage.getItem('wallet_session');
      if (walletSession) {
        try {
          const parsedSession = JSON.parse(walletSession);
          if (parsedSession.wallet_address && parsedSession.authenticated) {
            console.log('Using wallet authentication for upload');
            formData.append('wallet_address', parsedSession.wallet_address);
          } else {
            toast.error("You must be logged in to upload videos");
            return null;
          }
        } catch (error) {
          console.error('Error parsing wallet session:', error);
          toast.error("You must be logged in to upload videos");
          return null;
        }
      } else {
        toast.error("You must be logged in to upload videos");
        return null;
      }
    } else {
      console.log('Using standard Supabase authentication for upload');
    }

    console.log('Calling bunny-stream-upload edge function...');

    // Upload via edge function
    const { data, error } = await supabase.functions.invoke('bunny-stream-upload', {
      body: formData,
    });

    if (error) {
      console.error('Bunny Stream upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }

    if (!data || !data.success) {
      console.error('Bunny Stream upload failed:', data?.error || 'Unknown error');
      toast.error(`Upload failed: ${data?.error || 'Unknown error'}`);
      return null;
    }

    console.log('Bunny Stream upload successful:', data);
    return data.videoId;

  } catch (error) {
    console.error('Error uploading to Bunny Stream:', error);
    toast.error("Upload failed. Please try again.");
    return null;
  }
};

/**
 * Get video status from Bunny Stream
 */
export const getBunnyVideoStatus = async (videoId: string) => {
  try {
    console.log('Getting video status for:', videoId);
    
    const { data, error } = await supabase.functions.invoke('bunny-stream-status', {
      body: { videoId }
    });

    if (error) {
      console.error('Error getting video status:', error);
      return null;
    }

    console.log('Video status response:', data);
    return data;
  } catch (error) {
    console.error('Error getting video status:', error);
    return null;
  }
};
