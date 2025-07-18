
import { supabase } from '@/integrations/supabase/client';

export const uploadPromotedStreamThumbnail = async (file: File, walletAddress: string): Promise<string> => {
  try {
    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${walletAddress}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('promoted-stream-thumbnails')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading thumbnail:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('promoted-stream-thumbnails')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Thumbnail upload service error:', error);
    throw error;
  }
};
