

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
    const { streamId, userId } = await req.json();
    
    console.log('Stopping browser stream:', streamId, 'for user:', userId);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const livekitUrl = Deno.env.get('LIVEKIT_URL')!;
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!;
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!;
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')!;
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get stream details
    const { data: stream, error: fetchError } = await supabase
      .from('streams')
      .select('*')
      .eq('id', streamId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !stream) {
      console.error('Stream not found or access denied:', fetchError);
      throw new Error('Stream not found or access denied');
    }
    
    console.log('Found stream to stop:', stream.title, 'Status:', stream.status);
    
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
    
    // Update stream status to idle and clear egress ID with explicit timestamps
    const updatedAt = new Date().toISOString();
    console.log('Updating stream status to idle at:', updatedAt);
    
    const { data: updatedStream, error: updateError } = await supabase
      .from('streams')
      .update({ 
        status: 'idle',
        livekit_egress_id: null,
        updated_at: updatedAt
      })
      .eq('id', streamId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating stream status:', updateError);
      throw new Error(`Failed to update stream status: ${updateError.message}`);
    }
    
    console.log('Stream status updated successfully:', updatedStream?.status);
    console.log('Browser stream stopped successfully');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Stream stopped successfully',
      stream: updatedStream
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in stop-browser-stream:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

