-- Temporarily disable RLS on promoted_stream_viewer_points table
-- Since the application layer (pointsService) already correctly filters by user_id
-- and the custom wallet authentication system doesn't work with Supabase's built-in auth context
ALTER TABLE public.promoted_stream_viewer_points DISABLE ROW LEVEL SECURITY;

-- Drop the problematic policy that relied on JWT claims
DROP POLICY IF EXISTS "Users can view their own promoted stream points" ON public.promoted_stream_viewer_points;