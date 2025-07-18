-- Fix VOD views calculation
-- The current trigger only sets initial total_views but doesn't account for VOD-specific viewers

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS inherit_stream_viewers_on_vod_insert ON vods;
DROP FUNCTION IF EXISTS inherit_stream_viewer_count_to_vod();

-- Create an improved function that properly calculates VOD total views
CREATE OR REPLACE FUNCTION calculate_vod_total_views_with_baseline(vod_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  original_stream_viewers INTEGER := 0;
  vod_heartbeat_viewers INTEGER := 0;
  total_calculated_views INTEGER := 0;
BEGIN
  -- Get the original stream's viewer count (includes baseline fudging)
  SELECT COALESCE(s.viewer_count, 0) INTO original_stream_viewers
  FROM vods v
  JOIN streams s ON v.original_stream_id = s.id
  WHERE v.id = vod_id_param;
  
  -- Get unique VOD viewers from heartbeats
  SELECT COUNT(DISTINCT ip_address) INTO vod_heartbeat_viewers
  FROM vod_viewer_heartbeats
  WHERE vod_id = vod_id_param;
  
  -- Total views = original stream viewers + VOD-specific viewers
  total_calculated_views := COALESCE(original_stream_viewers, 0) + COALESCE(vod_heartbeat_viewers, 0);
  
  RETURN total_calculated_views;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function that sets the initial baseline from stream
CREATE OR REPLACE FUNCTION set_vod_initial_baseline()
RETURNS TRIGGER AS $$
DECLARE
  stream_viewer_count INTEGER;
BEGIN
  -- Get the original stream's viewer count (includes baseline)
  IF NEW.original_stream_id IS NOT NULL THEN
    SELECT viewer_count INTO stream_viewer_count
    FROM streams
    WHERE id = NEW.original_stream_id;
    
    -- Set initial total_views to the stream's viewer count
    NEW.total_views := COALESCE(stream_viewer_count, 0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for new VODs
CREATE TRIGGER set_vod_baseline_on_insert
  BEFORE INSERT ON vods
  FOR EACH ROW
  EXECUTE FUNCTION set_vod_initial_baseline();

-- Update existing VODs to have correct total_views
UPDATE vods 
SET total_views = (
  SELECT calculate_vod_total_views_with_baseline(vods.id)
)
WHERE original_stream_id IS NOT NULL;

-- Create a function to update VOD views when heartbeats change
CREATE OR REPLACE FUNCTION update_vod_views_on_heartbeat_change()
RETURNS TRIGGER AS $$
DECLARE
  vod_id_to_update UUID;
BEGIN
  -- Get the VOD ID from the heartbeat
  IF TG_OP = 'INSERT' THEN
    vod_id_to_update := NEW.vod_id;
  ELSIF TG_OP = 'DELETE' THEN
    vod_id_to_update := OLD.vod_id;
  ELSE
    vod_id_to_update := NEW.vod_id;
  END IF;
  
  -- Update the VOD's total_views
  UPDATE vods 
  SET total_views = calculate_vod_total_views_with_baseline(vod_id_to_update),
      updated_at = now()
  WHERE id = vod_id_to_update;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for VOD heartbeat changes
DROP TRIGGER IF EXISTS update_vod_views_on_heartbeat_insert ON vod_viewer_heartbeats;
DROP TRIGGER IF EXISTS update_vod_views_on_heartbeat_delete ON vod_viewer_heartbeats;

CREATE TRIGGER update_vod_views_on_heartbeat_insert
  AFTER INSERT ON vod_viewer_heartbeats
  FOR EACH ROW
  EXECUTE FUNCTION update_vod_views_on_heartbeat_change();

CREATE TRIGGER update_vod_views_on_heartbeat_delete
  AFTER DELETE ON vod_viewer_heartbeats
  FOR EACH ROW
  EXECUTE FUNCTION update_vod_views_on_heartbeat_change();