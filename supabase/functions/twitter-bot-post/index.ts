
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TwitterCredentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

// OAuth 1.0a signature generation
async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  credentials: TwitterCredentials
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Create parameter string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');
  
  // Create signing key
  const signingKey = [
    encodeURIComponent(credentials.consumerSecret),
    encodeURIComponent(credentials.accessTokenSecret)
  ].join('&');
  
  // Generate signature
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureBaseString)
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Generate OAuth header
async function generateOAuthHeader(
  method: string,
  url: string,
  credentials: TwitterCredentials
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID().replace(/-/g, '');
  
  const oauthParams = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_token: credentials.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0'
  };
  
  const signature = await generateOAuthSignature(method, url, oauthParams, credentials);
  
  const authHeaderParams = {
    ...oauthParams,
    oauth_signature: signature
  };
  
  const authHeader = 'OAuth ' + Object.keys(authHeaderParams)
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(authHeaderParams[key])}"`)
    .join(', ');
  
  return authHeader;
}

// Post tweet to Twitter API v2
async function postTweet(text: string, credentials: TwitterCredentials): Promise<boolean> {
  try {
    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';
    
    const authHeader = await generateOAuthHeader(method, url, credentials);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter API error:', response.status, errorText);
      return false;
    }
    
    const result = await response.json();
    console.log('Tweet posted successfully:', result.data?.id);
    return true;
  } catch (error) {
    console.error('Error posting tweet:', error);
    return false;
  }
}

// Format tweet content
function formatTweet(creatorName: string, streamTitle: string, streamDescription: string, streamId: string): string {
  const streamLink = `https://wenlive.fun/stream/${streamId}`;
  
  // Truncate description if needed to fit within Twitter's character limit
  const maxDescLength = 100;
  const truncatedDescription = streamDescription && streamDescription.length > maxDescLength 
    ? streamDescription.substring(0, maxDescLength) + '...'
    : streamDescription || 'Join the stream!';
  
  return `🚨 ${creatorName} is LIVE on Wenlive! 🎥
Title: ${streamTitle}
Description: ${truncatedDescription}
👀 Watch now: ${streamLink}
📣 Support the creator & join the chat!
#Wenlive #Livestream #Web3Streaming`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get stream ID from request
    const { stream_id } = await req.json();
    
    if (!stream_id) {
      console.error('No stream_id provided');
      return new Response('Missing stream_id', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Processing Twitter bot request for stream:', stream_id);

    // Get stream details with creator info
    const { data: streamData, error: streamError } = await supabase
      .from('streams')
      .select(`
        id,
        title,
        description,
        status,
        twitter_posted_at,
        user_profiles (
          username,
          display_name
        )
      `)
      .eq('id', stream_id)
      .single();

    if (streamError || !streamData) {
      console.error('Error fetching stream data:', streamError);
      return new Response('Stream not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Only proceed if stream is actually active
    if (streamData.status !== 'active') {
      console.log('Stream is not active, skipping tweet');
      return new Response('Stream not active', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Check if we've already posted about this stream (prevent duplicates)
    if (streamData.twitter_posted_at) {
      console.log('Tweet already posted for this stream at:', streamData.twitter_posted_at);
      return new Response('Tweet already posted', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Get Twitter credentials from Supabase secrets
    const twitterConsumerKey = Deno.env.get('TWITTER_API_KEY');
    const twitterConsumerSecret = Deno.env.get('TWITTER_API_KEY_SECRET');
    const twitterAccessToken = Deno.env.get('TWITTER_ACCESS_TOKEN');
    const twitterAccessTokenSecret = Deno.env.get('TWITTER_ACCESS_TOKEN_SECRET');

    if (!twitterConsumerKey || !twitterConsumerSecret || !twitterAccessToken || !twitterAccessTokenSecret) {
      console.error('Missing Twitter credentials');
      return new Response('Twitter credentials not configured', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const credentials: TwitterCredentials = {
      consumerKey: twitterConsumerKey,
      consumerSecret: twitterConsumerSecret,
      accessToken: twitterAccessToken,
      accessTokenSecret: twitterAccessTokenSecret
    };

    // Format creator name
    const creatorName = streamData.user_profiles?.display_name || 
                       streamData.user_profiles?.username || 
                       'A creator';

    // Format tweet
    const tweetText = formatTweet(
      creatorName,
      streamData.title,
      streamData.description || '',
      streamData.id
    );

    console.log('Posting tweet:', tweetText);

    // Post tweet
    const success = await postTweet(tweetText, credentials);

    if (success) {
      // Mark that we've posted about this stream
      const { error: updateError } = await supabase
        .from('streams')
        .update({ twitter_posted_at: new Date().toISOString() })
        .eq('id', stream_id);

      if (updateError) {
        console.error('Error updating twitter_posted_at:', updateError);
      }

      console.log('Tweet posted successfully for stream:', stream_id);
      return new Response('Tweet posted successfully', { 
        status: 200, 
        headers: corsHeaders 
      });
    } else {
      console.error('Failed to post tweet for stream:', stream_id);
      return new Response('Failed to post tweet', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

  } catch (error) {
    console.error('Twitter bot error:', error);
    return new Response(`Error: ${error.message}`, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
