
-- Disable Row Level Security on the promoted_streams table
ALTER TABLE public.promoted_streams DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies on promoted_streams table (if they exist)
DROP POLICY IF EXISTS "Users can view their own promoted streams" ON public.promoted_streams;
DROP POLICY IF EXISTS "Users can create their own promoted streams" ON public.promoted_streams;
DROP POLICY IF EXISTS "Users can update their own promoted streams" ON public.promoted_streams;
DROP POLICY IF EXISTS "Users can delete their own promoted streams" ON public.promoted_streams;
