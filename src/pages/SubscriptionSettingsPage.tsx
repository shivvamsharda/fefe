import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useWallet } from '@/context/WalletContext';
import { getCreatorProfileByWallet, updateCreatorProfile, CreatorProfile } from '@/services/creatorProfileService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SubscriptionSettingsPage = () => {
  const { hasWalletCapability, effectiveWalletAddress } = useWallet();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState<boolean>(false);
  const [subscriptionPriceSol, setSubscriptionPriceSol] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (effectiveWalletAddress) {
        setIsLoading(true);
        const creatorProfile = await getCreatorProfileByWallet(effectiveWalletAddress);
        if (creatorProfile) {
          setProfile(creatorProfile);
          setSubscriptionEnabled(creatorProfile.subscription_enabled);
          setSubscriptionPriceSol(creatorProfile.subscription_price_sol?.toString() || '');
        } else {
          toast.error("Creator profile not found. Please set up your creator profile first.");
        }
        setIsLoading(false);
      }
    };

    if (hasWalletCapability) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [effectiveWalletAddress, hasWalletCapability]);

  const handleSave = async () => {
    if (!profile || !effectiveWalletAddress) {
      toast.error("Profile not loaded or wallet not connected.");
      return;
    }

    if (subscriptionEnabled && (!subscriptionPriceSol || parseFloat(subscriptionPriceSol) <= 0)) {
      toast.error("Subscription price must be a positive number when subscriptions are enabled.");
      return;
    }

    setIsSaving(true);
    const price = subscriptionEnabled ? parseFloat(subscriptionPriceSol) : null;

    const updatedSettings = {
      subscription_enabled: subscriptionEnabled,
      subscription_price_sol: price,
    };

    const updatedProfile = await updateCreatorProfile(effectiveWalletAddress, updatedSettings);

    if (updatedProfile) {
      setProfile(updatedProfile);
      setSubscriptionEnabled(updatedProfile.subscription_enabled);
      setSubscriptionPriceSol(updatedProfile.subscription_price_sol?.toString() || '');
      toast.success("Subscription settings updated successfully!");
    }
    setIsSaving(false);
  };

  if (!hasWalletCapability) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Subscription Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">Please connect your wallet to manage subscription settings.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  if (!profile && !isLoading) {
     return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Subscription Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Creator profile not found. You might need to create one first on the Creator Setup page.
              </p>
            </CardContent>
             <CardFooter>
                <Button onClick={() => window.location.href = '/creator/setup'} className="w-full">Go to Creator Setup</Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Subscription Settings</CardTitle>
            <CardDescription>
              Manage whether your content requires a subscription and set your monthly price.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="subscription-enabled" className="flex flex-col space-y-1">
                <span>Enable Subscriptions</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Allow viewers to subscribe to your content for a monthly fee.
                </span>
              </Label>
              <Switch
                id="subscription-enabled"
                checked={subscriptionEnabled}
                onCheckedChange={setSubscriptionEnabled}
                disabled={isSaving}
              />
            </div>
            {subscriptionEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subscription-price">Subscription Price (SOL per month)</Label>
                  <Input
                    id="subscription-price"
                    type="number"
                    placeholder="e.g., 0.5"
                    value={subscriptionPriceSol}
                    onChange={(e) => setSubscriptionPriceSol(e.target.value)}
                    disabled={!subscriptionEnabled || isSaving}
                    min="0.000000001" 
                    step="any"
                  />
                </div>
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Revenue Split</AlertTitle>
                  <AlertDescription>
                    You keep 80% of the subscription revenue. We apply a 20% platform fee to support the platform. This fee will be automatically deducted during subscriber payments.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} disabled={isSaving || isLoading} className="w-full">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default SubscriptionSettingsPage;
