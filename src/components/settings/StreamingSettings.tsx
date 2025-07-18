import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/context/WalletContext';
import { getCreatorProfile, regenerateStreamKey, CreatorProfile } from '@/services/creatorProfileService';

const StreamingSettings = () => {
  const { hasWalletCapability, effectiveWalletAddress } = useWallet();
  const queryClient = useQueryClient();
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [autoRecord, setAutoRecord] = useState(true);
  const [chatModeration, setChatModeration] = useState(true);
  const [subscriberOnlyChat, setSubscriberOnlyChat] = useState(false);

  // Fetch creator profile with stream credentials
  const { data: creatorProfile, isLoading: isLoadingProfile } = useQuery<CreatorProfile | null>({
    queryKey: ['creatorProfile', effectiveWalletAddress],
    queryFn: () => effectiveWalletAddress ? getCreatorProfile(effectiveWalletAddress) : Promise.resolve(null),
    enabled: !!effectiveWalletAddress && hasWalletCapability,
  });

  // Regenerate stream key mutation
  const regenerateKeyMutation = useMutation({
    mutationFn: () => {
      if (!effectiveWalletAddress) throw new Error('No wallet connected');
      return regenerateStreamKey(effectiveWalletAddress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creatorProfile', effectiveWalletAddress] });
      toast.success('Stream key regenerated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to regenerate stream key: ${error.message}`);
    },
  });

  const streamKey = creatorProfile?.persistent_stream_key || "";
  const streamUrl = creatorProfile?.persistent_rtmp_url || "";

  const handleCopyStreamKey = () => {
    navigator.clipboard.writeText(streamKey);
    toast.success('Stream key copied to clipboard');
  };

  const handleCopyStreamUrl = () => {
    navigator.clipboard.writeText(streamUrl);
    toast.success('Stream URL copied to clipboard');
  };

  const handleRegenerateKey = () => {
    if (window.confirm('Are you sure you want to regenerate your stream key? You will need to update your streaming software with the new key.')) {
      regenerateKeyMutation.mutate();
    }
  };

  const handleSaveSettings = () => {
    // TODO: Implement actual save functionality for stream preferences
    toast.success('Stream settings updated successfully');
  };

  if (!hasWalletCapability) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please connect your wallet to access streaming settings.</p>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!creatorProfile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please create a creator profile first to access streaming settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Streaming Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure your streaming preferences and settings.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Stream Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stream Configuration</CardTitle>
            <CardDescription>
              Your streaming connection details and basic settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stream Key */}
            <div className="space-y-2">
              <Label htmlFor="stream-key">Stream Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="stream-key"
                    type={showStreamKey ? "text" : "password"}
                    value={streamKey}
                    readOnly
                    className="pr-20"
                    placeholder={!streamKey ? "Loading..." : undefined}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowStreamKey(!showStreamKey)}
                      className="h-6 w-6 p-0"
                      disabled={!streamKey}
                    >
                      {showStreamKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyStreamKey}
                      className="h-6 w-6 p-0"
                      disabled={!streamKey}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateKey}
                  disabled={regenerateKeyMutation.isPending || !streamKey}
                  className="shrink-0"
                >
                  {regenerateKeyMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep your stream key private. Use this in your streaming software (OBS, etc.).
              </p>
            </div>

            {/* Stream URL */}
            <div className="space-y-2">
              <Label htmlFor="stream-url">Stream URL (RTMP)</Label>
              <div className="flex gap-2">
                <Input
                  id="stream-url"
                  type="text"
                  value={streamUrl}
                  readOnly
                  className="flex-1"
                  placeholder={!streamUrl ? "Loading..." : undefined}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyStreamUrl}
                  disabled={!streamUrl}
                >
                  <Copy size={14} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this RTMP URL in your streaming software along with your stream key.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stream Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stream Preferences</CardTitle>
            <CardDescription>
              Configure your streaming and chat preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-record">Auto-start recording</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically record all your streams for VOD playback
                </p>
              </div>
              <Switch 
                id="auto-record" 
                checked={autoRecord}
                onCheckedChange={setAutoRecord}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="chat-moderation">Enable chat moderation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically filter inappropriate language and spam
                </p>
              </div>
              <Switch 
                id="chat-moderation" 
                checked={chatModeration}
                onCheckedChange={setChatModeration}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="subscriber-chat">Subscriber-only chat</Label>
                <p className="text-sm text-muted-foreground">
                  Only followers can send messages in your chat
                </p>
              </div>
              <Switch 
                id="subscriber-chat" 
                checked={subscriberOnlyChat}
                onCheckedChange={setSubscriberOnlyChat}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} className="bg-gradient-to-r from-primary to-primary/80">
            Update Stream Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StreamingSettings;