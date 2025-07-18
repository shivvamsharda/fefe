-- Update viewer tracking to store fudged viewer counts in database
-- This will apply baseline viewer counts at the database level instead of frontend

-- Create a function to get baseline viewer count for a stream
CREATE OR REPLACE FUNCTION get_stream_baseline_viewer_count(stream_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  baseline_count INTEGER;
  stream_id_hash BIGINT;
BEGIN
  -- Generate hash from stream ID for consistent baseline
  stream_id_hash := ('x' || substring(stream_id_param::text, 1, 8))::bit(32)::bigint;
  
  -- Generate baseline between 30-50 using hash
  baseline_count := 30 + (abs(stream_id_hash) % 21);
  
  RETURN baseline_count;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the viewer count update process to include baseline
CREATE OR REPLACE FUNCTION update_stream_viewer_count_with_baseline(
  stream_id_param UUID,
  actual_count INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  baseline_count INTEGER;
  fudged_count INTEGER;
  stream_status TEXT;
BEGIN
  -- Get stream status
  SELECT status INTO stream_status 
  FROM streams 
  WHERE id = stream_id_param;
  
  -- Only apply baseline for active streams
  IF stream_status = 'active' THEN
    baseline_count := get_stream_baseline_viewer_count(stream_id_param);
    fudged_count := actual_count + baseline_count;
  ELSE
    fudged_count := actual_count;
  END IF;
  
  -- Update the stream with fudged count
  UPDATE streams 
  SET viewer_count = fudged_count, 
      updated_at = now()
  WHERE id = stream_id_param;
  
  RETURN fudged_count;
END;
$$ LANGUAGE plpgsql;

-- Update VOD creation to inherit fudged stream viewer counts
CREATE OR REPLACE FUNCTION inherit_stream_viewer_count_to_vod()
RETURNS TRIGGER AS $$
DECLARE
  stream_viewer_count INTEGER;
BEGIN
  -- Get the final viewer count from the original stream
  IF NEW.original_stream_id IS NOT NULL THEN
    SELECT viewer_count INTO stream_viewer_count
    FROM streams
    WHERE id = NEW.original_stream_id;
    
    -- Set the VOD's total_views to include the stream's fudged viewer count
    NEW.total_views := COALESCE(stream_viewer_count, 0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for VOD creation
DROP TRIGGER IF EXISTS inherit_stream_viewers_on_vod_insert ON vods;
CREATE TRIGGER inherit_stream_viewers_on_vod_insert
  BEFORE INSERT ON vods
  FOR EACH ROW
  EXECUTE FUNCTION inherit_stream_viewer_count_to_vod();