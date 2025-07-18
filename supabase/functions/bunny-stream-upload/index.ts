
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UploadResponse {
  success: boolean;
  videoId?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Bunny Stream upload request received');

    // Get environment variables
    const BUNNY_API_KEY = Deno.env.get('BUNNY_STREAM_API_KEY');
    const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_STREAM_LIBRARY_ID');
    const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_CDN_HOSTNAME');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasBunnyApiKey: !!BUNNY_API_KEY,
      hasBunnyLibraryId: !!BUNNY_LIBRARY_ID,
      hasBunnyCdnHostname: !!BUNNY_CDN_HOSTNAME,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
    });

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID || !BUNNY_CDN_HOSTNAME) {
      console.error('Missing Bunny Stream environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Bunny Stream not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Supabase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse form data first to get wallet address if provided
    const formData = await req.formData();
    const walletAddress = formData.get('wallet_address') as string;
    
    let userId: string | null = null;
    
    // Try multiple authentication methods
    if (walletAddress) {
      console.log('Attempting wallet authentication for:', walletAddress);
      
      // Look up user by wallet address in user_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();
      
      if (profile && !profileError) {
        userId = profile.id;
        console.log('Found user profile for wallet:', userId);
      } else {
        console.error('No user profile found for wallet address:', walletAddress, profileError);
      }
    } else {
      // Try standard Supabase auth
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );

        if (user && !authError) {
          userId = user.id;
          console.log('Standard auth successful for user:', userId);
        } else {
          console.error('Standard authentication failed:', authError);
        }
      }
    }

    // If no user found through any method, return error
    if (!userId) {
      console.error('No valid authentication found');
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoFile = formData.get('video') as File;
    const thumbnailFile = formData.get('thumbnail') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || undefined;
    const category = formData.get('category') as string || undefined;
    const language = formData.get('language') as string || undefined;
    const visibility = formData.get('visibility') as string || 'public';
    const tagsString = formData.get('tags') as string;
    const tags = tagsString ? JSON.parse(tagsString) : undefined;

    if (!videoFile || !title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video file and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Uploading video to Bunny Stream:', {
      filename: videoFile.name,
      size: videoFile.size,
      type: videoFile.type,
      title,
      hasThumbnail: !!thumbnailFile,
      userId
    });

    // Step 1: Create video in Bunny Stream
    const createVideoResponse = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
      }),
    });

    if (!createVideoResponse.ok) {
      const errorText = await createVideoResponse.text();
      console.error('Failed to create video in Bunny Stream:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create video in Bunny Stream' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const createVideoData = await createVideoResponse.json();
    const videoId = createVideoData.guid;
    console.log('Created video in Bunny Stream with ID:', videoId);

    // Step 2: Upload video file
    console.log('Uploading video file...');
    const uploadResponse = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: await videoFile.arrayBuffer(),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Failed to upload video to Bunny Stream:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload video file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Video uploaded successfully to Bunny Stream');

    // Step 3: Upload custom thumbnail if provided
    let customThumbnailUrl = undefined;
    if (thumbnailFile) {
      console.log('Uploading custom thumbnail...');
      try {
        const thumbnailUploadResponse = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}/thumbnail`, {
          method: 'POST',
          headers: {
            'AccessKey': BUNNY_API_KEY,
          },
          body: await thumbnailFile.arrayBuffer(),
        });

        if (thumbnailUploadResponse.ok) {
          console.log('Custom thumbnail uploaded successfully');
          customThumbnailUrl = `https://${BUNNY_CDN_HOSTNAME}/${videoId}/thumbnail.jpg`;
        } else {
          console.warn('Failed to upload custom thumbnail, using auto-generated');
        }
      } catch (thumbnailError) {
        console.warn('Error uploading custom thumbnail:', thumbnailError);
      }
    }

    // Construct URLs
    const playbackUrl = `https://${BUNNY_CDN_HOSTNAME}/${videoId}/playlist.m3u8`;
    const thumbnailUrl = customThumbnailUrl || `https://${BUNNY_CDN_HOSTNAME}/${videoId}/thumbnail.jpg`;

    console.log('Generated URLs:', { playbackUrl, thumbnailUrl });

    // Step 4: Save to database
    console.log('Saving video record to database...');
    const { data: videoRecord, error: dbError } = await supabase
      .from('creator_uploaded_videos')
      .insert({
        user_id: userId,
        title: title,
        description: description,
        original_filename: videoFile.name,
        file_size_bytes: videoFile.size,
        bunny_video_id: videoId,
        bunny_library_id: BUNNY_LIBRARY_ID,
        bunny_playback_url: playbackUrl,
        bunny_thumbnail_url: thumbnailUrl,
        bunny_encoding_status: 'processing',
        upload_status: 'processing',
        category: category,
        tags: tags,
        language: language,
        visibility: visibility,
        upload_metadata: {
          original_type: videoFile.type,
          upload_timestamp: new Date().toISOString(),
          has_custom_thumbnail: !!thumbnailFile,
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving video to database:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save video record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Video record saved to database:', videoRecord.id);

    const response: UploadResponse = {
      success: true,
      videoId: videoRecord.id,
      playbackUrl: playbackUrl,
      thumbnailUrl: thumbnailUrl,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in bunny-stream-upload function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
