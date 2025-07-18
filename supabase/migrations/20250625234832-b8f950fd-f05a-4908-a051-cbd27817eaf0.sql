
-- Create the trigger function that will call the Twitter bot
CREATE OR REPLACE FUNCTION public.notify_twitter_bot_on_stream_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status is 'active'
  IF NEW.status = 'active' THEN
    -- Use pg_net to call the twitter-bot-post edge function asynchronously
    PERFORM net.http_post(
      url := 'https://gusyejevgytoaodujgbm.supabase.co/functions/v1/twitter-bot-post',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1c3llamV2Z3l0b2FvZHVqZ2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMTExNjksImV4cCI6MjA2MjU4NzE2OX0.AsOLU_qW9-24rOkNoHnGd23fzPRlxxYakOFRd7F7uXo"}'::jsonb,
      body := json_build_object('stream_id', NEW.id)::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger that fires on INSERT and UPDATE
CREATE OR REPLACE TRIGGER trigger_notify_twitter_bot_on_stream_active
  AFTER INSERT OR UPDATE OF status ON public.streams
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_twitter_bot_on_stream_active();

-- Add a column to track if we've posted about this stream to prevent duplicates
ALTER TABLE public.streams 
ADD COLUMN IF NOT EXISTS twitter_posted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
