
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for viewer counts
const viewerCache = new Map();
const CACHE_DURATION = 2000; // 2 seconds cache

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

    const { streamId } = await req.json();

    if (!streamId) {
      return new Response(
        JSON.stringify({ error: 'Stream ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first
    const cached = viewerCache.get(streamId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return new Response(
        JSON.stringify({ viewerCount: cached.count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the stored viewer count from the streams table (already includes baseline)
    const { data: streamData, error: streamError } = await supabaseClient
      .from('streams')
      .select('viewer_count')
      .eq('id', streamId)
      .single();

    if (streamError) {
      console.error('Error getting stream viewer count:', streamError);
      return new Response(
        JSON.stringify({ error: 'Failed to get stream viewer count' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const viewerCount = streamData?.viewer_count || 0;

    // Cache the result
    viewerCache.set(streamId, {
      count: viewerCount,
      timestamp: now
    });

    return new Response(
      JSON.stringify({ viewerCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cached-viewer-count function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
