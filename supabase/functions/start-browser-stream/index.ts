
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2.13.0'

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
    let requestBody;
    try {
      const text = await req.text();
      console.log('Raw request body:', text);
      
      if (!text) {
        throw new Error('Empty request body');
      }
      
      requestBody = JSON.parse(text);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: parseError.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId, title, description, category, tags, language } = requestBody;
    
    if (!action || !userId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: action and userId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Starting browser stream with action:', action, 'for user:', userId);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const livekitUrl = Deno.env.get('LIVEKIT_URL')!;
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!;
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!;
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')!;
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')!;
    
    // Validate required environment variables
    if (!supabaseUrl || !supabaseServiceKey || !livekitUrl || !livekitApiKey || !livekitApiSecret || !muxTokenId || !muxTokenSecret) {
      console.error('Missing required environment variables');
      const missing = [];
      if (!supabaseUrl) missing.push('SUPABASE_URL');
      if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      if (!livekitUrl) missing.push('LIVEKIT_URL');
      if (!livekitApiKey) missing.push('LIVEKIT_API_KEY');
      if (!livekitApiSecret) missing.push('LIVEKIT_API_SECRET');
      if (!muxTokenId) missing.push('MUX_TOKEN_ID');
      if (!muxTokenSecret) missing.push('MUX_TOKEN_SECRET');
      
      return new Response(JSON.stringify({ 
        error: 'Missing required environment variables',
        missing: missing
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    if (action === 'create') {
      // Generate unique room name
      const roomName = `browser-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create Mux live stream first
      console.log('Creating Mux live stream...');
      const muxResponse = await fetch('https://api.mux.com/video/v1/live-streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`
        },
        body: JSON.stringify({
          playback_policy: ['public'],
          new_asset_settings: {
            playback_policy: ['public']
          },
          reconnect_window: 60,
          latency_mode: 'low'
        })
      });
      
      if (!muxResponse.ok) {
        const errorText = await muxResponse.text();
        console.error('Failed to create Mux stream:', errorText);
        return new Response(JSON.stringify({ 
          error: `Failed to create Mux stream: ${muxResponse.status}`,
          details: errorText
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const muxStream = await muxResponse.json();
      console.log('Mux stream created:', muxStream.data.id);
      
      // Create LiveKit access token for publisher
      const at = new AccessToken(livekitApiKey, livekitApiSecret, {
        identity: `user-${userId}`,
        ttl: '24h'
      });
      
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: false,
      });
      
      const token = await at.toJwt();
      
      // Create stream record in database
      const { data: stream, error: streamError } = await supabase
        .from('streams')
        .insert({
          user_id: userId,
          title: title || 'Live Browser Stream',
          description: description || '',
          category: category || 'general',
          tags: tags || [],
          language: language || 'en',
          status: 'active',
          source_type: 'livekit',
          stream_type: 'browser',
          stream_method: 'browser',
          livekit_room_name: roomName,
          mux_stream_id: muxStream.data.id,
          mux_stream_key: muxStream.data.stream_key,
          playback_id: muxStream.data.playback_ids[0]?.id || null,
          mux_playback_id: muxStream.data.playback_ids[0]?.id || null,
        })
        .select()
        .single();
      
      if (streamError) {
        console.error('Error creating stream:', streamError);
        return new Response(JSON.stringify({ 
          error: `Failed to create stream: ${streamError.message}`,
          details: streamError
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('Browser stream setup complete - ready for LiveKit connection');
      
      return new Response(JSON.stringify({
        success: true,
        stream,
        livekit: {
          url: livekitUrl,
          token,
          roomName
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: 'Invalid action',
      validActions: ['create']
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in start-browser-stream:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
