
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrowserStreamConfig {
  url: string;
  token: string;
  roomName: string;
}

export const createBrowserStream = async (
  userId: string,
  streamData?: any
): Promise<{ stream: any; livekit: BrowserStreamConfig } | null> => {
  try {
    const title = streamData?.title || "Live Browser Stream";
    const description = streamData?.description || "Live browser stream";
    const category = streamData?.category || "general";
    const tags = streamData?.tags || [];
    const language = streamData?.language || "en";
    
    console.log("Creating browser stream with params:", { userId, title, description, category, tags, language });
    
    const { data, error } = await supabase.functions.invoke('start-browser-stream', {
      body: {
        action: 'create',
        userId,
        title,
        description,
        category,
        tags,
        language
      }
    });

    if (error) {
      console.error("Error from edge function:", error);
      throw new Error(`Failed to create browser stream: ${error.message}`);
    }

    if (!data || !data.success) {
      console.error("Invalid response from edge function:", data);
      throw new Error(data?.error || "No data returned from browser stream creation");
    }

    console.log("Browser stream created successfully:", data);
    return {
      stream: data.stream,
      livekit: data.livekit
    };
  } catch (error: any) {
    console.error("Error in createBrowserStream service:", error);
    toast.error("Failed to create browser stream", {
      description: error.message || "There was an error creating your browser stream"
    });
    return null;
  }
};

export const startLivekitEgress = async (streamId: string, roomName: string, muxStreamKey: string): Promise<boolean> => {
  try {
    console.log("=== CALLING START-LIVEKIT-EGRESS EDGE FUNCTION ===");
    console.log("Stream ID:", streamId);
    console.log("Room Name:", roomName);
    console.log("Mux Stream Key exists:", !!muxStreamKey);
    
    const { data, error } = await supabase.functions.invoke('start-livekit-egress', {
      body: {
        streamId,
        roomName,
        muxStreamKey
      }
    });

    console.log("=== EGRESS FUNCTION RESPONSE ===");
    console.log("Error:", error);
    console.log("Data:", data);

    if (error) {
      console.error("Error starting LiveKit egress:", error);
      throw new Error(`Failed to start LiveKit egress: ${error.message}`);
    }

    if (!data || !data.success) {
      console.error("Invalid response when starting egress:", data);
      throw new Error(data?.error || "Failed to start LiveKit egress");
    }

    console.log("LiveKit egress started successfully:", data.egressId);
    return true;
  } catch (error: any) {
    console.error("Error in startLivekitEgress service:", error);
    toast.error("Failed to start stream egress", {
      description: error.message || "There was an error starting the stream egress"
    });
    return false;
  }
};

export const stopBrowserStream = async (streamId: string, userId: string): Promise<boolean> => {
  try {
    console.log("Stopping browser stream:", streamId);
    
    const { data, error } = await supabase.functions.invoke('stop-browser-stream', {
      body: {
        streamId,
        userId
      }
    });

    if (error) {
      console.error("Error stopping browser stream:", error);
      throw new Error(`Failed to stop browser stream: ${error.message}`);
    }

    if (!data || !data.success) {
      console.error("Invalid response when stopping stream:", data);
      throw new Error(data?.error || "Failed to stop browser stream");
    }

    console.log("Browser stream stopped successfully");
    return true;
  } catch (error: any) {
    console.error("Error in stopBrowserStream service:", error);
    toast.error("Failed to stop browser stream", {
      description: error.message || "There was an error stopping your browser stream"
    });
    return false;
  }
};
