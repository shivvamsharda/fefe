-- Drop creator_tokens table and related components
DROP TABLE IF EXISTS public.creator_tokens CASCADE;

-- Drop token_purchases table and related components  
DROP TABLE IF EXISTS public.token_purchases CASCADE;

-- Drop token-images storage bucket and policies
DELETE FROM storage.objects WHERE bucket_id = 'token-images';
DELETE FROM storage.buckets WHERE id = 'token-images';