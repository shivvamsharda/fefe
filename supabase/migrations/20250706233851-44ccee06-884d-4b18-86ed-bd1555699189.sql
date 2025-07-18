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
  SET google_id = auth_user_id
  WHERE email = user_email 
    AND google_id IS NOT NULL 
    AND google_id != auth_user_id;
  
  RETURN FOUND;
END;
$$;

-- Fix the specific user we identified from logs
UPDATE public.user_profiles 
SET google_id = '864568c9-d862-4f4a-9407-aa330246fddf'
WHERE email = 'pixelbeastsol@gmail.com' 
  AND google_id IS NOT NULL 
  AND google_id != '864568c9-d862-4f4a-9407-aa330246fddf';

-- Also try to find and fix any other Google users with similar issues
-- Update any Google users where email matches auth pattern but google_id is different
UPDATE public.user_profiles 
SET google_id = (
  SELECT id::text 
  FROM auth.users 
  WHERE auth.users.email = user_profiles.email 
    AND auth.users.app_metadata->>'provider' = 'google'
)
WHERE email IS NOT NULL 
  AND google_id IS NOT NULL
  AND email LIKE '%@gmail.com'
  AND google_id != (
    SELECT id::text 
    FROM auth.users 
    WHERE auth.users.email = user_profiles.email 
      AND auth.users.app_metadata->>'provider' = 'google'
  );