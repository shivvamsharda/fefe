
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for stream data
const streamCache = new Map();
const CACHE_DURATION = 3000; // 3 seconds cache

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
    const cached = streamCache.get(streamId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`Returning cached data for stream ${streamId}`);
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching fresh data for stream ${streamId}`);

    // Optimized single query with all needed data - using correct column names
    const { data: streamData, error } = await supabaseClient
      .from('streams')
      .select(`
        id,
        title,
        description,
        thumbnail,
        status,
        viewer_count,
        category,
        language,
        tags,
        playback_id,
        created_at,
        updated_at,
        token_contract_address,
        user_profiles!inner (
          id,
          username,
          display_name,
          wallet_address
        )
      `)
      .eq('id', streamId)
      .single();

    if (error) {
      console.error('Error fetching stream data:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch stream data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch creator profile in parallel if needed
    const creatorProfilePromise = supabaseClient
      .from('creator_profiles')
      .select('profile_picture_url, display_name')
      .eq('wallet_address', streamData.user_profiles.wallet_address)
      .single();

    const { data: creatorProfile } = await creatorProfilePromise;

    // Merge creator profile data and map thumbnail_url to thumbnail
    const enhancedStreamData = {
      ...streamData,
      thumbnail_url: streamData.thumbnail, // Map thumbnail to thumbnail_url for consistency
      user_profiles: {
        ...streamData.user_profiles,
        avatar_url: creatorProfile?.profile_picture_url || null
      },
      started_at: streamData.created_at
    };

    // Cache the result
    streamCache.set(streamId, {
      data: enhancedStreamData,
      timestamp: now
    });

    // Clean old cache entries periodically
    if (streamCache.size > 100) {
      const cutoff = now - CACHE_DURATION * 2;
      for (const [key, value] of streamCache.entries()) {
        if (value.timestamp < cutoff) {
          streamCache.delete(key);
        }
      }
    }

    return new Response(
      JSON.stringify(enhancedStreamData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in optimized-stream-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
