import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Video } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/context/WalletContext';
import { getVodsByUserId, CreatorVod } from '@/services/streamService';
import VodCard from '@/components/vod/VodCard';

const VodSettings = () => {
  const { hasWalletCapability, userProfile } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch VODs
  const { data: vods, isLoading: isLoadingVods, error: vodsError } = useQuery<CreatorVod[]>({
    queryKey: ['creatorVods', userProfile?.id],
    queryFn: () => userProfile?.id ? getVodsByUserId(userProfile.id) : Promise.resolve([]),
    enabled: !!userProfile?.id && hasWalletCapability,
  });

  // Filter VODs based on search query
  const filteredVods = vods?.filter(vod => 
    vod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vod.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleVodDeleted = (vodId: string) => {
    // The VodCard component already handles query invalidation
    toast.success('VOD deleted successfully');
  };

  if (!hasWalletCapability) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please connect your wallet to access VOD settings.</p>
      </div>
    );
  }

  if (!userProfile?.id) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">VOD Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage your video-on-demand content and recordings.
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search VODs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* VODs Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Video size={20} />
            Your VODs ({filteredVods.length})
          </CardTitle>
          <CardDescription>
            Hover over any VOD to delete it. Deleted VODs cannot be recovered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingVods ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : vodsError ? (
            <div className="text-center py-8">
              <p className="text-destructive">Failed to load VODs</p>
            </div>
          ) : filteredVods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVods.map((vod) => (
                <VodCard
                  key={vod.id}
                  id={vod.id}
                  playbackId={vod.mux_playback_id}
                  title={vod.title}
                  creator={{
                    id: vod.user_id,
                    name: vod.user_profiles?.display_name || vod.user_profiles?.username || 'Unknown',
                    avatar: vod.user_profiles?.avatar_url || '',
                    walletAddress: vod.user_profiles?.wallet_address || ''
                  }}
                  thumbnail={vod.thumbnail_url}
                  category={vod.streams?.category}
                  showDeleteButton={true}
                  onVodDeleted={handleVodDeleted}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No VODs found' : 'No VODs yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'Try adjusting your search terms.'
                  : 'Your stream recordings and VODs will appear here.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VodSettings;