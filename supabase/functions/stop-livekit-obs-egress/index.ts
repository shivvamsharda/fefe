
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
    const { streamId } = await req.json();
    
    console.log('=== STOPPING LIVEKIT OBS EGRESS TO MUX ===');
    console.log('Stream ID:', streamId);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const livekitUrl = Deno.env.get('LIVEKIT_URL')!;
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!;
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!;
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')!;
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')!;
    
    if (!streamId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameter: streamId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get stream details
    const { data: stream, error: fetchError } = await supabase
      .from('streams')
      .select('livekit_egress_id, mux_stream_id')
      .eq('id', streamId)
      .single();
    
    if (fetchError || !stream) {
      console.error('Stream not found:', fetchError);
      return new Response(JSON.stringify({ 
        error: 'Stream not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Found stream with egress ID:', stream.livekit_egress_id, 'and Mux stream ID:', stream.mux_stream_id);
    
    // Stop LiveKit egress if it exists
    if (stream.livekit_egress_id) {
      try {
        console.log('Stopping LiveKit egress:', stream.livekit_egress_id);
        
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
        
        // Stop the egress
        const livekitApiUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
        const stopEgressEndpoint = `${livekitApiUrl}/twirp/livekit.Egress/StopEgress`;
        
        const stopResponse = await fetch(stopEgressEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            egress_id: stream.livekit_egress_id
          })
        });
        
        if (stopResponse.ok) {
          console.log('LiveKit egress stopped successfully');
        } else {
          const errorText = await stopResponse.text();
          console.error('Failed to stop LiveKit egress:', errorText);
        }
      } catch (egressError) {
        console.error('Error stopping LiveKit egress:', egressError);
      }
    }
    
    // End Mux live stream if it exists
    if (stream.mux_stream_id) {
      try {
        console.log('Ending Mux live stream:', stream.mux_stream_id);
        const muxResponse = await fetch(`https://api.mux.com/video/v1/live-streams/${stream.mux_stream_id}/complete`, {
          method: 'PUT',
          headers: {
            'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`
          }
        });
        
        if (muxResponse.ok) {
          console.log('Mux live stream ended:', stream.mux_stream_id);
        } else {
          console.error('Failed to end Mux stream:', await muxResponse.text());
        }
      } catch (muxError) {
        console.error('Error ending Mux stream:', muxError);
      }
    }
    
    // Clear egress and Mux IDs from the database
    const { error: updateError } = await supabase
      .from('streams')
      .update({ 
        livekit_egress_id: null,
        mux_stream_id: null,
        mux_stream_key: null,
        mux_playback_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', streamId);
    
    if (updateError) {
      console.error('Error clearing egress and Mux IDs:', updateError);
      return new Response(JSON.stringify({ 
        error: `Failed to update stream: ${updateError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('=== LIVEKIT OBS EGRESS TO MUX STOPPED ===');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'LiveKit OBS egress to Mux stopped successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in stop-livekit-obs-egress:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
