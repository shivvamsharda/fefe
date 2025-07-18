import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateStreamRequest {
  title: string;
  description?: string;
  category: string;
  language: string;
  tags?: string[];
  walletAddress: string;
  tokenContractAddress?: string;
}

// Helper function for exponential backoff retry
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Validate environment variables
function validateEnvironment() {
  const required = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'];
  const missing = required.filter(key => !Deno.env.get(key));
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CREATE LIVEKIT OBS STREAM START ===');
    
    // Validate environment early
    validateEnvironment();
    
    const { 
      title, 
      description, 
      category, 
      language, 
      tags, 
      walletAddress,
      tokenContractAddress 
    }: CreateStreamRequest = await req.json();

    if (!title || !category || !language || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user profile and creator profile with persistent stream credentials
    const { data: userProfile, error: userError } = await retryWithBackoff(async () => {
      return await supabase
        .from('user_profiles')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();
    });

    if (userError || !userProfile) {
      console.error('User profile lookup failed:', userError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get creator profile with persistent stream credentials
    const { data: creatorProfile, error: creatorError } = await retryWithBackoff(async () => {
      return await supabase
        .from('creator_profiles')
        .select('persistent_stream_key, persistent_rtmp_url, persistent_ingress_id, persistent_room_name')
        .eq('wallet_address', walletAddress)
        .single();
    });

    if (creatorError || !creatorProfile) {
      console.error('Creator profile not found:', creatorError);
      return new Response(
        JSON.stringify({ error: 'Creator profile not found. Please create a creator profile first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let roomName: string;
    let realRtmpUrl: string;
    let realStreamKey: string;
    let ingressId: string;

    // Check if creator already has persistent stream credentials
    if (creatorProfile.persistent_stream_key && creatorProfile.persistent_rtmp_url && 
        creatorProfile.persistent_ingress_id && creatorProfile.persistent_room_name) {
      console.log('Using existing persistent stream credentials for creator:', walletAddress);
      realRtmpUrl = creatorProfile.persistent_rtmp_url;
      realStreamKey = creatorProfile.persistent_stream_key;
      ingressId = creatorProfile.persistent_ingress_id;
      roomName = creatorProfile.persistent_room_name;
    } else {
      console.log('Creating new persistent stream credentials for creator:', walletAddress);
      
      // Generate unique room name with better entropy (only for new credentials)
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 10);
      roomName = `livekit-obs-${timestamp}-${randomId}`;
      
      // Get LiveKit configuration
      const livekitUrl = Deno.env.get('LIVEKIT_URL');
      const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
      const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

      // Convert wss:// to https:// for REST API calls
      const apiUrl = livekitUrl.replace(/^wss:\/\//, 'https://');
      console.log('LiveKit API URL:', apiUrl);

      // Create JWT token with extended expiration (24 hours instead of 1 hour)
      const header = { alg: 'HS256', typ: 'JWT' };
      const payload = {
        iss: livekitApiKey,
        exp: Math.floor(Date.now() / 1000) + (24 * 3600), // 24 hours
        nbf: Math.floor(Date.now() / 1000),
        sub: walletAddress,
        video: {
          room: roomName,
          roomCreate: true,
          roomAdmin: true,
          ingressAdmin: true,
        }
      };

      console.log('Creating JWT token with 24-hour expiration');
      
      const encoder = new TextEncoder();
      const keyData = encoder.encode(livekitApiSecret);
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const toSign = `${headerB64}.${payloadB64}`;
      
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(toSign));
      const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
      const token = `${toSign}.${signatureB64}`;

      // Create RTMP ingress with retry logic and timeout
      console.log('Creating persistent RTMP ingress...');
      
      const ingressData = await retryWithBackoff(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        try {
          const response = await fetch(`${apiUrl}/twirp/livekit.Ingress/CreateIngress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              input_type: 'RTMP_INPUT',
              name: `persistent-obs-${walletAddress}`,
              room_name: roomName,
              participant_identity: `creator-${walletAddress}`,
              participant_name: userProfile.id,
              enable_transcoding: true,
            }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('LiveKit ingress creation failed:', response.status, errorText);
            throw new Error(`LiveKit API error (${response.status}): ${errorText}`);
          }
          
          return await response.json();
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }, 3, 2000); // 3 retries with 2s base delay

      console.log('LiveKit persistent ingress created successfully:', ingressData.ingress_id);

      // Extract real LiveKit credentials from ingress response
      realRtmpUrl = ingressData.url;
      realStreamKey = ingressData.stream_key;
      ingressId = ingressData.ingress_id;
      
      console.log('Storing persistent stream credentials in creator profile...');
      
      // Store persistent credentials in creator profile
      const { error: updateError } = await retryWithBackoff(async () => {
        return await supabase
          .from('creator_profiles')
          .update({
            persistent_stream_key: realStreamKey,
            persistent_rtmp_url: realRtmpUrl,
            persistent_ingress_id: ingressId,
            persistent_room_name: roomName,
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', walletAddress);
      });

      if (updateError) {
        console.error('Warning: Failed to store persistent credentials:', updateError);
        // Don't fail the entire operation, just log the warning
      } else {
        console.log('Persistent stream credentials stored successfully');
      }
    }

    // Save stream to database with transaction-like behavior
    console.log('Saving stream to database...');
    
    const { data: stream, error: streamError } = await retryWithBackoff(async () => {
      return await supabase
        .from('streams')
        .insert({
          user_id: userProfile.id,
          title,
          description,
          category,
          language,
          tags,
          token_contract_address: tokenContractAddress,
          source_type: 'livekit',
          stream_method: 'obs',
          livekit_room_name: roomName,
          livekit_ingress_id: ingressId,
          livekit_rtmp_url: realRtmpUrl,
          livekit_stream_key: realStreamKey,
          status: 'idle',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
    });

    if (streamError) {
      console.error('Database error:', streamError);
      
      // Cleanup: Try to delete the created ingress if database save fails (only for new ingress)
      if (ingressId !== 'persistent') {
        try {
          console.log('Attempting to cleanup ingress due to database error...');
          
          // Get LiveKit configuration for cleanup
          const livekitUrl = Deno.env.get('LIVEKIT_URL');
          const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
          const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');
          const apiUrl = livekitUrl.replace(/^wss:\/\//, 'https://');
          
          // Create cleanup token
          const header = { alg: 'HS256', typ: 'JWT' };
          const payload = {
            iss: livekitApiKey,
            exp: Math.floor(Date.now() / 1000) + (1 * 3600), // 1 hour for cleanup
            nbf: Math.floor(Date.now() / 1000),
            sub: walletAddress,
            video: { ingressAdmin: true }
          };
          
          const encoder = new TextEncoder();
          const keyData = encoder.encode(livekitApiSecret);
          const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
          const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
          const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
          const toSign = `${headerB64}.${payloadB64}`;
          const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(toSign));
          const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
          const token = `${toSign}.${signatureB64}`;
          
          await fetch(`${apiUrl}/twirp/livekit.Ingress/DeleteIngress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              ingress_id: ingressId
            }),
          });
          console.log('Ingress cleanup completed');
        } catch (cleanupError) {
          console.error('Failed to cleanup ingress:', cleanupError);
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to save stream to database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== CREATE LIVEKIT OBS STREAM SUCCESS ===');
    console.log('Stream ID:', stream.id);
    console.log('Room Name:', roomName);
    console.log('Ingress ID:', ingressId);

    return new Response(
      JSON.stringify({
        success: true,
        stream,
        rtmp_url: realRtmpUrl, // Return real RTMP URL from LiveKit
        stream_key: realStreamKey, // Return real stream key from LiveKit
        room_name: roomName,
        ingress_id: ingressId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== CREATE LIVEKIT OBS STREAM ERROR ===');
    console.error('Error details:', error);
    
    // Categorize errors for better user feedback
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.message.includes('Missing required environment')) {
      errorMessage = 'Service configuration error. Please try again later.';
      statusCode = 503;
    } else if (error.message.includes('User profile not found')) {
      errorMessage = 'User authentication failed. Please reconnect your wallet.';
      statusCode = 401;
    } else if (error.message.includes('LiveKit API error')) {
      errorMessage = 'Streaming service temporarily unavailable. Please try again.';
      statusCode = 503;
    } else if (error.name === 'AbortError') {
      errorMessage = 'Request timeout. Please check your connection and try again.';
      statusCode = 408;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: Deno.env.get('NODE_ENV') === 'development' ? error.message : undefined
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});