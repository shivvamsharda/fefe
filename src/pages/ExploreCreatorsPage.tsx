
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllCreatorProfilesWithUserUuid, CreatorProfile } from '@/services/creatorProfileService'; 
import Layout from '@/components/layout/Layout';
import CreatorCard from '@/components/explore/CreatorCard';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';

const ExploreCreatorsPage = () => {
  const { t } = useLanguage();
  
  const { data: profiles, isLoading, error, refetch } = useQuery<CreatorProfile[]>({
    queryKey: ['allCreatorProfilesWithUserUuid'],
    queryFn: getAllCreatorProfilesWithUserUuid,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to improve performance
    retry: 2,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-var(--navbar-height))]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading creators...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    console.error('Error loading creator profiles:', error);
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center min-h-[calc(100vh-var(--navbar-height))]">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">{t('explore.error_loading')}</h1>
          <p className="text-foreground/70 mb-4">
            {t('explore.error_description')}
          </p>
          <Button onClick={() => refetch()}>{t('content.try_again')}</Button>
        </div>
      </Layout>
    );
  }

  const validProfiles = profiles?.filter(profile => profile.user_id_uuid) || [];

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <header className="mb-6 md:mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center justify-center gap-2">
            <Users size={36} className="text-primary" />
            {t('explore.title')}
          </h1>
          <p className="text-foreground/70 mt-2 text-base md:text-lg">
            {t('explore.subtitle')}
          </p>
        </header>

        {validProfiles.length === 0 ? (
          <div className="text-center py-10">
            <Users size={48} className="mx-auto text-foreground/30 mb-4" />
            <p className="text-xl text-foreground/70">{t('explore.no_creators')}</p>
            <p className="text-foreground/50">{t('explore.no_creators_description')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {validProfiles.map(profile => (
              <CreatorCard key={profile.user_id_uuid} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ExploreCreatorsPage;
