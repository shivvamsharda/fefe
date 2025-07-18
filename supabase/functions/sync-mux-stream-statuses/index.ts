
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automated stream status sync...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all streams that are marked as active, regardless of source type
    const { data: activeStreams, error: fetchError } = await supabase
      .from('streams')
      .select('*')
      .eq('status', 'active');
    
    if (fetchError) {
      console.error('Error fetching active streams:', fetchError);
      throw new Error(`Failed to fetch active streams: ${fetchError.message}`);
    }
    
    console.log(`Found ${activeStreams?.length || 0} streams marked as active`);
    
    if (!activeStreams || activeStreams.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active streams to sync',
        checked: 0,
        updated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const updates = [];
    let muxUpdates = 0;
    let livekitUpdates = 0;
    let timeoutUpdates = 0;
    
    // Define timeout threshold (streams active for more than 6 hours without updates)
    const timeoutThreshold = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    const now = new Date();
    
    for (const stream of activeStreams) {
      try {
        let shouldEnd = false;
        let reason = '';
        
        // Check if stream has been active too long without updates (fallback cleanup)
        const lastUpdate = new Date(stream.updated_at);
        const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
        
        if (timeSinceUpdate > timeoutThreshold) {
          shouldEnd = true;
          reason = 'timeout';
          timeoutUpdates++;
          console.log(`Stream ${stream.id} timed out (${Math.round(timeSinceUpdate / (60 * 60 * 1000))}h since last update)`);
        }
        
        // For Mux streams, check actual status
        if (!shouldEnd && stream.source_type === 'mux' && stream.mux_stream_id && muxTokenId && muxTokenSecret) {
          try {
            console.log(`Checking Mux status for stream ${stream.id} with Mux ID ${stream.mux_stream_id}`);
            
            const muxResponse = await fetch(`https://api.mux.com/video/v1/live-streams/${stream.mux_stream_id}`, {
              headers: {
                'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`
              }
            });
            
            if (muxResponse.ok) {
              const muxData = await muxResponse.json();
              const muxStatus = muxData.data.status;
              console.log(`Mux API reports stream ${stream.id} status as: ${muxStatus}`);
              
              // If Mux says the stream is not active, end it
              if (muxStatus !== 'active') {
                shouldEnd = true;
                reason = `mux_${muxStatus}`;
                muxUpdates++;
              }
            } else {
              console.warn(`Failed to check Mux status for stream ${stream.mux_stream_id}: ${muxResponse.status}`);
            }
          } catch (muxError) {
            console.error(`Error checking Mux stream ${stream.mux_stream_id}:`, muxError);
          }
        }
        
        // For LiveKit/browser streams, use timeout-based cleanup since we can't check external status
        if (!shouldEnd && (stream.source_type === 'browser' || stream.source_type === 'livekit')) {
          // More aggressive timeout for browser streams (2 hours)
          const browserTimeoutThreshold = 2 * 60 * 60 * 1000; // 2 hours
          if (timeSinceUpdate > browserTimeoutThreshold) {
            shouldEnd = true;
            reason = 'browser_timeout';
            livekitUpdates++;
            console.log(`Browser/LiveKit stream ${stream.id} timed out`);
          }
        }
        
        // Update stream status if it should be ended
        if (shouldEnd) {
          const { error: updateError } = await supabase
            .from('streams')
            .update({ 
              status: 'ended', 
              updated_at: new Date().toISOString() 
            })
            .eq('id', stream.id);
          
          if (updateError) {
            console.error(`Error updating stream ${stream.id}:`, updateError);
          } else {
            console.log(`Ended stream ${stream.id} (reason: ${reason})`);
            updates.push({ 
              id: stream.id, 
              oldStatus: 'active', 
              newStatus: 'ended',
              reason: reason
            });
          }
        }
        
      } catch (error) {
        console.error(`Error processing stream ${stream.id}:`, error);
      }
    }
    
    const totalUpdated = updates.length;
    console.log(`Sync complete: ${totalUpdated} streams updated (${muxUpdates} Mux, ${livekitUpdates} LiveKit, ${timeoutUpdates} timeouts)`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Sync complete: ${totalUpdated} streams updated`,
      checked: activeStreams.length,
      updated: totalUpdated,
      breakdown: {
        mux: muxUpdates,
        livekit: livekitUpdates,
        timeout: timeoutUpdates
      },
      updates 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in sync-mux-stream-statuses:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
