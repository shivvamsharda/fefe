
-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'chat_messages';

-- Drop all existing policies on chat_messages
DROP POLICY IF EXISTS "Allow public read access to chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow real-time chat access" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow message updates" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow message updates for moderation" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow wallet-based message insertion" ON public.chat_messages;

-- Create new RLS policies that work with wallet-based authentication
-- Allow anyone to read chat messages (for real-time functionality)
CREATE POLICY "Enable read access for all users" ON public.chat_messages
FOR SELECT USING (true);

-- Allow inserting messages only if sender_wallet_address is provided
CREATE POLICY "Enable insert for wallet users" ON public.chat_messages
FOR INSERT WITH CHECK (sender_wallet_address IS NOT NULL AND sender_wallet_address != '');

-- Allow updates for message deletion/moderation (stream creators)
CREATE POLICY "Enable update for moderation" ON public.chat_messages
FOR UPDATE USING (true);
