
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import StreamCard from '@/components/stream/StreamCard';
import { getFollowingLiveStreams, getFollowingVods } from '@/services/followingContentService';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Play, Video, Users, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const FollowingPage = () => {
  const { isAuthenticated, userUuid, openWalletModal } = useWallet();
  const { t } = useLanguage();

  // Fetch live streams from followed creators - optimized caching
  const { data: liveStreams = [], isLoading: loadingStreams } = useQuery({
    queryKey: ['following-live-streams', userUuid],
    queryFn: () => getFollowingLiveStreams(userUuid!),
    enabled: isAuthenticated && !!userUuid,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 45000, // Increased from default
  });

  // Fetch VODs from followed creators - optimized caching
  const { data: vods = [], isLoading: loadingVods } = useQuery({
    queryKey: ['following-vods', userUuid],
    queryFn: () => getFollowingVods(userUuid!),
    enabled: isAuthenticated && !!userUuid,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center max-w-md mx-auto">
            <LogIn size={64} className="mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">{t('nav.following')}</h1>
            <p className="text-muted-foreground mb-6">
              {t('following.login_description')}
            </p>
            <Button onClick={openWalletModal} className="mr-4">
              {t('nav.login')}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">{t('following.go_home')}</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const isLoading = loadingStreams || loadingVods;
  const hasContent = liveStreams.length > 0 || vods.length > 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart size={32} className="text-primary" />
            <h1 className="text-3xl font-bold">{t('nav.following')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('following.description')}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted aspect-video rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : !hasContent ? (
          <div className="text-center py-16">
            <Users size={64} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">{t('following.no_content_title')}</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('following.no_content_description')}
            </p>
            <Button asChild>
              <Link to="/explore-creators">{t('nav.explore')}</Link>
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="live" className="flex items-center gap-2">
                <Play size={16} />
                {t('following.live_tab')} ({liveStreams.length})
              </TabsTrigger>
              <TabsTrigger value="vods" className="flex items-center gap-2">
                <Video size={16} />
                {t('following.vods_tab')} ({vods.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="live" className="mt-6">
              {liveStreams.length === 0 ? (
                <div className="text-center py-12">
                  <Play size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t('following.no_live_streams')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {liveStreams.map((stream) => (
                    <StreamCard
                      key={stream.id}
                      id={stream.id}
                      title={stream.title}
                      creator={{
                        id: stream.user_id,
                        name: stream.creator_profile.display_name,
                        avatar: stream.creator_profile.profile_picture_url || `https://placehold.co/100x100/101010/FFFFFF?text=${stream.creator_profile.display_name?.substring(0,2) || 'U'}`,
                        walletAddress: stream.creator_profile.wallet_address
                      }}
                      thumbnail={stream.thumbnail}
                      viewerCount={stream.viewer_count}
                      isLive={true}
                      category={stream.category}
                      language={stream.language}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="vods" className="mt-6">
              {vods.length === 0 ? (
                <div className="text-center py-12">
                  <Video size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t('following.no_vods')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {vods.map((vod) => (
                    <StreamCard
                      key={vod.id}
                      id={vod.mux_playback_id}
                      title={vod.title}
                      creator={{
                        id: vod.user_id,
                        name: vod.creator_profile.display_name,
                        avatar: vod.creator_profile.profile_picture_url || `https://placehold.co/100x100/101010/FFFFFF?text=${vod.creator_profile.display_name?.substring(0,2) || 'U'}`,
                        walletAddress: vod.creator_profile.wallet_address
                      }}
                      thumbnail={vod.thumbnail_url}
                      viewerCount={0}
                      isLive={false}
                      language={null}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default FollowingPage;
