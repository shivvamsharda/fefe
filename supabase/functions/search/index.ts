
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchResult {
  creators: Array<{
    id: string;
    display_name: string;
    user_id_uuid?: string;
    profile_picture_url?: string;
  }>;
  liveStreams: Array<{
    id: string;
    title: string;
    user_id: string;
    thumbnail?: string;
  }>;
  vods: Array<{
    id: string;
    title: string;
    mux_playback_id: string;
    thumbnail_url?: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ creators: [], liveStreams: [], vods: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const searchTerm = `%${query.trim()}%`;

    // Search creators by display name
    const { data: creators, error: creatorsError } = await supabase
      .from('creator_profiles')
      .select('wallet_address, display_name, profile_picture_url')
      .ilike('display_name', searchTerm)
      .limit(5);

    if (creatorsError) {
      console.error('Error searching creators:', creatorsError);
    }

    // Get user UUIDs for creators
    const creatorWallets = creators?.map(c => c.wallet_address) || [];
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, wallet_address')
      .in('wallet_address', creatorWallets);

    const userProfilesMap = new Map(userProfiles?.map(up => [up.wallet_address, up.id]));

    const creatorsWithUuid = creators?.map(creator => ({
      id: creator.wallet_address,
      display_name: creator.display_name,
      profile_picture_url: creator.profile_picture_url,
      user_id_uuid: userProfilesMap.get(creator.wallet_address)
    })) || [];

    // Search live streams by title
    const { data: liveStreams, error: streamsError } = await supabase
      .from('streams')
      .select('id, title, user_id, thumbnail')
      .ilike('title', searchTerm)
      .eq('status', 'active')
      .limit(5);

    if (streamsError) {
      console.error('Error searching live streams:', streamsError);
    }

    // Search VODs by title
    const { data: vods, error: vodsError } = await supabase
      .from('vods')
      .select('id, title, mux_playback_id, thumbnail_url')
      .ilike('title', searchTerm)
      .limit(5);

    if (vodsError) {
      console.error('Error searching VODs:', vodsError);
    }

    const result: SearchResult = {
      creators: creatorsWithUuid,
      liveStreams: liveStreams || [],
      vods: vods || []
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
