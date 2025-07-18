-- Remove mock credential generation functions and triggers
DROP TRIGGER IF EXISTS generate_stream_credentials_on_insert ON public.creator_profiles;
DROP FUNCTION IF EXISTS public.auto_generate_stream_credentials();
DROP FUNCTION IF EXISTS public.generate_persistent_stream_credentials(text);
DROP FUNCTION IF EXISTS public.generate_stream_key();

-- Clear any remaining mock LiveKit credentials 
UPDATE public.creator_profiles 
SET 
  persistent_stream_key = NULL, 
  persistent_rtmp_url = NULL,
  updated_at = now() 
WHERE 
  persistent_stream_key IS NOT NULL 
  AND persistent_rtmp_url IS NOT NULL;