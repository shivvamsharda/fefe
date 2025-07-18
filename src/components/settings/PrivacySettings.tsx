import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Shield, Lock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/context/WalletContext';

interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'followers_only';
  show_earnings: boolean;
  show_location: boolean;
  allow_direct_messages: boolean;
  two_factor_enabled: boolean;
}

const PrivacySettings = () => {
  const { userProfile, isAuthenticated } = useWallet();
  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: 'public',
    show_earnings: false,
    show_location: true,
    allow_direct_messages: true,
    two_factor_enabled: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.privacy_settings) {
      setSettings(userProfile.privacy_settings as PrivacySettings);
    }
  }, [userProfile]);

  const handleToggle = (key: keyof Omit<PrivacySettings, 'profile_visibility'>) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleVisibilityChange = (value: 'public' | 'private' | 'followers_only') => {
    setSettings(prev => ({
      ...prev,
      profile_visibility: value
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
          privacy_settings: settings as any
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      toast.success('Privacy settings updated successfully!');
    } catch (error: any) {
      console.error('Error updating privacy settings:', error);
      toast.error(error.message || 'Failed to update privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2FA = () => {
    // Placeholder for 2FA setup
    toast.info('Two-factor authentication setup coming soon!');
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please connect your wallet to access privacy settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Privacy & Security</h3>
        <p className="text-sm text-muted-foreground">
          Control who can see your information and how you want to interact.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Visibility */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye size={16} />
              Profile Visibility
            </CardTitle>
            <CardDescription>
              Choose who can see your profile and activities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-visibility">Who can see your profile</Label>
              <Select
                value={settings.profile_visibility}
                onValueChange={handleVisibilityChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Everyone (Public)</SelectItem>
                  <SelectItem value="followers_only">Followers only</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.profile_visibility === 'public' && 'Your profile is visible to everyone'}
                {settings.profile_visibility === 'followers_only' && 'Only your followers can see your profile'}
                {settings.profile_visibility === 'private' && 'Your profile is completely private'}
              </p>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-earnings">Show earnings</Label>
                <p className="text-sm text-muted-foreground">
                  Display your earnings publicly on your profile
                </p>
              </div>
              <Switch
                id="show-earnings"
                checked={settings.show_earnings}
                onCheckedChange={() => handleToggle('show_earnings')}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-location">Show location</Label>
                <p className="text-sm text-muted-foreground">
                  Display your location on your profile
                </p>
              </div>
              <Switch
                id="show-location"
                checked={settings.show_location}
                onCheckedChange={() => handleToggle('show_location')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Communication */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Communication</CardTitle>
            <CardDescription>
              Control how others can interact with you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-dm">Allow direct messages</Label>
                <p className="text-sm text-muted-foreground">
                  Let other users send you direct messages
                </p>
              </div>
              <Switch
                id="allow-dm"
                checked={settings.allow_direct_messages}
                onCheckedChange={() => handleToggle('allow_direct_messages')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={16} />
              Security
            </CardTitle>
            <CardDescription>
              Additional security measures for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="two-factor">Two-factor authentication</Label>
                <p className="text-sm text-mused-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="two-factor"
                  checked={settings.two_factor_enabled}
                  onCheckedChange={() => handleToggle('two_factor_enabled')}
                  disabled
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleSetup2FA}
                  className="flex items-center gap-1"
                >
                  <Lock size={14} />
                  Setup
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Two-factor authentication is coming soon. This will add an extra layer of security to your account.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Privacy Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;