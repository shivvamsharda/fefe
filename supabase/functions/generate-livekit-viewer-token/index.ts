
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateViewerTokenRequest {
  roomName: string;
  participantName?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roomName, participantName }: GenerateViewerTokenRequest = await req.json();

    if (!roomName) {
      return new Response(
        JSON.stringify({ error: 'Room name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return new Response(
        JSON.stringify({ error: 'LiveKit configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique viewer identity for RTMP ingress viewing
    const viewerIdentity = `rtmp-viewer-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const displayName = participantName || `Viewer ${viewerIdentity.split('-')[2]}`;

    // Create JWT token specifically for RTMP ingress viewing
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      iss: livekitApiKey,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      nbf: Math.floor(Date.now() / 1000),
      sub: viewerIdentity,
      name: displayName,
      video: {
        room: roomName,
        roomJoin: true,
        // RTMP ingress viewer permissions - can only subscribe, never publish
        canSubscribe: true,
        canPublish: false,
        canPublishData: false,
        canUpdateOwnMetadata: false,
        // Ingress-specific permissions
        ingressAdmin: false,
        hidden: true, // Hide viewer from participant list
        recorder: false,
        // Allow subscription to any ingress content
        canSubscribeToAny: true
      }
    };

    const encoder = new TextEncoder();
    const keyData = encoder.encode(livekitApiSecret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const toSign = `${headerB64}.${payloadB64}`;
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(toSign));
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const token = `${toSign}.${signatureB64}`;

    console.log(`Generated RTMP ingress viewer token for room: ${roomName}, viewer: ${viewerIdentity}`);

    return new Response(
      JSON.stringify({
        token,
        url: livekitUrl,
        identity: viewerIdentity,
        name: displayName
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating LiveKit RTMP viewer token:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
