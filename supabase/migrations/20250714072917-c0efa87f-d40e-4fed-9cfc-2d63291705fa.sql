-- Update the placement_type constraint to include 'featured_banner' for the new 6-slot system
ALTER TABLE public.promoted_streams 
DROP CONSTRAINT IF EXISTS promoted_streams_placement_type_check;

-- Add new constraint that includes 'featured_banner' as a valid placement type
ALTER TABLE public.promoted_streams 
ADD CONSTRAINT promoted_streams_placement_type_check 
CHECK (placement_type IN ('featured_banner', 'hero', 'top_right', 'mid_right', 'horizontal', 'standard'));