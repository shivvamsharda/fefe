
-- First, let's check what policies exist and drop them to start fresh
DROP POLICY IF EXISTS "Anyone can view follows" ON public.following;
DROP POLICY IF EXISTS "Users can follow others" ON public.following;
DROP POLICY IF EXISTS "Users can unfollow" ON public.following;

-- Now create the RLS policies for the following table to fix 406 errors

-- Allow anyone to read following relationships (needed for public features like follower counts)
CREATE POLICY "Anyone can view follows" ON public.following
  FOR SELECT USING (true);

-- Allow authenticated users to create follows
CREATE POLICY "Users can follow others" ON public.following
  FOR INSERT WITH CHECK (true);

-- Allow users to delete follows (unfollow)
CREATE POLICY "Users can unfollow" ON public.following
  FOR DELETE USING (true);
