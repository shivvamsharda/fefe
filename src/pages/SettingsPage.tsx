import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { User, Settings, Wallet, Video, BarChart3 } from 'lucide-react';
import ProfileSettings from '@/components/settings/ProfileSettings';
import StreamingSettings from '@/components/settings/StreamingSettings';
import WalletSettings from '@/components/settings/WalletSettings';
import VodSettings from '@/components/settings/VodSettings';
import AnalyticsSettings from '@/components/settings/AnalyticsSettings';
import Layout from '@/components/layout/Layout';
import { useWallet } from '@/context/WalletContext';

const SettingsPage = () => {
  const { connected, walletAddress, isGoogleAuthenticated, userProfile } = useWallet();
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full ${(!connected && !walletAddress && !isGoogleAuthenticated && !userProfile?.wallet_address) ? 'grid-cols-4' : 'grid-cols-5'} lg:w-auto h-auto p-1`}>
            <TabsTrigger 
              value="profile" 
              className="flex flex-col items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <User size={18} />
              <span className="hidden sm:inline text-xs">Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="streaming" 
              className="flex flex-col items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings size={18} />
              <span className="hidden sm:inline text-xs">Streaming</span>
            </TabsTrigger>
            {(connected || walletAddress || isGoogleAuthenticated || userProfile?.wallet_address) && (
              <TabsTrigger 
                value="wallet" 
                className="flex flex-col items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Wallet size={18} />
                <span className="hidden sm:inline text-xs">Wallet</span>
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="vods" 
              className="flex flex-col items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Video size={18} />
              <span className="hidden sm:inline text-xs">VODs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="flex flex-col items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BarChart3 size={18} />
              <span className="hidden sm:inline text-xs">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="p-6">
              <TabsContent value="profile" className="mt-0">
                <ProfileSettings />
              </TabsContent>
              
              <TabsContent value="streaming" className="mt-0">
                <StreamingSettings />
              </TabsContent>
              
              {(connected || walletAddress || isGoogleAuthenticated || userProfile?.wallet_address) && (
                <TabsContent value="wallet" className="mt-0">
                  <WalletSettings />
                </TabsContent>
              )}
              
              <TabsContent value="vods" className="mt-0">
                <VodSettings />
              </TabsContent>
              
              <TabsContent value="analytics" className="mt-0">
                <AnalyticsSettings />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SettingsPage;