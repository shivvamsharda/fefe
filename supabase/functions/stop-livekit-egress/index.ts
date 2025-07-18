
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { egressId, roomName } = await req.json()

    console.log('Stopping LiveKit egress:', egressId, 'for room:', roomName)

    // Stop the egress
    const egressResponse = await fetch(`${Deno.env.get('LIVEKIT_URL')}/twirp/livekit.Egress/StopEgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await generateLiveKitToken('', ['roomRecord'], roomName)}`,
      },
      body: JSON.stringify({
        egress_id: egressId,
      }),
    })

    if (!egressResponse.ok) {
      const errorText = await egressResponse.text()
      console.error('Failed to stop egress:', errorText)
      throw new Error(`Failed to stop egress: ${errorText}`)
    }

    const egressResult = await egressResponse.json()
    console.log('Egress stopped successfully:', egressResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Egress stopped successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in stop-livekit-egress:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateLiveKitToken(identity: string, grants: string[], room: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(Deno.env.get('LIVEKIT_API_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: Deno.env.get('LIVEKIT_API_KEY'),
    sub: identity,
    iat: now,
    exp: now + 3600,
    video: {
      room: room,
      roomJoin: grants.includes('roomJoin'),
      roomRecord: grants.includes('roomRecord'),
    }
  }

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput))
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}
