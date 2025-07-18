
-- Remove all existing RLS policies on chat_messages to fix real-time subscriptions
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable insert for wallet users" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable update for moderation" ON public.chat_messages;

-- Disable RLS on chat_messages to allow real-time subscriptions to work
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
