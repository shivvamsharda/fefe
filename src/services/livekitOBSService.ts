
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreateLiveKitOBSStreamData {
  title: string;
  description?: string;
  category: string;
  language: string;
  tags?: string[];
  walletAddress: string;
  tokenContractAddress?: string;
}

export interface LiveKitOBSStreamResponse {
  success: boolean;
  stream: any;
  rtmp_url: string;
  stream_key: string;
  room_name: string;
  ingress_id?: string;
}

// Helper function for exponential backoff retry
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`${operationName} attempt ${attempt + 1} failed:`, error);
      
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retrying ${operationName} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Validate stream state before operations
async function validateStreamState(streamId: string, allowedStates: string[]): Promise<any> {
  const { data: stream, error } = await supabase
    .from('streams')
    .select('id, status, livekit_room_name, livekit_ingress_id, created_at')
    .eq('id', streamId)
    .single();

  if (error || !stream) {
    throw new Error('Stream not found');
  }

  if (!allowedStates.includes(stream.status)) {
    throw new Error(`Stream is in ${stream.status} state. Expected one of: ${allowedStates.join(', ')}`);
  }

  // Check if stream is too old (older than 24 hours)
  const streamAge = Date.now() - new Date(stream.created_at).getTime();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  if (streamAge > maxAge) {
    throw new Error('Stream is too old. Please create a new stream.');
  }

  return stream;
}

export const createLiveKitOBSStream = async (
  streamData: CreateLiveKitOBSStreamData
): Promise<LiveKitOBSStreamResponse> => {
  console.log('Creating LiveKit OBS stream with retry logic...');
  
  return await retryOperation(async () => {
    const { data, error } = await supabase.functions.invoke('create-livekit-obs-stream', {
      body: streamData,
    });

    if (error) {
      console.error('Error creating LiveKit OBS stream:', error);
      
      // Provide more specific error messages based on error type
      let userMessage = 'Failed to create stream';
      if (error.message?.includes('configuration error')) {
        userMessage = 'Service temporarily unavailable. Please try again.';
      } else if (error.message?.includes('authentication failed')) {
        userMessage = 'Please reconnect your wallet and try again.';
      } else if (error.message?.includes('timeout')) {
        userMessage = 'Connection timeout. Please check your internet and try again.';
      }
      
      throw new Error(userMessage);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to create stream');
    }

    return data;
  }, 3, 2000, 'create stream');
};

export const startLiveKitOBSStream = async (streamId: string): Promise<void> => {
  console.log('Starting LiveKit OBS stream with enhanced error handling...');
  
  // Validate stream state before starting
  const stream = await validateStreamState(streamId, ['idle']);
  
  if (stream.status === 'ended') {
    throw new Error('This stream has ended and cannot be restarted. Please create a new stream.');
  }

  return await retryOperation(async () => {
    try {
      // Start the stream with timeout - go directly to active status
      const startPromise = Promise.race([
        // Main operation - update directly to active status
        (async () => {
          const { error } = await supabase
            .from('streams')
            .update({ 
              status: 'active',
              started_at: new Date().toISOString()
            })
            .eq('id', streamId);

          if (error) {
            throw new Error('Failed to activate stream');
          }

          console.log('LiveKit OBS stream started successfully:', streamId);
        })(),
        
        // Timeout after 30 seconds
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Stream start timeout')), 30000)
        )
      ]);

      await startPromise;

      // Automatically start Mux egress for VOD recording
      if (stream.livekit_room_name) {
        try {
          console.log('Starting LiveKit OBS egress to Mux for VOD recording...');
          await startLiveKitOBSEgress(streamId, stream.livekit_room_name);
        } catch (egressError) {
          console.error('Warning: Failed to start Mux egress for VOD recording:', egressError);
          // Don't fail the entire operation if egress fails - stream can still go live
          toast.error('VOD recording may not be available for this stream');
        }
      }

    } catch (error) {
      // Rollback: Reset stream status if start fails
      console.error('Stream start failed, rolling back status...');
      try {
        await supabase
          .from('streams')
          .update({ status: 'idle', started_at: null })
          .eq('id', streamId);
      } catch (rollbackError) {
        console.error('Failed to rollback stream status:', rollbackError);
      }
      throw error;
    }
  }, 3, 2000, 'start stream');
};

