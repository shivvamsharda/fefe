
import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import CreatorLeaderboard from '@/components/leaderboard/CreatorLeaderboard';
import ReferralsLeaderboard from '@/components/leaderboard/ReferralsLeaderboard';
import ReferralGenerator from '@/components/referral/ReferralGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/context/LanguageContext';

const LeaderboardPage = () => {
  const { t } = useLanguage();
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">{t('leaderboard.title')}</h1>
            <p className="text-white/70 text-lg">{t('leaderboard.subtitle')}</p>
          </div>
          
          <Tabs defaultValue="creators" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="creators">{t('leaderboard.creators')}</TabsTrigger>
              <TabsTrigger value="referrals">{t('leaderboard.referrals')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="creators" className="space-y-8">
              <CreatorLeaderboard />
            </TabsContent>
            
            <TabsContent value="referrals" className="space-y-8">
              <ReferralGenerator />
              <ReferralsLeaderboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default LeaderboardPage;
