
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { streamUrl, platform, referer } = await req.json();
    
    if (!streamUrl || !platform) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: streamUrl and platform' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get environment variables
    const twitchClientId = Deno.env.get('TWITCH_CLIENT_ID');
    
    // Extract domain from referer or use default
    let parentDomain = 'localhost';
    if (referer) {
      try {
        const url = new URL(referer);
        parentDomain = url.hostname;
      } catch (e) {
        console.log('Failed to parse referer URL:', e);
      }
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call the database function with proper parameters
    const { data, error } = await supabase.rpc('generate_embed_url_with_config', {
      stream_url: streamUrl,
      platform: platform,
      client_id: platform === 'twitch' ? twitchClientId : null,
      parent_domain: parentDomain
    });

    if (error) {
      console.error('Database function error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate embed URL' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ embedUrl: data }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-embed-url function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
