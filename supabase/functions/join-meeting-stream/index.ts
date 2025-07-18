
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { meetingId, walletAddress, displayName } = await req.json()

    console.log('Joining meeting:', meetingId, 'for wallet:', walletAddress)

    // Enforce wallet authentication - reject if no wallet address provided
    if (!walletAddress || walletAddress.trim() === '') {
      console.error('Meeting join rejected: No wallet address provided')
      return new Response(
        JSON.stringify({ error: 'Wallet authentication required to join spaces' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('status', 'active')
      .single()

    if (meetingError || !meeting) {
      console.error('Meeting not found:', meetingError)
      return new Response(
        JSON.stringify({ error: 'Meeting not found or not active' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Meeting found:', meeting.livekit_room_name)

    // Get user profile using wallet address
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, username, display_name')
      .eq('wallet_address', walletAddress)
      .single()
    
    if (!profile) {
      console.error('User profile not found for wallet:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'User profile not found. Please complete your profile setup.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User profile found:', profile.username)

    // Check if already a participant
    const { data: existingParticipant } = await supabase
      .from('meeting_participants')
      .select('*')
      .eq('meeting_id', meeting.id)
      .eq('wallet_address', walletAddress)
      .eq('is_active', true)
      .maybeSingle()

    if (!existingParticipant) {
      console.log('Adding new participant to meeting')
      // Add as participant with required wallet address
      const { error: participantError } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
          user_id: profile.id,
          wallet_address: walletAddress, // Required field
          display_name: displayName || profile.display_name || profile.username,
          role: 'participant',
        })

      if (participantError) {
        console.error('Failed to add participant:', participantError)
        return new Response(
          JSON.stringify({ error: 'Failed to join meeting' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      console.log('Participant already exists, reusing')
    }

    // Generate LiveKit token for participant using wallet address as identity
    const participantIdentity = walletAddress // Always use wallet address as identity
    console.log('Generating LiveKit token for wallet identity:', participantIdentity, 'room:', meeting.livekit_room_name)
    
    const livekitToken = await generateLiveKitToken(
      participantIdentity,
      ['roomJoin', 'roomCreate', 'roomRecord'], // Enhanced permissions for audio/video
      meeting.livekit_room_name
    )

    console.log('LiveKit token generated successfully for wallet-authenticated user')

    const responseData = {
      success: true,
      meeting: {
        id: meeting.id,
        meeting_id: meeting.meeting_id,
        title: meeting.title,
        description: meeting.description,
        livekit_room_name: meeting.livekit_room_name,
        livekit_token: livekitToken,
        playback_id: meeting.mux_playback_id,
      }
    }

    console.log('Wallet-authenticated participant joined meeting successfully')
    console.log('Response data:', JSON.stringify({
      ...responseData,
      meeting: {
        ...responseData.meeting,
        livekit_token: '[REDACTED]'  // Don't log the actual token
      }
    }))

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in join-meeting-stream:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateLiveKitToken(identity: string, grants: string[], room: string) {
  console.log('Generating token for wallet-authenticated user:', { identity, grants, room })
  
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
      roomCreate: grants.includes('roomCreate'),
      // Enhanced audio/video permissions
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true
    }
  }

  console.log('Token payload for wallet-authenticated user:', JSON.stringify(payload, null, 2))

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput))
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  const token = `${encodedHeader}.${encodedPayload}.${encodedSignature}`
  console.log('Token generated successfully for wallet-authenticated user')
  
  return token
}
