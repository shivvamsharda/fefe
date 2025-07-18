import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Moon, Sun, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from 'next-themes';

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  compact_mode: boolean;
  animations_enabled: boolean;
  sidebar_collapsed: boolean;
}

const AppearanceSettings = () => {
  const { userProfile, isAuthenticated } = useWallet();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppearanceSettings>({
    theme: 'system',
    compact_mode: false,
    animations_enabled: true,
    sidebar_collapsed: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.appearance_settings) {
      const appearanceSettings = userProfile.appearance_settings as AppearanceSettings;
      setSettings(appearanceSettings);
      
      // Apply theme setting
      if (appearanceSettings.theme !== theme) {
        setTheme(appearanceSettings.theme);
      }
    }
  }, [userProfile, theme, setTheme]);

  const handleToggle = (key: keyof Omit<AppearanceSettings, 'theme'>) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setSettings(prev => ({
      ...prev,
      theme: newTheme
    }));
    setTheme(newTheme);
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
          appearance_settings: settings as any
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      toast.success('Appearance settings updated successfully!');
    } catch (error: any) {
      console.error('Error updating appearance settings:', error);
      toast.error(error.message || 'Failed to update appearance settings');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    const defaultSettings: AppearanceSettings = {
      theme: 'system',
      compact_mode: false,
      animations_enabled: true,
      sidebar_collapsed: false,
    };
    setSettings(defaultSettings);
    setTheme('system');
    toast.success('Settings reset to defaults');
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please connect your wallet to access appearance settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize how the application looks and feels.
        </p>
      </div>

      <div className="space-y-6">
        {/* Theme Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette size={16} />
              Theme
            </CardTitle>
            <CardDescription>
              Choose your preferred color theme.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-select">Color theme</Label>
              <Select
                value={settings.theme}
                onValueChange={handleThemeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun size={16} />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon size={16} />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor size={16} />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.theme === 'system' && 'Automatically switch between light and dark based on your system preference'}
                {settings.theme === 'light' && 'Use light theme'}
                {settings.theme === 'dark' && 'Use dark theme'}
              </p>
            </div>

            {/* Theme Preview */}
            <div className="grid grid-cols-3 gap-3">
              <div 
                className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                  settings.theme === 'light' ? 'border-primary' : 'border-border'
                }`}
                onClick={() => handleThemeChange('light')}
              >
                <div className="bg-white border rounded p-2 space-y-1">
                  <div className="bg-gray-200 h-2 rounded"></div>
                  <div className="bg-gray-100 h-2 rounded w-3/4"></div>
                </div>
                <p className="text-xs text-center mt-2 font-medium">Light</p>
              </div>
              
              <div 
                className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                  settings.theme === 'dark' ? 'border-primary' : 'border-border'
                }`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className="bg-gray-900 border border-gray-700 rounded p-2 space-y-1">
                  <div className="bg-gray-700 h-2 rounded"></div>
                  <div className="bg-gray-800 h-2 rounded w-3/4"></div>
                </div>
                <p className="text-xs text-center mt-2 font-medium">Dark</p>
              </div>
              
              <div 
                className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                  settings.theme === 'system' ? 'border-primary' : 'border-border'
                }`}
                onClick={() => handleThemeChange('system')}
              >
                <div className="relative">
                  <div className="bg-white border rounded p-2 space-y-1 w-1/2">
                    <div className="bg-gray-200 h-1 rounded"></div>
                    <div className="bg-gray-100 h-1 rounded w-3/4"></div>
                  </div>
                  <div className="bg-gray-900 border border-gray-700 rounded p-2 space-y-1 w-1/2 absolute top-0 right-0">
                    <div className="bg-gray-700 h-1 rounded"></div>
                    <div className="bg-gray-800 h-1 rounded w-3/4"></div>
                  </div>
                </div>
                <p className="text-xs text-center mt-2 font-medium">System</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Display Options</CardTitle>
            <CardDescription>
              Customize the layout and visual elements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-mode">Compact mode</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce spacing and make UI more compact
                </p>
              </div>
              <Switch
                id="compact-mode"
                checked={settings.compact_mode}
                onCheckedChange={() => handleToggle('compact_mode')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="animations">Enable animations</Label>
                <p className="text-sm text-muted-foreground">
                  Use smooth transitions and animations
                </p>
              </div>
              <Switch
                id="animations"
                checked={settings.animations_enabled}
                onCheckedChange={() => handleToggle('animations_enabled')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sidebar-collapsed">Collapse sidebar by default</Label>
                <p className="text-sm text-muted-foreground">
                  Start with sidebar in collapsed state
                </p>
              </div>
              <Switch
                id="sidebar-collapsed"
                checked={settings.sidebar_collapsed}
                onCheckedChange={() => handleToggle('sidebar_collapsed')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accessibility</CardTitle>
            <CardDescription>
              Accessibility and usability options.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Additional accessibility options coming soon</p>
              <p className="text-sm text-muted-foreground">
                We're working on adding more accessibility features including:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• High contrast mode</li>
                <li>• Font size adjustments</li>
                <li>• Reduced motion options</li>
                <li>• Screen reader optimizations</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Appearance Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;