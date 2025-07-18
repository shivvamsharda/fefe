
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EndSpaceRequest {
  roomName: string;
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

    const { roomName, hostWallet }: EndSpaceRequest = await req.json();

    if (!roomName || !hostWallet) {
      return new Response(
        JSON.stringify({ error: "Room name and host wallet are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the space
    const { data: space, error: spaceError } = await supabase
      .from('spaces_v2')
      .select('*')
      .eq('room_name', roomName)
      .eq('host_wallet', hostWallet)
      .single();

    if (spaceError || !space) {
      return new Response(
        JSON.stringify({ error: "Space not found or unauthorized" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // End the space
    const { error: updateError } = await supabase
      .from('spaces_v2')
      .update({
        is_live: false,
        is_public: false,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', space.id);

    if (updateError) {
      console.error('Error ending space:', updateError);
      return new Response(
        JSON.stringify({ error: "Failed to end space" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark all participants as inactive
    const { error: participantsError } = await supabase
      .from('space_participants')
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('space_id', space.id)
      .eq('is_active', true);

    if (participantsError) {
      console.error('Error updating participants:', participantsError);
    }

    // End the corresponding stream entry
    const { error: streamError } = await supabase
      .from('streams')
      .update({
        status: 'ended',
        updated_at: new Date().toISOString()
      })
      .eq('livekit_room_name', roomName)
      .eq('stream_type', 'space');

    if (streamError) {
      console.error('Error ending stream entry:', streamError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in end-space-v2:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
