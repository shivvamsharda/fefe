
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JoinSpaceRequest {
  roomName: string;
  participantName?: string;
  walletAddress?: string;
  role?: 'host' | 'participant' | 'viewer';
  autoJoin?: boolean; // New flag for automatic joining
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create service role client to bypass RLS for database operations
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Also create anon client for regular queries
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { roomName, participantName, walletAddress, role = 'viewer', autoJoin = false }: JoinSpaceRequest = await req.json();

    console.log('Join space request:', { roomName, participantName, walletAddress, role, autoJoin });

    if (!roomName) {
      console.error('Missing room name');
      return new Response(
        JSON.stringify({ error: "Room name is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the space details using anon client
    console.log('Looking up space for room:', roomName);
    const { data: space, error: spaceError } = await supabase
      .from('spaces_v2')
      .select('*')
      .eq('room_name', roomName)
      .single();

    if (spaceError || !space) {
      console.error('Space not found:', spaceError);
      return new Response(
        JSON.stringify({ error: "Space not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Found space:', space);

    // Check if user is the host
    const isHost = walletAddress && space.host_wallet === walletAddress;
    let finalRole = isHost ? 'host' : role;

    // Get user profile and username if wallet address is provided
    let userId = null;
    let displayName = participantName || '';
    
    if (walletAddress) {
      console.log('Looking up user profile for wallet:', walletAddress);
      const { data: userProfile, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('id, username, display_name')
        .eq('wallet_address', walletAddress)
        .single();
      
      if (userProfileError) {
        console.log('User profile not found, using provided name:', userProfileError);
      } else {
        userId = userProfile?.id || null;
        // Use username from profile if available, otherwise use display_name, fallback to provided name
        displayName = userProfile?.username || userProfile?.display_name || displayName;
        console.log('Found user profile:', userProfile, 'Using display name:', displayName);
      }
    }

    // For hosts, ensure we have a display name
    if (isHost && !displayName) {
      displayName = 'Host';
    }

    // Validate we have a display name for non-auto-join scenarios
    if (!autoJoin && !displayName.trim()) {
      console.error('Missing display name for non-auto-join');
      return new Response(
        JSON.stringify({ error: "Display name is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // For auto-join scenarios (public viewers), use a default name if none provided
    if (autoJoin && !displayName.trim()) {
      displayName = 'Viewer';
    }

    console.log('Determined role and name:', { isHost, finalRole, displayName, hostWallet: space.host_wallet, userWallet: walletAddress });

    // Record participant joining using service role client to bypass RLS
    console.log('Recording participant with data:', {
      space_id: space.id,
      user_id: userId,
      wallet_address: walletAddress,
      display_name: displayName,
      role: finalRole,
      is_active: true,
    });

    const { data: participantData, error: participantError } = await supabaseServiceRole
      .from('space_participants')
      .insert({
        space_id: space.id,
        user_id: userId,
        wallet_address: walletAddress,
        display_name: displayName,
        role: finalRole,
        is_active: true,
      })
      .select()
      .single();

    if (participantError) {
      console.error('Error recording participant:', participantError);
      return new Response(
        JSON.stringify({ error: "Failed to record participant", details: participantError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Participant recorded successfully:', participantData);

    // Update participant count using service role client
    const { error: updateError } = await supabaseServiceRole
      .from('spaces_v2')
      .update({ 
        participant_count: space.participant_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', space.id);

    if (updateError) {
      console.error('Error updating participant count:', updateError);
      // Don't fail the request for this, just log it
    }

    // Validate LiveKit configuration
    const livekitUrl = Deno.env.get("LIVEKIT_URL");
    const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY");
    const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET");

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      console.error('Missing LiveKit configuration');
      return new Response(
        JSON.stringify({ error: "LiveKit configuration missing" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use display name as identity for better user experience
    const participantIdentity = displayName;
    const canPublish = finalRole === 'host' || finalRole === 'participant';
    const canSubscribe = true;

    console.log('Generating LiveKit token with enhanced permissions for role:', { canPublish, canSubscribe, finalRole, participantIdentity });

    // Generate custom JWT token with enhanced viewer permissions and wallet metadata
    const livekitToken = await generateLiveKitToken(
      participantIdentity,
      ['roomJoin', 'roomCreate', 'roomRecord'],
      roomName,
      canPublish,
      canSubscribe,
      finalRole,
      walletAddress // Pass wallet address for metadata
    );

    console.log('LiveKit token generated successfully for role:', finalRole);

    // Validate that we have a proper string token
    if (typeof livekitToken !== 'string' || !livekitToken || livekitToken.length < 10) {
      console.error('Invalid token generated:', typeof livekitToken, livekitToken?.length);
      return new Response(
        JSON.stringify({ error: "Failed to generate valid token" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        token: livekitToken,
        livekitUrl,
        space,
        role: finalRole,
        participantIdentity: participantIdentity,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error('Unexpected error in join-space-v2:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// Enhanced JWT token generation with wallet metadata inclusion
async function generateLiveKitToken(
  identity: string, 
  grants: string[], 
  room: string,
  canPublish: boolean = true,
  canSubscribe: boolean = true,
  role: string = 'participant',
  walletAddress?: string // Add wallet address parameter
) {
  console.log('Generating token with enhanced params:', { identity, grants, room, canPublish, canSubscribe, role, walletAddress });
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(Deno.env.get('LIVEKIT_API_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  
  // Create metadata object with wallet address
  const metadata = walletAddress ? { wallet: walletAddress } : {};
  console.log('Including metadata in token:', metadata);
  
  const payload = {
    iss: Deno.env.get('LIVEKIT_API_KEY'),
    sub: identity,
    iat: now,
    exp: now + 3600, // 1 hour expiry
    metadata: JSON.stringify(metadata), // Include wallet metadata
    video: {
      room: room,
      roomJoin: grants.includes('roomJoin'),
      roomRecord: grants.includes('roomRecord'),
      roomCreate: grants.includes('roomCreate'),
      // Enhanced permissions for all users, especially viewers
      canPublish: canPublish,
      canSubscribe: canSubscribe,
      canPublishData: true,
      canUpdateOwnMetadata: true,
      // Enhanced viewer-specific permissions
      ...(role === 'viewer' && {
        canSubscribeToRoom: true,
        canReceiveMedia: true,
        roomAdmin: false,
        hidden: false
      })
    }
  };

  console.log('Enhanced token payload for role', role, ':', JSON.stringify(payload, null, 2));

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const token = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  console.log('Enhanced token generated successfully for role', role, ', length:', token.length);
  
  return token;
}

serve(handler);
