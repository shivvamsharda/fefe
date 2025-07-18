
-- Add RLS policies for space_participants table
ALTER TABLE public.space_participants ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view space participants (needed for public spaces)
CREATE POLICY "Anyone can view space participants" ON public.space_participants
  FOR SELECT USING (true);

-- Allow authenticated operations for space participants
CREATE POLICY "Service role can manage space participants" ON public.space_participants
  FOR ALL USING (true) WITH CHECK (true);
