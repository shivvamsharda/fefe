
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
