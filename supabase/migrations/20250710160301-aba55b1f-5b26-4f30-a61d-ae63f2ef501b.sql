-- Update stream baseline viewer count range from 30-50 to 15-25
CREATE OR REPLACE FUNCTION get_stream_baseline_viewer_count(stream_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  baseline_count INTEGER;
  stream_id_hash BIGINT;
BEGIN
  -- Generate hash from stream ID for consistent baseline
  stream_id_hash := ('x' || substring(stream_id_param::text, 1, 8))::bit(32)::bigint;
  
  -- Generate baseline between 15-25 using hash
  baseline_count := 15 + (abs(stream_id_hash) % 11);
  
  RETURN baseline_count;
END;
$$ LANGUAGE plpgsql IMMUTABLE;