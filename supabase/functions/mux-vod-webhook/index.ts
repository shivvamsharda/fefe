
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Helper to verify Mux webhook signature
// Based on: https://docs.mux.com/guides/system/verify-webhook-signatures#implementing-signature-verification-manually
async function verifyMuxSignature(req: Request, bodyText: string, secret: string): Promise<boolean> {
  const muxSignatureHeader = req.headers.get('Mux-Signature');
  if (!muxSignatureHeader) {
    console.warn('Mux-Signature header missing.');
    return false;
  }

  const parts = muxSignatureHeader.split(',');
  let timestampStr: string | undefined;
  let v1Signature: string | undefined;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') {
      timestampStr = value;
    } else if (key === 'v1') {
      v1Signature = value;
    }
  }

  if (!timestampStr || !v1Signature) {
    console.warn('Mux-Signature header format invalid. Missing t or v1.');
    return false;
  }

  const signedPayload = `${timestampStr}.${bodyText}`;
  const encoder = new TextEncoder();
  
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );
    
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Basic timing attack protection (though crypto.subtle.timingSafeEqual is ideal if available in Deno's crypto)
    // For simplicity, direct comparison is used here. For production, consider more robust timingSafeEqual.
    if (calculatedSignature !== v1Signature) {
        console.warn(`Signature mismatch. Calculated: ${calculatedSignature}, Received: ${v1Signature}`);
        return false;
    }
    return true;

  } catch (e) {
    console.error('Error during signature verification:', e);
    return false;
  }
}

interface MuxWebhookPayload {
  type: string;
  data: {
    id: string; // Mux Asset ID or Live Stream ID
    live_stream_id?: string; // Corresponds to our streams.mux_stream_id
    playback_ids?: Array<{ id: string; policy: string }>;
    duration?: number;
    created_at?: string; // Timestamp string (Mux asset creation time)
    status?: string; // For live stream events: active, idle, disconnected
    // Potentially other fields like 'passthrough' if set
  };
  // Other webhook event fields
}

