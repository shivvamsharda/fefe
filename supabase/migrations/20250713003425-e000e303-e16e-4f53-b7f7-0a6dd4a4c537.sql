-- Add slot_position column to promoted_streams table for the new 6-slot system
ALTER TABLE public.promoted_streams 
ADD COLUMN slot_position INTEGER;

-- Add constraint to ensure slot positions are between 1 and 6
ALTER TABLE public.promoted_streams 
ADD CONSTRAINT slot_position_range CHECK (slot_position >= 1 AND slot_position <= 6);

-- Create unique constraint to prevent duplicate slot positions for active promotions
-- This ensures only one promotion can occupy each slot at a time
CREATE UNIQUE INDEX idx_active_slot_position 
ON public.promoted_streams (slot_position) 
WHERE is_active = true AND slot_position IS NOT NULL;