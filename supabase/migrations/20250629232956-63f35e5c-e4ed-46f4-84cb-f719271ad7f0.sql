
-- Update database functions to use correct Kick player URL
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

-- Also update the advanced function with config
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

-- Update existing Kick streams with correct embed URLs
UPDATE public.promoted_streams 
SET embed_url = REPLACE(embed_url, 'https://kick.com/embed/', 'https://player.kick.com/')
WHERE stream_platform = 'kick' 
AND embed_url LIKE 'https://kick.com/embed/%';

-- Also update any records that might have the old format
UPDATE public.promoted_streams 
SET embed_url = 'https://player.kick.com/' || SUBSTRING(stream_url FROM 'kick\.com/([^/?]+)')
WHERE stream_platform = 'kick' 
AND (embed_url IS NULL OR embed_url LIKE 'https://kick.com/embed/%');
