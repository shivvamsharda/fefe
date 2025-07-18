-- Add persistent stream key fields to creator_profiles table
ALTER TABLE public.creator_profiles 
ADD COLUMN persistent_stream_key TEXT,
ADD COLUMN persistent_rtmp_url TEXT;

-- Create function to generate secure stream keys
CREATE OR REPLACE FUNCTION public.generate_stream_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    key_length INTEGER := 32;
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..key_length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN 'sk_' || result;
END;
$function$;

-- Create function to generate persistent stream credentials
CREATE OR REPLACE FUNCTION public.generate_persistent_stream_credentials(creator_wallet_address TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
DECLARE
    stream_key TEXT;
    rtmp_url TEXT;
BEGIN
    -- Generate unique stream key
    stream_key := public.generate_stream_key();
    
    -- Set RTMP URL (this will be the LiveKit RTMP endpoint)
    rtmp_url := 'rtmp://ingest.livekit.io/live';
    
    -- Update creator profile with persistent credentials
    UPDATE public.creator_profiles 
    SET 
        persistent_stream_key = stream_key,
        persistent_rtmp_url = rtmp_url,
        updated_at = now()
    WHERE wallet_address = creator_wallet_address;
END;
$function$;

-- Create trigger to auto-generate stream credentials for new creator profiles
CREATE OR REPLACE FUNCTION public.auto_generate_stream_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Generate stream credentials when profile is created
    IF NEW.persistent_stream_key IS NULL THEN
        PERFORM public.generate_persistent_stream_credentials(NEW.wallet_address);
        
        -- Refresh the NEW record with generated values
        SELECT persistent_stream_key, persistent_rtmp_url 
        INTO NEW.persistent_stream_key, NEW.persistent_rtmp_url 
        FROM public.creator_profiles 
        WHERE wallet_address = NEW.wallet_address;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger for auto-generating stream credentials
CREATE TRIGGER generate_stream_credentials_on_insert
    AFTER INSERT ON public.creator_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_stream_credentials();

-- Backfill existing creator profiles with stream credentials
DO $$
DECLARE
    creator RECORD;
BEGIN
    FOR creator IN SELECT wallet_address FROM public.creator_profiles WHERE persistent_stream_key IS NULL
    LOOP
        PERFORM public.generate_persistent_stream_credentials(creator.wallet_address);
    END LOOP;
END $$;