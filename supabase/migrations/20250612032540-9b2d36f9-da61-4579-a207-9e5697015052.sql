
-- Add missing columns to existing spaces_v2 table
ALTER TABLE public.spaces_v2 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Update existing RLS policies or create them if they don't exist
DROP POLICY IF EXISTS "Anyone can view public spaces" ON public.spaces_v2;
CREATE POLICY "Anyone can view public spaces" ON public.spaces_v2
  FOR SELECT USING (is_public = true OR is_live = true);

DROP POLICY IF EXISTS "Users can view their own spaces" ON public.spaces_v2;
CREATE POLICY "Users can view their own spaces" ON public.spaces_v2
  FOR SELECT USING (host_wallet = get_current_wallet_address());

DROP POLICY IF EXISTS "Users can create spaces" ON public.spaces_v2;
CREATE POLICY "Users can create spaces" ON public.spaces_v2
  FOR INSERT WITH CHECK (host_wallet = get_current_wallet_address());

DROP POLICY IF EXISTS "Hosts can update their spaces" ON public.spaces_v2;
CREATE POLICY "Hosts can update their spaces" ON public.spaces_v2
  FOR UPDATE USING (host_wallet = get_current_wallet_address());

DROP POLICY IF EXISTS "Hosts can delete their spaces" ON public.spaces_v2;
CREATE POLICY "Hosts can delete their spaces" ON public.spaces_v2
  FOR DELETE USING (host_wallet = get_current_wallet_address());

-- Create space_participants table
CREATE TABLE IF NOT EXISTS public.space_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces_v2(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id),
  wallet_address TEXT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for participants
ALTER TABLE public.space_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for participants
CREATE POLICY "Anyone can view participants of public spaces" ON public.space_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.spaces_v2 
      WHERE id = space_participants.space_id 
      AND (is_public = true OR is_live = true)
    )
  );

CREATE POLICY "Users can view participants of their spaces" ON public.space_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.spaces_v2 
      WHERE id = space_participants.space_id 
      AND host_wallet = get_current_wallet_address()
    )
  );

CREATE POLICY "Users can join spaces as participants" ON public.space_participants
  FOR INSERT WITH CHECK (wallet_address = get_current_wallet_address());

CREATE POLICY "Users can update their own participation" ON public.space_participants
  FOR UPDATE USING (wallet_address = get_current_wallet_address());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spaces_v2_is_public ON public.spaces_v2(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_space_participants_space_id ON public.space_participants(space_id);
CREATE INDEX IF NOT EXISTS idx_space_participants_wallet ON public.space_participants(wallet_address);

-- Create function to generate unique room names
CREATE OR REPLACE FUNCTION generate_space_room_name() RETURNS TEXT AS $$
DECLARE
    adjectives TEXT[] := ARRAY['bright', 'swift', 'calm', 'bold', 'wise', 'cool', 'warm', 'fresh', 'happy', 'sunny', 'clever', 'quick', 'smart', 'kind'];
    nouns TEXT[] := ARRAY['space', 'room', 'meet', 'chat', 'talk', 'flow', 'wave', 'beam', 'link', 'hub', 'zone', 'spot', 'place', 'area'];
    adjective TEXT;
    noun TEXT;
    number_suffix TEXT;
    room_name TEXT;
    counter INT := 0;
BEGIN
    LOOP
        adjective := adjectives[1 + FLOOR(RANDOM() * array_length(adjectives, 1))::INT];
        noun := nouns[1 + FLOOR(RANDOM() * array_length(nouns, 1))::INT];
        number_suffix := LPAD((FLOOR(RANDOM() * 1000))::TEXT, 3, '0');
        room_name := adjective || '-' || noun || '-' || number_suffix;
        
        -- Check if this room name already exists
        IF NOT EXISTS (SELECT 1 FROM public.spaces_v2 WHERE room_name = room_name) THEN
            RETURN room_name;
        END IF;
        
        counter := counter + 1;
        -- Prevent infinite loop
        IF counter > 100 THEN
            room_name := room_name || '-' || FLOOR(RANDOM() * 1000)::TEXT;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN room_name;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at for space_participants
CREATE OR REPLACE FUNCTION update_space_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER space_participants_updated_at
  BEFORE UPDATE ON public.space_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_space_participants_updated_at();
