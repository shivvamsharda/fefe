
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import VodCard from '@/components/vod/VodCard';
import { Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVods, VodData } from '@/services/streamService';
import { refreshAllVodDurations } from '@/services/vodService';
import { useLanguage } from '@/context/LanguageContext';

const VODS_PER_PAGE = 20;

const AllVODs = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [displayedCount, setDisplayedCount] = useState(VODS_PER_PAGE);
  
  const { 
    data: allVods, 
    isLoading, 
    error 
  } = useQuery<VodData[]>({
    queryKey: ['all-vods'],
    queryFn: () => getVods(), // No limit - fetch all VODs
    staleTime: 2 * 60 * 1000,
  });

  // Auto-refresh durations when page loads
  const { } = useQuery({
    queryKey: ['refresh-all-durations'],
    queryFn: async () => {
      const result = await refreshAllVodDurations();
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['all-vods'] });
      }
      return result;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const mapVodToCard = (vod: VodData) => {
    const userProfile = vod.user_profiles;
    const creatorProfile = userProfile?.creator_profiles;
    
    return {
      id: vod.id,
      playbackId: vod.mux_playback_id,
      title: vod.title,
      creator: {
        id: vod.user_profiles?.id || '',
        name: creatorProfile?.display_name || userProfile?.display_name || userProfile?.username || 'Unknown Creator',
        avatar: creatorProfile?.profile_picture_url || userProfile?.avatar_url || 'https://placehold.co/100x100/101010/FFFFFF?text=U',
        walletAddress: userProfile?.wallet_address || ''
      },
      thumbnail: vod.thumbnail_url,
      category: vod.streams?.category || undefined
    };
  };

  const displayedVods = allVods?.slice(0, displayedCount) || [];
  const hasMoreVods = allVods && allVods.length > displayedCount;

  const loadMoreVods = () => {
    setDisplayedCount(prev => prev + VODS_PER_PAGE);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{t('vods.loading')}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">{t('vods.error')}</h2>
              <p className="text-muted-foreground">{t('vods.error_description')}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('vods.title')}</h1>
            <p className="text-muted-foreground">
              {t('vods.subtitle')}
              {allVods && ` (${allVods.length} ${t('vods.total_count')})`}
            </p>
          </div>
        </div>

        {allVods && allVods.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedVods.map((vod) => (
                <VodCard
                  key={vod.id}
                  {...mapVodToCard(vod)}
                />
              ))}
            </div>
            
            {hasMoreVods && (
              <div className="flex justify-center mt-12">
                <Button 
                  onClick={loadMoreVods}
                  variant="outline"
                  size="lg"
                  className="px-8"
                >
                  {t('content.load_more')} ({allVods.length - displayedCount} {t('vods.remaining')})
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">{t('vods.no_vods')}</h2>
              <p className="text-muted-foreground">
                {t('vods.no_vods_description')}
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AllVODs;
