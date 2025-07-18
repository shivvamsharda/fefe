
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Bunny webhook received');

    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Supabase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse webhook payload
    const payload = await req.json();
    console.log('Webhook payload:', payload);

    // Extract video information from Bunny webhook
    const { VideoGuid, Status, Width, Height, Length } = payload;

    if (!VideoGuid) {
      console.error('No VideoGuid in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Invalid payload - missing VideoGuid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing webhook for video:', VideoGuid, 'Status:', Status);

    // Map Bunny status to our status
    let uploadStatus = 'processing';
    let encodingStatus = Status?.toString().toLowerCase() || 'processing';

    switch (Status) {
      case 3: // Finished
        uploadStatus = 'ready';
        encodingStatus = 'finished';
        break;
      case 4: // Error
        uploadStatus = 'failed';
        encodingStatus = 'error';
        break;
      default:
        uploadStatus = 'processing';
        encodingStatus = 'processing';
    }

    console.log('Mapped status:', { uploadStatus, encodingStatus });

    // Update the video record in database
    const updateData: any = {
      bunny_encoding_status: encodingStatus,
      upload_status: uploadStatus,
      updated_at: new Date().toISOString()
    };

    // Add video dimensions and duration if available
    if (Width && Height) {
      updateData.video_width = Width;
      updateData.video_height = Height;
    }

    if (Length) {
      updateData.duration = Length;
    }

    console.log('Updating video with data:', updateData);

    const { data, error } = await supabase
      .from('creator_uploaded_videos')
      .update(updateData)
      .eq('bunny_video_id', VideoGuid)
      .select();

    if (error) {
      console.error('Error updating video status:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update video status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data || data.length === 0) {
      console.log('No video found with bunny_video_id:', VideoGuid);
      return new Response(
        JSON.stringify({ message: 'Video not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully updated video:', data[0]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Video status updated',
        videoId: data[0].id,
        status: uploadStatus
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in bunny-webhook function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
