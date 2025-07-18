-- Change points_earned column from INTEGER to NUMERIC to support decimal values
ALTER TABLE public.promoted_stream_viewer_points 
ALTER COLUMN points_earned TYPE NUMERIC(10,2);

-- Update the default value to be consistent with decimal type  
ALTER TABLE public.promoted_stream_viewer_points 
ALTER COLUMN points_earned SET DEFAULT 0.0;