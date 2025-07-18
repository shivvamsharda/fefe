
-- Add missing timestamp columns to the streams table
ALTER TABLE public.streams 
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone;

-- Update existing streams to have NULL values for these new columns
-- (they are already nullable by default)
