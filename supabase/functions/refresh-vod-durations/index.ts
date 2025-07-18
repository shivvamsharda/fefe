
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface MuxAsset {
  id: string;
  duration?: number;
  status: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Refresh VOD durations function invoked');

  const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID');
  const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET');

  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    console.error('Mux credentials not configured');
    return new Response('Mux credentials not configured', { status: 500, headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
  );

  try {
    const body = await req.json();
    const { vodId, muxAssetId, refreshAll = false } = body;

    if (refreshAll) {
      console.log('Refreshing durations for all VODs');
      
      // Get all VODs that have mux_asset_id
      const { data: vods, error: vodsError } = await supabaseClient
        .from('vods')
        .select('id, mux_asset_id, title, duration')
        .not('mux_asset_id', 'is', null);

      if (vodsError) {
        console.error('Error fetching VODs:', vodsError);
        return new Response('Error fetching VODs', { status: 500, headers: corsHeaders });
      }

      console.log(`Found ${vods?.length || 0} VODs to refresh`);
      let updated = 0;
      let errors = 0;

      for (const vod of vods || []) {
        try {
          console.log(`Fetching duration for VOD: ${vod.title} (${vod.mux_asset_id})`);
          
          const muxResponse = await fetch(`https://api.mux.com/video/v1/assets/${vod.mux_asset_id}`, {
            headers: {
              'Authorization': `Basic ${btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)}`
            }
          });

          if (!muxResponse.ok) {
            console.error(`Failed to fetch asset ${vod.mux_asset_id}: ${muxResponse.status}`);
            errors++;
            continue;
          }

          const assetData = await muxResponse.json();
          const asset: MuxAsset = assetData.data;
          
          console.log(`Original duration: ${vod.duration}, New duration: ${asset.duration}`);

          if (asset.duration && asset.duration !== vod.duration) {
            const { error: updateError } = await supabaseClient
              .from('vods')
              .update({ duration: asset.duration })
              .eq('id', vod.id);

            if (updateError) {
              console.error(`Error updating VOD ${vod.id}:`, updateError);
              errors++;
            } else {
              console.log(`Updated duration for "${vod.title}" from ${vod.duration}s to ${asset.duration}s`);
              updated++;
            }
          } else {
            console.log(`No duration change needed for "${vod.title}"`);
          }

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing VOD ${vod.id}:`, error);
          errors++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Bulk refresh completed. Updated: ${updated}, Errors: ${errors}`,
        results: { updated, errors, total: vods?.length || 0 }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      // Single VOD refresh
      if (!vodId && !muxAssetId) {
        return new Response('vodId or muxAssetId required', { status: 400, headers: corsHeaders });
      }

      let targetVod;
      if (vodId) {
        const { data: vod, error: vodError } = await supabaseClient
          .from('vods')
          .select('id, mux_asset_id, title, duration')
          .eq('id', vodId)
          .single();

        if (vodError || !vod) {
          console.error('VOD not found:', vodError);
          return new Response('VOD not found', { status: 404, headers: corsHeaders });
        }
        targetVod = vod;
      } else {
        const { data: vod, error: vodError } = await supabaseClient
          .from('vods')
          .select('id, mux_asset_id, title, duration')
          .eq('mux_asset_id', muxAssetId)
          .single();

        if (vodError || !vod) {
          console.error('VOD not found by mux_asset_id:', vodError);
          return new Response('VOD not found', { status: 404, headers: corsHeaders });
        }
        targetVod = vod;
      }

      console.log(`Fetching updated duration for VOD: ${targetVod.title} (${targetVod.mux_asset_id})`);

      const muxResponse = await fetch(`https://api.mux.com/video/v1/assets/${targetVod.mux_asset_id}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)}`
        }
      });

      if (!muxResponse.ok) {
        console.error(`Failed to fetch asset: ${muxResponse.status}`);
        return new Response('Failed to fetch asset from Mux', { status: 500, headers: corsHeaders });
      }

      const assetData = await muxResponse.json();
      const asset: MuxAsset = assetData.data;

      console.log(`Original duration: ${targetVod.duration}, New duration from Mux: ${asset.duration}`);

      if (asset.duration && asset.duration !== targetVod.duration) {
        const { error: updateError } = await supabaseClient
          .from('vods')
          .update({ duration: asset.duration })
          .eq('id', targetVod.id);

        if (updateError) {
          console.error('Error updating VOD duration:', updateError);
          return new Response('Error updating VOD duration', { status: 500, headers: corsHeaders });
        }

        console.log(`Updated duration for "${targetVod.title}" from ${targetVod.duration}s to ${asset.duration}s`);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Duration updated successfully',
          oldDuration: targetVod.duration,
          newDuration: asset.duration
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        console.log(`No duration change needed for "${targetVod.title}"`);
        return new Response(JSON.stringify({
          success: true,
          message: 'No duration change needed',
          duration: asset.duration
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

  } catch (error) {
    console.error('Error in refresh-vod-durations function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
