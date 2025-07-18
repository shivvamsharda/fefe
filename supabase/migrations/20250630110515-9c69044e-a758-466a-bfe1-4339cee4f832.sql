
-- Add discount tracking fields to promoted_streams table
ALTER TABLE public.promoted_streams 
ADD COLUMN discount_applied boolean DEFAULT false,
ADD COLUMN discount_type text,
ADD COLUMN original_price_sol numeric;

-- Add comment to explain the new fields
COMMENT ON COLUMN public.promoted_streams.discount_applied IS 'Whether a discount was applied to this promotion';
COMMENT ON COLUMN public.promoted_streams.discount_type IS 'Type of discount applied (e.g., streaming_active)';
COMMENT ON COLUMN public.promoted_streams.original_price_sol IS 'Original price before discount was applied';
