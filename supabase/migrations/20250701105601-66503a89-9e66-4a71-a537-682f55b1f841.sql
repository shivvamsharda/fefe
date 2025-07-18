-- Create promoted stream viewer points tracking tables
CREATE TABLE IF NOT EXISTS public.promoted_stream_viewer_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promoted_stream_id UUID NOT NULL,
  user_id UUID,
  ip_address TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL DEFAULT 'watch_time',
  watch_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create promoted stream viewer heartbeats table
CREATE TABLE IF NOT EXISTS public.promoted_stream_viewer_heartbeats (
  promoted_stream_id UUID NOT NULL,
  user_id UUID,
  ip_address TEXT NOT NULL,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_heartbeats INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (promoted_stream_id, ip_address)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promoted_stream_viewer_points_stream_id 
ON public.promoted_stream_viewer_points(promoted_stream_id);

CREATE INDEX IF NOT EXISTS idx_promoted_stream_viewer_points_user_id 
ON public.promoted_stream_viewer_points(user_id);

CREATE INDEX IF NOT EXISTS idx_promoted_stream_viewer_heartbeats_last_seen 
ON public.promoted_stream_viewer_heartbeats(last_seen_at);

-- Enable RLS
ALTER TABLE public.promoted_stream_viewer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoted_stream_viewer_heartbeats ENABLE ROW LEVEL SECURITY;

-- Create policies for promoted_stream_viewer_points
CREATE POLICY "Users can view their own promoted stream points" 
ON public.promoted_stream_viewer_points 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can insert promoted stream points" 
ON public.promoted_stream_viewer_points 
FOR INSERT 
WITH CHECK (true);

-- Create policies for promoted_stream_viewer_heartbeats  
CREATE POLICY "Anyone can view promoted stream heartbeats" 
ON public.promoted_stream_viewer_heartbeats 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage promoted stream heartbeats" 
ON public.promoted_stream_viewer_heartbeats 
FOR ALL 
USING (true);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_promoted_stream_viewer_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promoted_stream_viewer_points_updated_at
BEFORE UPDATE ON public.promoted_stream_viewer_points
FOR EACH ROW
EXECUTE FUNCTION public.update_promoted_stream_viewer_points_updated_at();

CREATE OR REPLACE FUNCTION public.update_promoted_stream_viewer_heartbeats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;