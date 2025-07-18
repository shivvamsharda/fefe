
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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
    const { streamId, roomName } = await req.json();
    
    console.log('=== STARTING LIVEKIT OBS EGRESS TO MUX ===');
    console.log('Stream ID:', streamId);
    console.log('Room Name:', roomName);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const livekitUrl = Deno.env.get('LIVEKIT_URL')!;
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!;
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!;
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')!;
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')!;
    
    if (!supabaseUrl || !supabaseServiceKey || !livekitUrl || !livekitApiKey || !livekitApiSecret || !muxTokenId || !muxTokenSecret) {
      return new Response(JSON.stringify({ 
        error: 'Missing required environment variables' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!streamId || !roomName) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: streamId and roomName' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // First, create a Mux live stream for recording
    console.log('Creating Mux live stream for LiveKit OBS egress...');
    
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
        low_latency: true,
        latency_mode: 'low',
        reconnect_window: 60,
        max_continuous_duration: 43200 // 12 hours
      })
    });
    
    if (!muxResponse.ok) {
      const errorText = await muxResponse.text();
      console.error('Failed to create Mux stream:', errorText);
      return new Response(JSON.stringify({ 
        error: `Failed to create Mux stream: ${errorText}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const muxData = await muxResponse.json();
    console.log('Mux stream created:', muxData.data.id);
    
    const muxStreamKey = muxData.data.stream_key;
    const muxRtmpUrl = `rtmp://live.mux.com/app/${muxStreamKey}`;
    
    // Configure egress to send to Mux RTMP endpoint
    console.log('Starting LiveKit egress to Mux RTMP...');
    
    // Create the egress request payload for room composite egress
    const egressRequest = {
      room_name: roomName,
      layout: "speaker-light",
      audio_only: false,
      video_only: false,
      stream: {
        protocol: "rtmp",
        urls: [muxRtmpUrl]
      }
    };
    
    // Generate JWT token for LiveKit API
    const now = Math.floor(Date.now() / 1000);
    
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    const payload = {
      iss: livekitApiKey,
      exp: now + 3600,
      nbf: now,
      sub: livekitApiKey,
      video: {
        roomRecord: true,
        roomAdmin: true
      }
    };
    
    const base64UrlEncode = (obj: any) => {
      const jsonStr = JSON.stringify(obj);
      const base64 = btoa(jsonStr);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };
    
    const headerEncoded = base64UrlEncode(header);
    const payloadEncoded = base64UrlEncode(payload);
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(livekitApiSecret);
    const messageData = encoder.encode(`${headerEncoded}.${payloadEncoded}`);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureArray = new Uint8Array(signature);
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const token = `${headerEncoded}.${payloadEncoded}.${signatureBase64}`;
    
    // Call LiveKit API
    const livekitApiUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const egressEndpoint = `${livekitApiUrl}/twirp/livekit.Egress/StartRoomCompositeEgress`;
    
    const livekitResponse = await fetch(egressEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(egressRequest)
    });
    
    if (!livekitResponse.ok) {
      const errorText = await livekitResponse.text();
      console.error('LiveKit API error:', errorText);
      return new Response(JSON.stringify({ 
        error: `LiveKit API failed: ${errorText}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const egressInfo = await livekitResponse.json();
    console.log('LiveKit egress started successfully:', egressInfo.egressId);
    
    // Update stream with both LiveKit egress ID and Mux stream details
    const { error: updateError } = await supabase
      .from('streams')
      .update({ 
        livekit_egress_id: egressInfo.egressId,
        mux_stream_id: muxData.data.id,
        mux_stream_key: muxData.data.stream_key,
        mux_playback_id: muxData.data.playback_ids[0].id,
        playback_id: muxData.data.playback_ids[0].id
      })
      .eq('id', streamId);
      
    if (updateError) {
      console.error('Error updating stream with egress and Mux details:', updateError);
      return new Response(JSON.stringify({ 
        error: `Failed to update stream: ${updateError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('=== LIVEKIT OBS EGRESS TO MUX SETUP COMPLETE ===');
    
    return new Response(JSON.stringify({
      success: true,
      egressId: egressInfo.egressId,
      muxStreamId: muxData.data.id,
      muxPlaybackId: muxData.data.playback_ids[0].id,
      message: 'LiveKit OBS egress to Mux started successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in start-livekit-obs-egress:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
