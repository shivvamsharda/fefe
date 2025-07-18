-- Add persistent ingress ID and room name columns to creator_profiles table
ALTER TABLE public.creator_profiles 
ADD COLUMN persistent_ingress_id text,
ADD COLUMN persistent_room_name text;