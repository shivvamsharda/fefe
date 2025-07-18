
-- Make creator_user_id nullable since we're using wallet-based authentication
ALTER TABLE public.promoted_streams ALTER COLUMN creator_user_id DROP NOT NULL;
