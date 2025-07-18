
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ViewerTrackingBatch {
  streamId: string;
  timestamp: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { batch } = await req.json();

    if (!Array.isArray(batch) || batch.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Batch array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing batch of ${batch.length} viewer tracking events`);

    const clientIp = req.headers.get('cf-connecting-ip') || 
                    req.headers.get('x-forwarded-for') || 
                    'unknown';

    // Group by streamId for efficient processing
    const streamGroups = new Map<string, ViewerTrackingBatch[]>();
    
    for (const item of batch) {
      if (!streamGroups.has(item.streamId)) {
        streamGroups.set(item.streamId, []);
      }
      streamGroups.get(item.streamId)!.push(item);
    }

    // Process each stream's heartbeats
    const promises = Array.from(streamGroups.entries()).map(async ([streamId, events]) => {
      try {
        // Use upsert for efficient heartbeat recording
        const { error } = await supabaseClient
          .from('viewer_heartbeats')
          .upsert({
            stream_id: streamId,
            ip_address: clientIp,
            last_seen_at: new Date().toISOString(),
            first_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'stream_id,ip_address'
          });

        if (error) {
          console.error(`Error recording heartbeat for stream ${streamId}:`, error);
          return { streamId, success: false, error: error.message };
        }

        return { streamId, success: true, events: events.length };
      } catch (error) {
        console.error(`Error processing stream ${streamId}:`, error);
        return { streamId, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`Batch processing complete: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: batch.length,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'Promise rejected' })
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in batched-viewer-tracking function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
