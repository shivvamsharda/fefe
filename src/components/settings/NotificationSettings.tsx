import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/context/WalletContext';

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  stream_alerts: boolean;
  donation_alerts: boolean;
  follower_alerts: boolean;
  marketing_emails: boolean;
}

const NotificationSettings = () => {
  const { userProfile, isAuthenticated } = useWallet();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    stream_alerts: true,
    donation_alerts: true,
    follower_alerts: true,
    marketing_emails: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.notification_preferences) {
      setPreferences(userProfile.notification_preferences as NotificationPreferences);
    }
  }, [userProfile]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!isAuthenticated || !userProfile?.id) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          notification_preferences: preferences as any
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      toast.success('Notification settings updated successfully!');
    } catch (error: any) {
      console.error('Error updating notification settings:', error);
      toast.error(error.message || 'Failed to update notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please connect your wallet to access notification settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notification Settings</h3>
        <p className="text-sm text-muted-foreground">
          Choose how you want to be notified about activity on your account.
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Notifications</CardTitle>
            <CardDescription>
              Receive notifications via email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for important updates
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.email_notifications}
                onCheckedChange={() => handleToggle('email_notifications')}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing-emails">Marketing emails</Label>
                <p className="text-sm text-muted-foreground">
                  Receive emails about new features and updates
                </p>
              </div>
              <Switch
                id="marketing-emails"
                checked={preferences.marketing_emails}
                onCheckedChange={() => handleToggle('marketing_emails')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Push Notifications</CardTitle>
            <CardDescription>
              Get notified instantly on your devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on your devices
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.push_notifications}
                onCheckedChange={() => handleToggle('push_notifications')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stream Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stream Activity</CardTitle>
            <CardDescription>
              Get notified about stream-related activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="stream-alerts">Stream alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when streams you follow go live
                </p>
              </div>
              <Switch
                id="stream-alerts"
                checked={preferences.stream_alerts}
                onCheckedChange={() => handleToggle('stream_alerts')}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="donation-alerts">Donation alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you receive donations
                </p>
              </div>
              <Switch
                id="donation-alerts"
                checked={preferences.donation_alerts}
                onCheckedChange={() => handleToggle('donation_alerts')}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="follower-alerts">New follower alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone follows you
                </p>
              </div>
              <Switch
                id="follower-alerts"
                checked={preferences.follower_alerts}
                onCheckedChange={() => handleToggle('follower_alerts')}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Notification Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;