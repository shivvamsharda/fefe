
-- Add unique constraint to prevent duplicate mux_asset_id entries in vods table
ALTER TABLE public.vods ADD CONSTRAINT unique_mux_asset_id UNIQUE (mux_asset_id);
