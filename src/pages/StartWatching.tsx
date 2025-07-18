import React, { useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ChevronRight, DollarSign, Code, Book, EyeOff, Loader2, Gamepad, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getActiveStreams, getVods, getVodsByCategory } from '@/services/streamService';
import StreamCard from '../components/stream/StreamCard';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import type { CreatorProfile } from '@/services/creatorProfileService';

// Copied types from Index.tsx (ideally these should be in a shared file for better maintainability)
type NestedUserProfile = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  wallet_address?: string | null;
} | null | undefined;

type LiveStreamData = {
  id: string;
  title: string;
  thumbnail?: string | null;
  viewer_count?: number | null;
  category?: string | null;
  user_profiles: NestedUserProfile;
};

type VodData = {
  id: string;
  mux_playback_id: string;
  title?: string | null;
  thumbnail_url?: string | null;
  user_profiles: NestedUserProfile;
  streams?: { category?: string | null } | null; 
};
// End of copied types

const VODS_PER_PAGE = 20;

const StartWatching = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [displayedVodCounts, setDisplayedVodCounts] = useState<Record<string, number>>({});

  // Updated categories list to use translation system - moved inside component to access t()
  const pageCategories = [
    { id: 'memecoins', name: t('category.memecoins'), value: 'memecoins', icon: DollarSign, count: 0 },
    { id: 'gaming', name: t('category.gaming'), value: 'gaming', icon: Gamepad, count: 0 },
    { id: 'dev', name: t('category.development'), value: 'dev', icon: Code, count: 0 },
    { id: 'trading', name: t('category.trading'), value: 'trading', icon: TrendingUp, count: 0 },
    { id: 'education', name: t('category.education'), value: 'education', icon: Book, count: 0 },
    { id: 'nsfw', name: t('category.nsfw'), value: 'nsfw', icon: EyeOff, count: 0 },
  ];

  // Data fetching logic (adapted from Index.tsx)
  const { 
    data: liveStreamsData, 
    isLoading: liveStreamsLoading, 
    error: liveStreamsError
  } = useQuery<LiveStreamData[]>({
    queryKey: ['activeStreamsWatchPage'],
    queryFn: getActiveStreams,
    refetchInterval: 30000, // Slightly longer interval for a sub-page
  });

  const {
    data: vodsData,
    isLoading: vodsLoading,
    error: vodsError
  } = useQuery<VodData[]>({
    queryKey: ['vodsWatchPage', categoryParam],
    queryFn: () => {
      if (categoryParam) {
        return getVodsByCategory(categoryParam);
      }
      return getVods(); // Fetch all VODs when no category is selected
    },
    refetchInterval: 120000, 
  });

  const userProfileIds = useMemo(() => {
    const ids = new Set<string>();
    liveStreamsData?.forEach(s => {
      if (s.user_profiles?.id) ids.add(s.user_profiles.id);
    });
    vodsData?.forEach(v => {
      if (v.user_profiles?.id) ids.add(v.user_profiles.id);
    });
    return Array.from(ids);
  }, [liveStreamsData, vodsData]);

  const { data: associatedUserProfilesData } = useQuery<{ id: string; wallet_address: string }[]>({
    queryKey: ['associatedUserProfilesWatchPage', userProfileIds],
    queryFn: async () => {
      if (!userProfileIds || userProfileIds.length === 0) return [];
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, wallet_address')
        .in('id', userProfileIds);
      if (error) { console.error('Error fetching associated user profiles:', error); return []; }
      return data || [];
    },
    enabled: userProfileIds.length > 0,
  });

  const userIdToWalletMap = useMemo(() => {
    const map = new Map<string, string>();
    associatedUserProfilesData?.forEach(profile => {
      if (profile.wallet_address) map.set(profile.id, profile.wallet_address);
    });
    return map;
  }, [associatedUserProfilesData]);

  const walletAddressesFromMedia = useMemo(() => {
    const addresses = new Set<string>();
    liveStreamsData?.forEach(s => {
      if (s.user_profiles?.id) {
        const walletAddress = userIdToWalletMap.get(s.user_profiles.id);
        if (walletAddress) addresses.add(walletAddress);
      }
    });
    vodsData?.forEach(v => {
      if (v.user_profiles?.id) {
        const walletAddress = userIdToWalletMap.get(v.user_profiles.id);
        if (walletAddress) addresses.add(walletAddress);
      }
    });
    return Array.from(addresses);
  }, [liveStreamsData, vodsData, userIdToWalletMap]);

  const { data: creatorProfilesData } = useQuery<CreatorProfile[]>({
    queryKey: ['creatorProfilesWatchPage', walletAddressesFromMedia],
    queryFn: async () => {
      if (!walletAddressesFromMedia || walletAddressesFromMedia.length === 0) return [];
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('wallet_address, display_name, profile_picture_url, subscription_enabled, subscription_price_sol')
        .in('wallet_address', walletAddressesFromMedia);
      if (error) { console.error('Error fetching creator profiles:', error); return []; }
      return (data || []).map(profile => ({
        ...profile,
        subscription_enabled: profile.subscription_enabled ?? false,
        subscription_price_sol: profile.subscription_price_sol ?? null,
      })) as CreatorProfile[];
    },
    enabled: walletAddressesFromMedia.length > 0,
  });

  const creatorProfilesMap = useMemo(() => {
    const map = new Map<string, CreatorProfile>();
    creatorProfilesData?.forEach(profile => map.set(profile.wallet_address, profile));
    return map;
  }, [creatorProfilesData]);

  const transformLiveData = useCallback((stream: LiveStreamData) => {
    const userProfileOnStream = stream.user_profiles;
    const userProfileId = userProfileOnStream?.id;
    const walletAddress = userProfileId ? userIdToWalletMap.get(userProfileId) : undefined;
    const creatorProfile = walletAddress ? creatorProfilesMap.get(walletAddress) : undefined;
    const creatorDisplayName = creatorProfile?.display_name || userProfileOnStream?.username || 'Anonymous';
    const creatorAvatar = creatorProfile?.profile_picture_url || userProfileOnStream?.avatar_url || `https://placehold.co/100x100/212121/FFFFFF?text=${creatorDisplayName.substring(0, 2).toUpperCase() || 'AN'}`;

    return {
      id: stream.id,
      title: stream.title,
      creator: {
        id: userProfileOnStream?.id,
        name: creatorDisplayName,
        avatar: creatorAvatar,
        walletAddress: walletAddress,
      },
      thumbnail: stream.thumbnail || `https://placehold.co/800x450/101010/FFFFFF?text=${stream.title || 'LIVE'}`,
      viewerCount: stream.viewer_count || 0,
      isLive: true,
      category: stream.category,
    };
  }, [creatorProfilesMap, userIdToWalletMap]);
  
  const transformVodData = useCallback((vod: VodData) => {
    const userProfileOnVod = vod.user_profiles;
    const userProfileId = userProfileOnVod?.id;
    const walletAddress = userProfileId ? userIdToWalletMap.get(userProfileId) : undefined;
    const creatorProfile = walletAddress ? creatorProfilesMap.get(walletAddress) : undefined;
    const creatorDisplayName = creatorProfile?.display_name || userProfileOnVod?.username || 'Anonymous';
    const creatorAvatar = creatorProfile?.profile_picture_url || userProfileOnVod?.avatar_url || `https://placehold.co/100x100/212121/FFFFFF?text=${creatorDisplayName.substring(0, 2).toUpperCase() || 'AN'}`;

    return {
      id: vod.mux_playback_id,
      reactKey: vod.id,
      title: vod.title || 'Untitled VOD',
      creator: {
        id: userProfileOnVod?.id,
        name: creatorDisplayName,
        avatar: creatorAvatar,
        walletAddress: walletAddress,
      },
      thumbnail: vod.thumbnail_url || `https://placehold.co/800x450/101010/FFFFFF?text=${vod.title || 'VOD'}`,
      viewerCount: 0, 
      isLive: false,
      category: vod.streams?.category,
    };
  }, [creatorProfilesMap, userIdToWalletMap]);

  const allLiveStreams = useMemo(() => liveStreamsData?.map(transformLiveData) || [], [liveStreamsData, transformLiveData]);
  const allVods = useMemo(() => vodsData?.map(transformVodData) || [], [vodsData, transformVodData]);

  // Filter content by category if one is selected
  const filteredLiveStreams = useMemo(() => {
    if (!categoryParam) return [];
    return allLiveStreams.filter(stream => stream.category?.toLowerCase() === categoryParam.toLowerCase());
  }, [allLiveStreams, categoryParam]);

  const filteredVods = useMemo(() => {
    if (!categoryParam) return [];
    return allVods.filter(vod => vod.category?.toLowerCase() === categoryParam.toLowerCase());
  }, [allVods, categoryParam]);
  
  const currentCategoryName = useMemo(() => {
    if (!categoryParam) return '';
    const foundCategory = pageCategories.find(c => c.value.toLowerCase() === categoryParam.toLowerCase());
    return foundCategory ? foundCategory.name : categoryParam;
  }, [categoryParam]);

  const isLoading = liveStreamsLoading || vodsLoading; // Simplified loading state

  // Helper function to get displayed VODs count for a category
  const getDisplayedVodsCount = (category: string) => {
    return displayedVodCounts[category] || VODS_PER_PAGE;
  };

  // Helper function to load more VODs for a category
  const loadMoreVods = (category: string) => {
    setDisplayedVodCounts(prev => ({
      ...prev,
      [category]: getDisplayedVodsCount(category) + VODS_PER_PAGE
    }));
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-6 md:py-8 pt-24 md:pt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {categoryParam 
                ? <>{t('watch.explore_category')} <span className="solana-gradient bg-clip-text text-transparent">{currentCategoryName}</span> {t('watch.content')}</>
                : <>{t('watch.discover_category')} <span className="solana-gradient bg-clip-text text-transparent">{t('category.categories')}</span></>
              }
            </h1>
            <p className="text-foreground/70 mb-4">
              {categoryParam
                ? `${t('watch.find_content')} ${currentCategoryName} ${t('watch.category_text')}`
                : t('watch.browse_categories')
              }
            </p>
          </div>
        </div>
      </section>
      
      {/* Main Content Section */}
      <section className="py-4">
        <div className="container mx-auto px-4">
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="ml-2 text-foreground/70">{t('home.loading_content')}</p>
            </div>
          )}
          {!isLoading && (liveStreamsError || vodsError) && (
             <div className="text-center py-8 bg-destructive/10 rounded-md border border-destructive/30">
               <p className="text-foreground/70">
                 {liveStreamsError && vodsError ? t('content.error') : liveStreamsError ? 'Failed to load live streams.' : 'Failed to load VODs.'}
                 {' Please try again later.'}
               </p>
             </div>
          )}

          {!isLoading && !liveStreamsError && !vodsError && (
            <>
              {categoryParam ? (
                // Display content for the single selected category
                <div>
                  {/* Category name is already in the H1 hero */}
                  {/* <h2 className="text-2xl font-bold text-foreground mb-6">{currentCategoryName}</h2> */}
                  
                  {filteredLiveStreams.length === 0 && filteredVods.length === 0 && (
                    <div className="text-center py-12 bg-card rounded-md border border-border">
                      <p className="text-foreground/70 mb-4">
                        {t('watch.no_content_category')} {currentCategoryName} {t('watch.at_moment')}
                      </p>
                      <Link to="/watch">
                        <Button variant="outline">{t('watch.view_all_categories')}</Button>
                      </Link>
                    </div>
                  )}

                  {filteredLiveStreams.length > 0 && (
                    <div className="mb-10">
                      <h3 className="text-xl font-semibold text-foreground mb-4">{t('watch.live_streams')}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredLiveStreams.map((stream) => (
                          <StreamCard key={`live-${stream.id}`} {...stream} />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredVods.length > 0 && (
                     <div className="mb-10">
                      <h3 className="text-xl font-semibold text-foreground mb-4">
                        {t('watch.vods')} ({filteredVods.length} {t('watch.total')})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredVods.map((vod) => (
                          <StreamCard key={`vod-${vod.reactKey || vod.id}`} {...vod} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Display content for ALL categories
                <div className="space-y-12">
                  {pageCategories.map(pCategory => {
                    const liveStreamsInCategory = allLiveStreams.filter(s => s.category?.toLowerCase() === pCategory.value.toLowerCase());
                    const vodsInCategory = allVods.filter(v => v.category?.toLowerCase() === pCategory.value.toLowerCase());
                    const displayedCount = getDisplayedVodsCount(pCategory.value);
                    const displayedVods = vodsInCategory.slice(0, displayedCount);
                    const hasMoreVods = vodsInCategory.length > displayedCount;
                    const IconComponent = pCategory.icon;

                    return (
                      <div key={pCategory.id} className="category-section">
                        <Link 
                          to={`/watch?category=${encodeURIComponent(pCategory.value)}`}
                          className="group"
                        >
                          <div className="flex items-center mb-6 group-hover:text-primary transition-colors">
                            <IconComponent size={28} className="mr-3 " />
                            <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{pCategory.name}</h2>
                            <ChevronRight size={24} className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
                        
                        {liveStreamsInCategory.length === 0 && vodsInCategory.length === 0 ? (
                          <div className="text-center py-8 bg-card rounded-md border border-border">
                            <p className="text-foreground/70">{t('watch.no_content_available')} {pCategory.name} {t('watch.at_moment')}</p>
                          </div>
                        ) : (
                          <>
                            {liveStreamsInCategory.length > 0 && (
                              <div className="mb-10">
                                <h3 className="text-xl font-semibold text-foreground mb-4">{t('watch.live_streams')}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                  {liveStreamsInCategory.map(stream => <StreamCard key={`live-${stream.id}`} {...stream} />)}
                                </div>
                              </div>
                            )}
                            {vodsInCategory.length > 0 && (
                              <div>
                                <h3 className="text-xl font-semibold text-foreground mb-4">
                                  {t('watch.vods')} ({vodsInCategory.length} {t('watch.total')})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                  {displayedVods.map(vod => <StreamCard key={`vod-${vod.reactKey || vod.id}`} {...vod} />)}
                                </div>
                                {hasMoreVods && (
                                  <div className="flex justify-center mt-6">
                                    <Button 
                                      onClick={() => loadMoreVods(pCategory.value)}
                                      variant="outline"
                                      size="sm"
                                    >
                                      {t('watch.load_more')} ({vodsInCategory.length - displayedCount} {t('watch.remaining')})
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                   {pageCategories.length === 0 && ( // Should not happen with current static list
                     <div className="text-center py-12">
                       <p className="text-foreground/70">{t('watch.no_categories')}</p>
                     </div>
                   )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      
      {/* Removed "Popular Categories" section */}
      {/* Removed "Recommended Section" */}
    </Layout>
  );
};

export default StartWatching;
