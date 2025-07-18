-- Clear mock LiveKit credentials to force generation of real ones
UPDATE public.creator_profiles 
SET 
  persistent_stream_key = NULL, 
  persistent_rtmp_url = NULL,
  updated_at = now() 
WHERE 
  persistent_stream_key LIKE 'sk_%' 
  AND persistent_rtmp_url = 'rtmp://ingest.livekit.io/live';