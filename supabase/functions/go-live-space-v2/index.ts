
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoLiveRequest {
  roomName: string;
  hostWallet: string;
  category?: string;
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

    const { roomName, hostWallet, category }: GoLiveRequest = await req.json();

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

    // Make the space public and live
    const { error: updateError } = await supabase
      .from('spaces_v2')
      .update({
        is_live: true,
        is_public: true,
        category: category || space.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', space.id);

    if (updateError) {
      console.error('Error updating space:', updateError);
      return new Response(
        JSON.stringify({ error: "Failed to go live" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Note: Removed stream creation as spaces should be handled separately from regular streams
    // Spaces will be displayed in their own section and don't need to create duplicate stream entries

    return new Response(
      JSON.stringify({ success: true, space: { ...space, is_live: true, is_public: true } }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in go-live-space-v2:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
