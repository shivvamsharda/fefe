
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface StreamData {
  id: string
  playback_id: string | null
  mux_playback_id: string | null
  title: string
  status: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting thumbnail generation for active streams')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all active streams that need thumbnail updates
    const { data: activeStreams, error: streamsError } = await supabase
      .from('streams')
      .select('id, playback_id, mux_playback_id, title, status, thumbnail_updated_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (streamsError) {
      console.error('Error fetching active streams:', streamsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch active streams' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!activeStreams || activeStreams.length === 0) {
      console.log('No active streams found')
      return new Response(
        JSON.stringify({ message: 'No active streams found', processed: 0 }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${activeStreams.length} active streams`)

    let successCount = 0
    let errorCount = 0

    // Process each active stream
    for (const stream of activeStreams) {
      try {
        // Determine which playback ID to use (prefer mux_playback_id, fallback to playback_id)
        const playbackId = stream.mux_playback_id || stream.playback_id
        
        if (!playbackId) {
          console.log(`Stream ${stream.id} has no playback ID, skipping`)
          continue
        }

        // Generate thumbnail URL from Mux
        // Using time=1 to get a frame from 1 second into the stream for better quality
        const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1&width=640&height=360&fit_mode=smartcrop`
        
        console.log(`Generated thumbnail URL for stream ${stream.id}: ${thumbnailUrl}`)

        // Test if the thumbnail URL is accessible
        try {
          const thumbnailResponse = await fetch(thumbnailUrl, { method: 'HEAD' })
          if (!thumbnailResponse.ok) {
            throw new Error(`Thumbnail not accessible: ${thumbnailResponse.status}`)
          }
        } catch (fetchError) {
          console.error(`Thumbnail not accessible for stream ${stream.id}:`, fetchError)
          
          // Update status to indicate thumbnail generation failed
          await supabase
            .from('streams')
            .update({
              thumbnail_generation_status: 'failed',
              thumbnail_updated_at: new Date().toISOString()
            })
            .eq('id', stream.id)
          
          errorCount++
          continue
        }

        // Update the stream with the new thumbnail URL
        const { error: updateError } = await supabase
          .from('streams')
          .update({
            thumbnail: thumbnailUrl,
            thumbnail_updated_at: new Date().toISOString(),
            thumbnail_generation_status: 'success'
          })
          .eq('id', stream.id)

        if (updateError) {
          console.error(`Error updating thumbnail for stream ${stream.id}:`, updateError)
          errorCount++
        } else {
          console.log(`Successfully updated thumbnail for stream ${stream.id}`)
          successCount++
        }

      } catch (error) {
        console.error(`Error processing stream ${stream.id}:`, error)
        errorCount++
        
        // Update status to indicate error
        await supabase
          .from('streams')
          .update({
            thumbnail_generation_status: 'error',
            thumbnail_updated_at: new Date().toISOString()
          })
          .eq('id', stream.id)
      }
    }

    const result = {
      message: 'Thumbnail generation completed',
      totalStreams: activeStreams.length,
      successCount,
      errorCount,
      timestamp: new Date().toISOString()
    }

    console.log('Thumbnail generation result:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Thumbnail generation function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
