-- Add temporary encrypted private key storage for Google users
ALTER TABLE public.user_profiles 
ADD COLUMN private_key_encrypted TEXT;