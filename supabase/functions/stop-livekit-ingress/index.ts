
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StopIngressRequest {
  streamId: string;
  ingressId: string;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== STOP LIVEKIT INGRESS START ===');
    
    const { streamId, ingressId }: StopIngressRequest = await req.json();

    if (!streamId || !ingressId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: streamId and ingressId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Stopping ingress:', ingressId, 'for stream:', streamId);

    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return new Response(
        JSON.stringify({ error: 'LiveKit configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create JWT token with extended expiration
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      iss: livekitApiKey,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour for cleanup operations
      nbf: Math.floor(Date.now() / 1000),
      sub: livekitApiKey,
      video: {
        ingressAdmin: true,
        roomAdmin: true,
      }
    };

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

    // Convert wss:// to https:// for REST API calls
    const apiUrl = livekitUrl.replace(/^wss:\/\//, 'https://');

    // Step 1: Get ingress info first to check status
    console.log('Getting ingress info before deletion...');
    
    const ingressInfo = await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(`${apiUrl}/twirp/livekit.Ingress/ListIngress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            ingress_id: ingressId
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('Ingress list failed (may not exist):', response.status, errorText);
          return null; // Ingress may already be deleted
        }
        
        const result = await response.json();
        return result.items && result.items.length > 0 ? result.items[0] : null;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Ingress info request timeout');
        }
        throw error;
      }
    }, 2, 1000);

    // Step 2: Gracefully delete the ingress with proper RTMP stream termination
    if (ingressInfo) {
      console.log('Gracefully deleting ingress:', ingressId);
      console.log('Ingress state:', ingressInfo.state);
      
      await retryWithBackoff(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for deletion
        
        try {
          const response = await fetch(`${apiUrl}/twirp/livekit.Ingress/DeleteIngress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              ingress_id: ingressId
            }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            // Don't throw error if ingress is already deleted
            if (response.status === 404 || errorText.includes('not found')) {
              console.log('Ingress already deleted or not found');
              return;
            }
            throw new Error(`Failed to delete ingress (${response.status}): ${errorText}`);
          }
          
          console.log('Ingress deleted successfully');
          
          // Wait a moment for RTMP connection to properly close
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }, 3, 2000);
    } else {
      console.log('Ingress not found or already deleted');
    }

    console.log('=== STOP LIVEKIT INGRESS SUCCESS ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'LiveKit ingress stopped successfully',
        ingress_id: ingressId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== STOP LIVEKIT INGRESS ERROR ===');
    console.error('Error details:', error);
    
    // Don't fail if ingress cleanup fails - stream can still be marked as ended
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to stop ingress',
        warning: 'Stream will be marked as ended despite ingress cleanup failure'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
