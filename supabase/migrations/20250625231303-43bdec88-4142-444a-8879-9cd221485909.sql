
-- Create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.notify_twitter_bot_on_stream_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Call the twitter-bot-post edge function asynchronously
    PERFORM net.http_post(
      url := 'https://gusyejevgytoaodujgbm.supabase.co/functions/v1/twitter-bot-post',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1c3llamV2Z3l0b2FvZHVqZ2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMTExNjksImV4cCI6MjA2MjU4NzE2OX0.AsOLU_qW9-24rOkNoHnGd23fzPRlxxYakOFRd7F7uXo"}'::jsonb,
      body := json_build_object('stream_id', NEW.id)::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_twitter_bot_on_stream_active ON public.streams;
CREATE TRIGGER trigger_twitter_bot_on_stream_active
  AFTER UPDATE ON public.streams
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_twitter_bot_on_stream_active();

-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;
