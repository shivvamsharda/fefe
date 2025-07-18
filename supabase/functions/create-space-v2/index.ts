
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSpaceRequest {
  title: string;
  description?: string;
  hostWallet: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { title, description, hostWallet }: CreateSpaceRequest = await req.json();

    console.log('Create space request:', { title, description, hostWallet });

    if (!title || !hostWallet) {
      console.error('Missing required fields:', { title: !!title, hostWallet: !!hostWallet });
      return new Response(
        JSON.stringify({ error: "Title and host wallet are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the user profile for the host
    console.log('Looking up user profile for wallet:', hostWallet);
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('wallet_address', hostWallet)
      .single();

    if (userError) {
      console.error('Error finding user profile:', userError);
      return new Response(
        JSON.stringify({ error: "Host user not found", details: userError.message }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Found user profile:', userProfile);

    // Generate unique room name
    console.log('Generating room name...');
    const { data: roomNameData, error: roomNameError } = await supabase
      .rpc('generate_space_room_name');

    if (roomNameError) {
      console.error('Error generating room name:', roomNameError);
      return new Response(
        JSON.stringify({ error: "Failed to generate room name", details: roomNameError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const roomName = roomNameData;
    console.log('Generated room name:', roomName);

    // Create the space
    console.log('Creating space with data:', {
      title,
      description,
      host_user_id: userProfile.id,
      host_wallet: hostWallet,
      room_name: roomName
    });

    const { data: space, error: spaceError } = await supabase
      .from('spaces_v2')
      .insert({
        title,
        description,
        host_user_id: userProfile.id,
        host_wallet: hostWallet,
        room_name: roomName,
        is_live: false,
        is_public: false,
      })
      .select()
      .single();

    if (spaceError) {
      console.error('Error creating space:', spaceError);
      return new Response(
        JSON.stringify({ error: "Failed to create space", details: spaceError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Space created successfully:', space);

    return new Response(
      JSON.stringify({ space }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error('Unexpected error in create-space-v2:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
