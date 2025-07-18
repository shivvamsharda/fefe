-- Extend user_profiles table with additional settings fields
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email_notifications": true,
  "push_notifications": true,
  "stream_alerts": true,
  "donation_alerts": true,
  "follower_alerts": true,
  "marketing_emails": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "profile_visibility": "public",
  "show_earnings": false,
  "show_location": true,
  "allow_direct_messages": true,
  "two_factor_enabled": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS appearance_settings JSONB DEFAULT '{
  "theme": "system",
  "compact_mode": false,
  "animations_enabled": true,
  "sidebar_collapsed": false
}'::jsonb;