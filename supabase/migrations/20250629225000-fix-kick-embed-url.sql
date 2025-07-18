
-- Fix Kick embed URL format in the database function
CREATE OR REPLACE FUNCTION public.generate_embed_url_with_config(stream_url text, platform text, client_id text DEFAULT NULL, parent_domain text DEFAULT 'localhost')
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  video_id text;
  channel_name text;
BEGIN
  CASE platform
    WHEN 'youtube' THEN
      -- Extract video ID from YouTube URL
      IF stream_url ~ 'youtube\.com/watch\?v=([^&]+)' THEN
        video_id := substring(stream_url from 'youtube\.com/watch\?v=([^&]+)');
        RETURN 'https://www.youtube.com/embed/' || video_id;
      ELSIF stream_url ~ 'youtu\.be/([^?]+)' THEN
        video_id := substring(stream_url from 'youtu\.be/([^?]+)');
        RETURN 'https://www.youtube.com/embed/' || video_id;
      END IF;
    WHEN 'twitch' THEN
      -- Extract channel name from Twitch URL
      IF stream_url ~ 'twitch\.tv/([^/?]+)' THEN
        channel_name := substring(stream_url from 'twitch\.tv/([^/?]+)');
        -- Build Twitch embed URL with proper parameters
        RETURN 'https://player.twitch.tv/?channel=' || channel_name || 
               '&parent=' || parent_domain ||
               CASE WHEN client_id IS NOT NULL THEN '&client=' || client_id ELSE '' END;
      END IF;
    WHEN 'kick' THEN
      -- Extract channel name from Kick URL and use correct player URL
      IF stream_url ~ 'kick\.com/([^/?]+)' THEN
        channel_name := substring(stream_url from 'kick\.com/([^/?]+)');
        RETURN 'https://player.kick.com/' || channel_name;
      END IF;
    WHEN 'twitter' THEN
      -- For Twitter/X, return the original URL (no iframe embed)
      RETURN stream_url;
    ELSE
      RETURN stream_url;
  END CASE;
  
  -- Fallback to original URL if parsing fails
  RETURN stream_url;
END;
$$;

-- Also update the simpler generate_embed_url function for consistency
CREATE OR REPLACE FUNCTION public.generate_embed_url(stream_url text, platform text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  video_id text;
  channel_name text;
BEGIN
  CASE platform
    WHEN 'youtube' THEN
      -- Extract video ID from YouTube URL
      IF stream_url ~ 'youtube\.com/watch\?v=([^&]+)' THEN
        video_id := substring(stream_url from 'youtube\.com/watch\?v=([^&]+)');
        RETURN 'https://www.youtube.com/embed/' || video_id;
      ELSIF stream_url ~ 'youtu\.be/([^?]+)' THEN
        video_id := substring(stream_url from 'youtu\.be/([^?]+)');
        RETURN 'https://www.youtube.com/embed/' || video_id;
      END IF;
    WHEN 'twitch' THEN
      -- Extract channel name from Twitch URL
      IF stream_url ~ 'twitch\.tv/([^/?]+)' THEN
        channel_name := substring(stream_url from 'twitch\.tv/([^/?]+)');
        RETURN 'https://player.twitch.tv/?channel=' || channel_name || '&parent=localhost&parent=127.0.0.1';
      END IF;
    WHEN 'kick' THEN
      -- Extract channel name from Kick URL and use correct player URL
      IF stream_url ~ 'kick\.com/([^/?]+)' THEN
        channel_name := substring(stream_url from 'kick\.com/([^/?]+)');
        RETURN 'https://player.kick.com/' || channel_name;
      END IF;
    WHEN 'twitter' THEN
      -- For Twitter/X, return the original URL (no iframe embed)
      RETURN stream_url;
    ELSE
      RETURN stream_url;
  END CASE;
  
  -- Fallback to original URL if parsing fails
  RETURN stream_url;
END;
$$;
