-- Fix existing Google users' google_id mismatch and add sync mechanism

-- First, let's create a function to sync google_id for existing users
CREATE OR REPLACE FUNCTION public.sync_google_user_profile(user_email text, auth_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the google_id for users with matching email but mismatched google_id
  UPDATE public.user_profiles 
  SET google_id = auth_user_id,
      updated_at = now()
  WHERE email = user_email 
    AND google_id IS NOT NULL 
    AND google_id != auth_user_id;
  
  RETURN FOUND;
END;
$$;

-- Fix the specific user we identified from logs
UPDATE public.user_profiles 
SET google_id = '864568c9-d862-4f4a-9407-aa330246fddf',
    updated_at = now()
WHERE email = 'pixelbeastsol@gmail.com' 
  AND google_id IS NOT NULL 
  AND google_id != '864568c9-d862-4f4a-9407-aa330246fddf';

-- Create a more robust function to handle Google ID syncing during authentication
CREATE OR REPLACE FUNCTION public.ensure_google_user_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
  auth_user_id text;
BEGIN
  -- Extract email and user ID from the auth event
  IF NEW.email IS NOT NULL AND NEW.id IS NOT NULL THEN
    user_email := NEW.email;
    auth_user_id := NEW.id::text;
    
    -- Try to sync existing profile with correct google_id
    PERFORM public.sync_google_user_profile(user_email, auth_user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to sync Google users on auth events (if not already exists)
DROP TRIGGER IF EXISTS sync_google_user_on_auth ON auth.users;
CREATE TRIGGER sync_google_user_on_auth
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email IS NOT NULL AND NEW.provider = 'google')
  EXECUTE FUNCTION public.ensure_google_user_sync();