export const stopLiveKitOBSStream = async (streamId: string): Promise<void> => {
  console.log('Stopping LiveKit OBS stream with graceful shutdown...');
  
  // Validate stream exists (allow any state for stopping)
  const stream = await validateStreamState(streamId, ['active', 'idle']);
  
  return await retryOperation(async () => {
    // Step 1: Stop the Mux egress first to finalize recording
    try {
      console.log('Stopping LiveKit OBS egress to finalize Mux recording...');
      await stopLiveKitOBSEgress(streamId);
    } catch (egressError) {
      console.error('Warning: Failed to stop Mux egress:', egressError);
      // Continue with stream termination even if egress stop fails
    }

    // Step 2: Keep the LiveKit ingress alive for persistent stream keys
    // The ingress remains active so the same RTMP URL/stream key can be reused
    console.log('Keeping LiveKit ingress alive for persistent stream credentials...');

    // Step 3: Final database update - streams cannot be restarted once ended
    const { error: finalError } = await supabase
      .from('streams')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', streamId);

    if (finalError) {
      console.error('Error updating stream status to ended:', finalError);
      throw new Error('Failed to finalize stream termination');
    }

    console.log('Stream stopped and marked as ended - ingress kept alive for next stream');
    
  }, 2, 3000, 'stop stream'); // Fewer retries with longer delays for stop operations
};

export const startLiveKitOBSEgress = async (streamId: string, roomName: string): Promise<void> => {
  console.log('Starting LiveKit OBS egress to Mux for stream:', streamId, 'room:', roomName);
  
  return await retryOperation(async () => {
    const { data, error } = await supabase.functions.invoke('start-livekit-obs-egress', {
      body: { 
        streamId,
        roomName
      }
    });

    if (error) {
      console.error('Error starting LiveKit OBS egress:', error);
      throw new Error(error.message || 'Failed to start LiveKit OBS egress');
    }

    console.log('LiveKit OBS egress started successfully:', data);
  }, 3, 2000, 'start egress');
};

export const stopLiveKitOBSEgress = async (streamId: string): Promise<void> => {
  console.log('Stopping LiveKit OBS egress for stream:', streamId);
  
  return await retryOperation(async () => {
    const { data, error } = await supabase.functions.invoke('stop-livekit-obs-egress', {
      body: { 
        streamId
      }
    });

    if (error) {
      console.error('Error stopping LiveKit OBS egress:', error);
      throw new Error(error.message || 'Failed to stop LiveKit OBS egress');
    }

    console.log('LiveKit OBS egress stopped successfully:', data);
  }, 2, 2000, 'stop egress');
};

export const getLiveKitOBSStreamStatus = async (streamId: string) => {
  return await retryOperation(async () => {
    const { data, error } = await supabase
      .from('streams')
      .select('status, livekit_room_name, livekit_rtmp_url, livekit_stream_key, started_at, ended_at, created_at')
      .eq('id', streamId)
      .single();

    if (error) {
      console.error('Error getting LiveKit OBS stream status:', error);
      throw new Error('Failed to get stream status');
    }

    return data;
  }, 2, 1000, 'get stream status');
};

// New function to perform connection health check
export const performConnectionHealthCheck = async (streamId: string): Promise<boolean> => {
  try {
    console.log('Performing connection health check for stream:', streamId);
    
    const stream = await validateStreamState(streamId, ['idle', 'active']);
    
    if (!stream.livekit_room_name) {
      throw new Error('Stream room not configured');
    }

    // Simple health check - verify stream still exists and is accessible
    const status = await getLiveKitOBSStreamStatus(streamId);
    
    if (!status) {
      throw new Error('Stream status unavailable');
    }

    console.log('Connection health check passed for stream:', streamId);
    return true;
    
  } catch (error) {
    console.error('Connection health check failed:', error);
    return false;
  }
};

// New function to cleanup orphaned streams
export const cleanupOrphanedStream = async (streamId: string): Promise<void> => {
  try {
    console.log('Cleaning up orphaned stream:', streamId);
    
    const { error } = await supabase
      .from('streams')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', streamId);

    if (error) {
      console.error('Failed to cleanup orphaned stream:', error);
    } else {
      console.log('Orphaned stream cleaned up successfully:', streamId);
    }
  } catch (error) {
    console.error('Error during orphaned stream cleanup:', error);
  }
};
