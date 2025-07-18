
-- Fix the streams table status constraint to allow 'ended' status
-- This will resolve the constraint violation errors and allow proper stream termination

ALTER TABLE public.streams DROP CONSTRAINT IF EXISTS streams_status_check;

ALTER TABLE public.streams ADD CONSTRAINT streams_status_check 
CHECK (status IN ('idle', 'active', 'disconnected', 'ended'));
