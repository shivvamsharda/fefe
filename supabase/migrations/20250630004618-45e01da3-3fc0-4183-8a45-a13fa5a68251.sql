
-- Create promotion_access_passes table
CREATE TABLE public.promotion_access_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  transaction_signature TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient wallet address lookups
CREATE INDEX idx_promotion_access_passes_wallet_active 
ON public.promotion_access_passes(wallet_address, is_active, expires_at);

-- Add RLS policies
ALTER TABLE public.promotion_access_passes ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own access passes
CREATE POLICY "Users can view their own access passes" 
  ON public.promotion_access_passes 
  FOR SELECT 
  USING (true);

-- Policy to allow inserting access passes
CREATE POLICY "Allow inserting access passes" 
  ON public.promotion_access_passes 
  FOR INSERT 
  WITH CHECK (true);

-- Function to check if a wallet has an active access pass
CREATE OR REPLACE FUNCTION public.check_active_access_pass(input_wallet_address text)
RETURNS TABLE(
  id UUID,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  transaction_signature TEXT,
  hours_remaining NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pap.id,
    pap.expires_at,
    pap.created_at,
    pap.transaction_signature,
    EXTRACT(EPOCH FROM (pap.expires_at - now())) / 3600 as hours_remaining
  FROM public.promotion_access_passes pap
  WHERE pap.wallet_address = input_wallet_address
    AND pap.is_active = true
    AND pap.expires_at > now()
  ORDER BY pap.expires_at DESC
  LIMIT 1;
END;
$$;

-- Function to create or extend access pass
CREATE OR REPLACE FUNCTION public.create_access_pass(
  input_wallet_address text,
  input_transaction_signature text
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_pass_id UUID;
  existing_pass_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if there's an existing active pass
  SELECT expires_at INTO existing_pass_expires_at
  FROM public.promotion_access_passes
  WHERE wallet_address = input_wallet_address
    AND is_active = true
    AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;
  
  -- Create new access pass
  INSERT INTO public.promotion_access_passes (
    wallet_address,
    expires_at,
    transaction_signature
  )
  VALUES (
    input_wallet_address,
    COALESCE(existing_pass_expires_at, now()) + INTERVAL '24 hours',
    input_transaction_signature
  )
  RETURNING id INTO new_pass_id;
  
  RETURN new_pass_id;
END;
$$;

-- Function to auto-expire old access passes
CREATE OR REPLACE FUNCTION public.auto_expire_access_passes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.promotion_access_passes
  SET 
    is_active = false,
    updated_at = now()
  WHERE 
    is_active = true 
    AND expires_at < now();
END;
$$;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_promotion_access_passes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER update_promotion_access_passes_updated_at
  BEFORE UPDATE ON public.promotion_access_passes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_promotion_access_passes_updated_at();
