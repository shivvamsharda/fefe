-- Fix existing Google users' google_id mismatch

-- Create a function to sync google_id for existing users (callable from application)
CREATE OR REPLACE FUNCTION public.sync_google_user_profile(user_email text, auth_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the google_id for users with matching email but mismatched google_id
  UPDATE public.user_profiles 
  SET google_id = auth_user_id
  WHERE email = user_email 
    AND google_id IS NOT NULL 
    AND google_id != auth_user_id;
  
  RETURN FOUND;
END;
$$;

-- Fix the specific user identified in the logs
UPDATE public.user_profiles 
SET google_id = '864568c9-d862-4f4a-9407-aa330246fddf'
WHERE email = 'pixelbeastsol@gmail.com' 
  AND google_id IS NOT NULL 
  AND google_id != '864568c9-d862-4f4a-9407-aa330246fddf';

-- Create a function to be called when Google users log in to ensure google_id is correct
CREATE OR REPLACE FUNCTION public.ensure_google_id_sync(input_email text, input_google_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update google_id if it doesn't match for this email
  UPDATE public.user_profiles 
  SET google_id = input_google_id
  WHERE email = input_email 
    AND (google_id IS NULL OR google_id != input_google_id);
  
  RETURN FOUND;
END;
$$;