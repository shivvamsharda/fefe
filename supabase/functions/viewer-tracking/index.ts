
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract IP address from request headers
    const getClientIP = (request: Request): string => {
      const forwarded = request.headers.get('x-forwarded-for')
      if (forwarded) {
        return forwarded.split(',')[0].trim()
      }
      const realIp = request.headers.get('x-real-ip')
      if (realIp) {
        return realIp
      }
      // Fallback for development
      return request.headers.get('cf-connecting-ip') || 'unknown'
    }

    const clientIP = getClientIP(req)

    if (req.method === 'POST') {
      // Handle heartbeat - record viewer activity
      let streamId, vodId, promotedStreamId, userUuid;
      
      try {
        const body = await req.text();
        console.log('Raw request body:', body);
        console.log('Request headers:', Object.fromEntries(req.headers.entries()));
        
        if (!body || body.trim() === '') {
          console.error('Empty request body received');
          return new Response(
            JSON.stringify({ error: 'Empty request body' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        
        const jsonData = JSON.parse(body);
        streamId = jsonData.streamId;
        vodId = jsonData.vodId;
        promotedStreamId = jsonData.promotedStreamId;
        userUuid = jsonData.userUuid;
        console.log('Parsed streamId:', streamId, 'vodId:', vodId, 'promotedStreamId:', promotedStreamId, 'userUuid:', userUuid);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      if (!streamId && !vodId && !promotedStreamId) {
        console.error('No streamId, vodId, or promotedStreamId provided in request');
        return new Response(
          JSON.stringify({ error: 'Stream ID, VOD ID, or Promoted Stream ID is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const contentId = streamId || vodId || promotedStreamId;
      const contentType = streamId ? 'stream' : vodId ? 'vod' : 'promoted_stream';
      console.log(`Processing heartbeat for ${contentType} ${contentId} from IP ${clientIP}`)

      const now = new Date().toISOString()
      
      // For promoted streams, use the new promoted_stream_viewer_heartbeats table
      if (promotedStreamId) {
        const { error } = await supabase
          .from('promoted_stream_viewer_heartbeats')
          .upsert(
            {
              promoted_stream_id: promotedStreamId,
              user_id: userUuid || null,
              ip_address: clientIP,
              last_seen_at: now,
              total_heartbeats: 1,
              updated_at: now
            },
            {
              onConflict: 'promoted_stream_id,ip_address',
              ignoreDuplicates: false
            }
          )

        if (error) {
          console.error('Error upserting promoted stream heartbeat:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to record promoted stream heartbeat', details: error.message }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Award points for promoted stream viewing (1 point per heartbeat = ~1 point per 15 seconds)
        if (userUuid) {
          try {
              const { error: pointsError } = await supabase
                .from('promoted_stream_viewer_points')
                .insert({
                  promoted_stream_id: promotedStreamId,
                  user_id: userUuid,
                  ip_address: clientIP,
                  points_earned: 0.25,
                  action_type: 'watch_time',
                  watch_time_seconds: 15
                });

            if (pointsError) {
              console.error('Error awarding points:', pointsError);
              // Don't fail the heartbeat if points fail
            } else {
              console.log(`Awarded 0.25 points to user ${userUuid} for promoted stream ${promotedStreamId}`);
            }
          } catch (pointsError) {
            console.error('Error in points awarding:', pointsError);
          }
        }
      } else if (vodId) {
        const { error } = await supabase
          .from('vod_viewer_heartbeats')
          .upsert(
            {
              vod_id: vodId,
              ip_address: clientIP,
              last_seen_at: now,
              updated_at: now
            },
            {
              onConflict: 'vod_id,ip_address'
            }
          )

        if (error) {
          console.error('Error upserting VOD heartbeat:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to record VOD heartbeat', details: error.message }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      } else {
        // For streams, continue using viewer_heartbeats table
        const { error } = await supabase
          .from('viewer_heartbeats')
          .upsert(
            {
              stream_id: streamId,
              ip_address: clientIP,
              last_seen_at: now,
              updated_at: now
            },
            {
              onConflict: 'stream_id,ip_address'
            }
          )

        if (error) {
          console.error('Error upserting stream heartbeat:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to record stream heartbeat', details: error.message }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      }

      console.log(`Successfully recorded heartbeat for ${contentType} ${contentId} from IP ${clientIP}`)

      return new Response(
        JSON.stringify({ success: true, message: 'Heartbeat recorded' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (req.method === 'GET') {
      // Handle viewer count request - count active viewers in last 20 seconds
      const url = new URL(req.url)
      const streamId = url.searchParams.get('streamId')
      const vodId = url.searchParams.get('vodId')
      const promotedStreamId = url.searchParams.get('promotedStreamId')

      console.log(`Viewer count request for stream: ${streamId}, vod: ${vodId}, promotedStream: ${promotedStreamId}`)

      if (!streamId && !vodId && !promotedStreamId) {
        return new Response(
          JSON.stringify({ error: 'Stream ID, VOD ID, or Promoted Stream ID is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const twentySecondsAgo = new Date(Date.now() - 20 * 1000).toISOString()
      
      let data, error;
      
      if (promotedStreamId) {
        // Query promoted_stream_viewer_heartbeats for promoted streams
        const result = await supabase
          .from('promoted_stream_viewer_heartbeats')
          .select('ip_address', { count: 'exact' })
          .eq('promoted_stream_id', promotedStreamId)
          .gte('last_seen_at', twentySecondsAgo);
        
        data = result.data;
        error = result.error;
      } else if (vodId) {
        // Query vod_viewer_heartbeats for VODs
        const result = await supabase
          .from('vod_viewer_heartbeats')
          .select('ip_address', { count: 'exact' })
          .eq('vod_id', vodId)
          .gte('last_seen_at', twentySecondsAgo);
        
        data = result.data;
        error = result.error;
      } else {
        // Query viewer_heartbeats for streams
        const result = await supabase
          .from('viewer_heartbeats')
          .select('ip_address', { count: 'exact' })
          .eq('stream_id', streamId)
          .gte('last_seen_at', twentySecondsAgo);
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error counting viewers:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to count viewers', details: error.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const actualViewerCount = data?.length || 0
      const contentType = promotedStreamId ? 'promoted stream' : vodId ? 'VOD' : 'stream'
      const contentId = promotedStreamId || vodId || streamId
      console.log(`${contentType} ${contentId} has ${actualViewerCount} active viewers`)

      // For regular streams, use consistent database baseline function
      if (streamId && !promotedStreamId && !vodId) {
        try {
          const { data: fudgedCount, error: fudgeError } = await supabase
            .rpc('update_stream_viewer_count_with_baseline', {
              stream_id_param: streamId,
              actual_count: actualViewerCount
            });
          
          if (fudgeError) {
            console.error('Error updating stream with consistent baseline:', fudgeError);
            // Fall back to actual count if database function fails
            return new Response(
              JSON.stringify({ viewerCount: actualViewerCount }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          console.log(`Stream ${streamId}: ${actualViewerCount} actual viewers, ${fudgedCount} with consistent baseline`);
          
          return new Response(
            JSON.stringify({ viewerCount: fudgedCount || actualViewerCount }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } catch (error) {
          console.error('Error in consistent baseline calculation:', error);
          // Fall back to actual count if any error occurs
        }
      }

      return new Response(
        JSON.stringify({ viewerCount: actualViewerCount }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
