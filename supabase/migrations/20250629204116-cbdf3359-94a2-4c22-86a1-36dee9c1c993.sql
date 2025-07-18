
-- Add promoted streams to the homepage by creating a view that combines regular streams with promoted streams
-- First, let's add some fields to help with the integration

-- Add fields to promoted_streams table to track placement and status
ALTER TABLE public.promoted_streams 
ADD COLUMN IF NOT EXISTS stream_platform text,
ADD COLUMN IF NOT EXISTS embed_url text,
ADD COLUMN IF NOT EXISTS viewer_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_expired_at timestamp with time zone;

-- Create a function to extract platform from stream URL
CREATE OR REPLACE FUNCTION public.extract_platform_from_url(stream_url text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF stream_url ILIKE '%youtube.com%' OR stream_url ILIKE '%youtu.be%' THEN
    RETURN 'youtube';
  ELSIF stream_url ILIKE '%twitch.tv%' THEN
    RETURN 'twitch';
  ELSIF stream_url ILIKE '%kick.com%' THEN
    RETURN 'kick';
  ELSIF stream_url ILIKE '%twitter.com%' OR stream_url ILIKE '%x.com%' THEN
    RETURN 'twitter';
  ELSE
    RETURN 'unknown';
  END IF;
END;
$$;

-- Create a function to generate embed URL from stream URL
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
      -- Extract channel name from Kick URL
      IF stream_url ~ 'kick\.com/([^/?]+)' THEN
        channel_name := substring(stream_url from 'kick\.com/([^/?]+)');
        RETURN 'https://kick.com/embed/' || channel_name;
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

-- Update existing promoted streams to have platform and embed_url
UPDATE public.promoted_streams 
SET 
  stream_platform = public.extract_platform_from_url(stream_url),
  embed_url = public.generate_embed_url(stream_url, public.extract_platform_from_url(stream_url))
WHERE stream_platform IS NULL OR embed_url IS NULL;

-- Create a trigger to auto-populate platform and embed_url for new promoted streams
CREATE OR REPLACE FUNCTION public.populate_promoted_stream_metadata()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.stream_platform := public.extract_platform_from_url(NEW.stream_url);
  NEW.embed_url := public.generate_embed_url(NEW.stream_url, NEW.stream_platform);
  RETURN NEW;
END;
$$;

CREATE TRIGGER populate_promoted_stream_metadata_trigger
  BEFORE INSERT OR UPDATE ON public.promoted_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_promoted_stream_metadata();

-- Create a function to auto-expire promoted streams
CREATE OR REPLACE FUNCTION public.auto_expire_promoted_streams()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.promoted_streams
  SET 
    is_active = false,
    auto_expired_at = now()
  WHERE 
    is_active = true 
    AND base_payment_expires_at < now()
    AND auto_expired_at IS NULL;
END;
$$;
