
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Bunny Stream status check request received');

    // Get environment variables
    const BUNNY_API_KEY = Deno.env.get('BUNNY_STREAM_API_KEY');
    const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_STREAM_LIBRARY_ID');

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      console.error('Missing Bunny Stream environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Bunny Stream not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { videoId } = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get video status from Bunny Stream
    const statusResponse = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`, {
      method: 'GET',
      headers: {
        'AccessKey': BUNNY_API_KEY,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Failed to get video status from Bunny Stream:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to get video status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusData = await statusResponse.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        status: statusData.status,
        encoding: statusData.encodeProgress,
        duration: statusData.length,
        width: statusData.width,
        height: statusData.height,
        availableResolutions: statusData.availableResolutions,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in bunny-stream-status function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