// Helper function to schedule delayed duration refresh
async function scheduleDelayedDurationRefresh(muxAssetId: string, supabaseClient: any) {
  try {
    console.log(`Scheduling delayed duration refresh for asset: ${muxAssetId}`);
    
    // Schedule the refresh for 2 minutes from now
    setTimeout(async () => {
      try {
        console.log(`Executing delayed duration refresh for asset: ${muxAssetId}`);
        
        const { data, error } = await supabaseClient.functions.invoke('refresh-vod-durations', {
          body: { muxAssetId }
        });

        if (error) {
          console.error('Error in delayed duration refresh:', error);
        } else {
          console.log('Delayed duration refresh completed:', data);
        }
      } catch (refreshError) {
        console.error('Error executing delayed duration refresh:', refreshError);
      }
    }, 2 * 60 * 1000); // 2 minutes in milliseconds

  } catch (error) {
    console.error('Error scheduling delayed duration refresh:', error);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Mux webhook handler invoked.');

  const MUX_WEBHOOK_SECRET = Deno.env.get('MUX_WEBHOOK_SIGNING_SECRET');
  if (!MUX_WEBHOOK_SECRET) {
    console.error('Mux webhook signing secret (MUX_WEBHOOK_SIGNING_SECRET) is not configured in environment variables.');
    // Return 500 if secret isn't set, as we can't verify.
    return new Response('Webhook signing secret not configured on server', { status: 500, headers: corsHeaders });
  }

  // Read body as text for signature verification
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch (error) {
    console.error('Failed to read request body as text:', error);
    return new Response('Invalid request body', { status: 400, headers: corsHeaders });
  }
  
  const isSignatureValid = await verifyMuxSignature(req, bodyText, MUX_WEBHOOK_SECRET);
  if (!isSignatureValid) {
    console.warn('Invalid Mux webhook signature.');
    return new Response('Invalid signature', { status: 401, headers: corsHeaders });
  }
  console.log('Mux webhook signature VERIFIED.');

  let payload: MuxWebhookPayload;
  try {
    payload = JSON.parse(bodyText); // Parse the text body we already read
    console.log('Received payload:', JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error('Failed to parse webhook payload from text:', error);
    return new Response('Invalid payload format', { status: 400, headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
  );

  // Handle live stream status events
  if (payload.type === 'video.live_stream.active' || 
      payload.type === 'video.live_stream.idle' || 
      payload.type === 'video.live_stream.disconnected') {
    
    console.log(`Processing live stream event: ${payload.type}`);
    
    const muxStreamId = payload.data.id; // For live stream events, data.id is the stream ID
    
    if (!muxStreamId) {
      console.error('No stream ID found in live stream event payload');
      return new Response('Missing stream ID', { status: 400, headers: corsHeaders });
    }

    try {
      // Map Mux event types to our database status values
      let newStatus: string;
      let shouldUpdate = true;

      switch (payload.type) {
        case 'video.live_stream.active':
          newStatus = 'active';
          break;
        case 'video.live_stream.idle':
          newStatus = 'idle';
          break;
        case 'video.live_stream.disconnected':
          // For disconnected, we might want to wait a bit in case of reconnection
          // For now, we'll set to idle immediately, but this could be enhanced
          newStatus = 'idle';
          console.log('Stream disconnected, setting to idle');
          break;
        default:
          console.warn(`Unhandled live stream event type: ${payload.type}`);
          shouldUpdate = false;
      }

      if (shouldUpdate) {
        // Find the stream in our database by mux_stream_id
        const { data: streamData, error: fetchError } = await supabaseClient
          .from('streams')
          .select('id, status, title')
          .eq('mux_stream_id', muxStreamId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching stream by mux_stream_id:', fetchError);
          return new Response('Database error', { status: 500, headers: corsHeaders });
        }

        if (!streamData) {
          console.warn(`No stream found with mux_stream_id: ${muxStreamId}`);
          return new Response('Stream not found', { status: 404, headers: corsHeaders });
        }

        console.log(`Found stream: ${streamData.title} (ID: ${streamData.id}), current status: ${streamData.status}, updating to: ${newStatus}`);

        // Update the stream status
        const { error: updateError } = await supabaseClient
          .from('streams')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', streamData.id);

        if (updateError) {
          console.error('Error updating stream status:', updateError);
          return new Response('Failed to update stream status', { status: 500, headers: corsHeaders });
        }

        console.log(`Successfully updated stream ${streamData.id} status from ${streamData.status} to ${newStatus}`);

        return new Response(JSON.stringify({ 
          message: `Stream status updated to ${newStatus}`,
          streamId: streamData.id,
          muxStreamId: muxStreamId
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Error processing live stream event:', error);
      return new Response('Internal server error', { status: 500, headers: corsHeaders });
    }
  }

  // Handle VOD asset ready events
  if (payload.type === 'video.asset.ready') {
    console.log('Processing video.asset.ready event.');
    const assetData = payload.data;

    // Enhanced duration logging for debugging
    console.log('Raw duration from Mux:', assetData.duration);
    console.log('Duration type:', typeof assetData.duration);
    if (assetData.duration) {
      console.log('Duration in minutes:', assetData.duration / 60);
      console.log('Duration in hours:', assetData.duration / 3600);
    }

    if (!assetData.live_stream_id) {
      console.warn('No live_stream_id found in asset data. Cannot link to original stream.');
      return new Response('Asset not linked to a known live stream on this platform', { status: 200, headers: corsHeaders });
    }

    if (!assetData.playback_ids || assetData.playback_ids.length === 0) {
      console.error('No playback_ids found in asset data.');
      return new Response('Missing playback ID', { status: 400, headers: corsHeaders });
    }

    // Check if VOD with this mux_asset_id already exists
    console.log(`Checking for existing VOD with mux_asset_id: ${assetData.id}`);
    const { data: existingVod, error: existingVodError } = await supabaseClient
      .from('vods')
      .select('id, title')
      .eq('mux_asset_id', assetData.id)
      .maybeSingle();

    if (existingVodError && existingVodError.code !== 'PGRST116') {
      console.error('Error checking for existing VOD:', existingVodError);
      return new Response('Error checking for existing VOD', { status: 500, headers: corsHeaders });
    }

    if (existingVod) {
      console.log(`VOD already exists with mux_asset_id: ${assetData.id}, title: ${existingVod.title}`);
      return new Response(JSON.stringify({ 
        message: 'VOD already exists',
        vodId: existingVod.id,
        muxAssetId: assetData.id
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // Fetch original stream details to get user_id and original title
      console.log(`Fetching stream details for mux_stream_id: ${assetData.live_stream_id}`);
      const { data: streamDetails, error: streamError } = await supabaseClient
        .from('streams')
        .select('id, user_id, title, description, created_at')
        .eq('mux_stream_id', assetData.live_stream_id)
        .maybeSingle();

      if (streamError) {
        console.error('Error fetching original stream:', streamError);
        return new Response('Error fetching original stream', { status: 500, headers: corsHeaders });
      }

      if (!streamDetails) {
        console.error('Original stream not found for Mux live_stream_id:', assetData.live_stream_id);
        return new Response('Original stream not found for linking', { status: 404, headers: corsHeaders });
      }
      
      // Use the original stream title (stored at stream creation) for VOD naming
      const vodTitle = streamDetails.title || `Recording from ${new Date(streamDetails.created_at).toLocaleDateString()}`;
      const vodDescription = streamDetails.description || null;
      const primaryPlaybackId = assetData.playback_ids[0].id;
      
      // Construct thumbnail URL
      const thumbnailUrl = `https://image.mux.com/${primaryPlaybackId}/thumbnail.jpg?width=640&time=1`; 

      // Mux's created_at for assets is typically a Unix timestamp string (seconds).
      let muxAssetCreatedAtISO: string | null = null;
      if (assetData.created_at) {
        const createdAtTimestamp = parseInt(assetData.created_at, 10);
        if (!isNaN(createdAtTimestamp)) {
          muxAssetCreatedAtISO = new Date(createdAtTimestamp * 1000).toISOString();
        } else {
          console.warn(`Could not parse assetData.created_at: ${assetData.created_at}`);
        }
      }

      // Validate and potentially correct duration
      let validatedDuration = assetData.duration || null;
      
      // Log warning if duration seems unusually short (less than 5 seconds) for a live stream VOD
      if (validatedDuration && validatedDuration < 5) {
        console.warn(`Duration seems unusually short (${validatedDuration}s) for a live stream VOD. This might be an error from Mux.`);
        console.warn('Consider checking the Mux asset details manually for asset ID:', assetData.id);
      }
      
      // Log warning if duration is exactly 10.033... as this seems to be a common incorrect value
      if (validatedDuration && Math.abs(validatedDuration - 10.0333333333333) < 0.001) {
        console.warn('Duration is exactly 10.033... seconds, which appears to be an incorrect default value from Mux');
        console.warn('Asset ID:', assetData.id, 'Playback ID:', primaryPlaybackId);
      }

      const vodData = {
        user_id: streamDetails.user_id,
        original_stream_id: streamDetails.id,
        mux_asset_id: assetData.id,
        mux_playback_id: primaryPlaybackId,
        title: vodTitle, // Using original stream title
        description: vodDescription,
        duration: validatedDuration,
        thumbnail_url: thumbnailUrl,
        status: 'ready',
        mux_asset_created_at: muxAssetCreatedAtISO,
      };

      console.log('Attempting to insert VOD data:', JSON.stringify(vodData, null, 2));

      const { error: insertError } = await supabaseClient
        .from('vods')
        .insert(vodData);

      if (insertError) {
        console.error('Error inserting VOD into database:', JSON.stringify(insertError, null, 2));
        // Check for unique constraint violation (e.g., mux_asset_id already exists)
        if (insertError.code === '23505') { // Postgres unique violation code
             console.warn('VOD with this mux_asset_id already exists due to unique constraint. This should not happen due to our earlier check.');
             return new Response('VOD already exists', { status: 200, headers: corsHeaders });
        }
        return new Response('Failed to save VOD metadata', { status: 500, headers: corsHeaders });
      }

      console.log('VOD metadata saved successfully for asset:', assetData.id);

      // Schedule delayed duration refresh after successful VOD creation
      scheduleDelayedDurationRefresh(assetData.id, supabaseClient);

      return new Response(JSON.stringify({ message: 'VOD processed successfully' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (e) {
      console.error('Unexpected error processing VOD:', e);
      return new Response(JSON.stringify({ error: 'Internal server error processing VOD' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } else {
    console.log(`Received event type: ${payload.type}. Ignoring.`);
    return new Response(JSON.stringify({ message: `Event type ${payload.type} not handled` }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
