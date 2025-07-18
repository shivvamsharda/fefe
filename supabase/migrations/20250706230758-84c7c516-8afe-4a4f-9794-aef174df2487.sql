-- Update RLS policy to allow Google users to update their wallet address
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (
  id = get_current_user_profile_id() 
  OR wallet_address = get_current_wallet_address()
  OR (google_id IS NOT NULL AND id = auth.uid())
)
WITH CHECK (
  id = get_current_user_profile_id() 
  OR wallet_address = get_current_wallet_address()
  OR (google_id IS NOT NULL AND id = auth.uid())
);