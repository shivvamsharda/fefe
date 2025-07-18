
-- Update existing promoted_streams to populate creator_user_id based on wallet_address
UPDATE public.promoted_streams 
SET creator_user_id = up.id
FROM public.user_profiles up 
WHERE promoted_streams.wallet_address = up.wallet_address 
AND promoted_streams.creator_user_id IS NULL;

-- Create a trigger function to automatically populate creator_user_id when inserting promoted streams
CREATE OR REPLACE FUNCTION public.populate_promoted_stream_creator_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Populate creator_user_id based on wallet_address
  SELECT id INTO NEW.creator_user_id
  FROM public.user_profiles
  WHERE wallet_address = NEW.wallet_address;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically populate creator_user_id on insert
DROP TRIGGER IF EXISTS trigger_populate_promoted_stream_creator_user_id ON public.promoted_streams;
CREATE TRIGGER trigger_populate_promoted_stream_creator_user_id
  BEFORE INSERT ON public.promoted_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_promoted_stream_creator_user_id();
