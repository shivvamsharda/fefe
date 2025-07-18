
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, Medal, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/context/LanguageContext';

interface ReferrerData {
  username: string;
  walletAddress: string;
  totalReferrals: number;
  validReferrals: number;
  lastUpdated: string;
  userId: string;
}

const ReferralsLeaderboard = () => {
  const { t } = useLanguage();
  const [topReferrers, setTopReferrers] = useState<ReferrerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTopReferrers();
  }, []);

  const loadTopReferrers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('referral_statistics')
        .select(`
          referrals_total,
          referrals_valid,
          last_updated,
          user_profiles!inner(
            id,
            username,
            wallet_address
          )
        `)
        .order('referrals_valid', { ascending: false })
        .order('referrals_total', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading referral leaderboard:', error);
        return;
      }

      const formattedData: ReferrerData[] = data?.map((item: any) => ({
        username: item.user_profiles.username || 'Unknown',
        walletAddress: item.user_profiles.wallet_address || '',
        totalReferrals: item.referrals_total || 0,
        validReferrals: item.referrals_valid || 0,
        lastUpdated: item.last_updated,
        userId: item.user_profiles.id
      })) || [];

      setTopReferrers(formattedData);
    } catch (error) {
      console.error('Error loading top referrers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <div className="w-5 h-5 flex items-center justify-center text-white/60 font-bold">{position}</div>;
    }
  };

  const getRankBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{t('leaderboard.champion')}</Badge>;
      case 2:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{t('leaderboard.runner_up')}</Badge>;
      case 3:
        return <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">{t('leaderboard.third_place')}</Badge>;
      default:
        return null;
    }
  };

  const formatWalletAddress = (address: string) => {
    if (!address || address.length < 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <Card className="bg-secondary border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('leaderboard.referral_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-white/70">{t('leaderboard.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  if (topReferrers.length === 0) {
    return (
      <Card className="bg-secondary border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('leaderboard.referral_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-white/70 mb-2">{t('leaderboard.no_referrals')}</p>
          <p className="text-white/50 text-sm">{t('leaderboard.no_referrals_description')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary border-white/5">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t('leaderboard.referral_title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white/80">{t('leaderboard.rank')}</TableHead>
                <TableHead className="text-white/80">{t('leaderboard.user')}</TableHead>
                <TableHead className="text-white/80 text-center">{t('leaderboard.total')}</TableHead>
                <TableHead className="text-white/80 text-center">{t('leaderboard.valid')}</TableHead>
                <TableHead className="text-white/80 text-center">{t('leaderboard.last_activity')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topReferrers.map((referrer, index) => {
                const position = index + 1;
                return (
                  <TableRow
                    key={referrer.userId}
                    className={`border-white/10 hover:bg-white/5 ${
                      position <= 3 ? 'bg-gradient-to-r from-yellow-500/5 to-orange-500/5' : ''
                    }`}
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(position)}
                        {getRankBadge(position)}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div>
                        <div className="font-semibold text-white">{referrer.username}</div>
                        <div className="text-white/60 text-sm font-mono">
                          {formatWalletAddress(referrer.walletAddress)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="text-white font-bold">{referrer.totalReferrals}</div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className={`font-bold ${
                        referrer.validReferrals > 0 ? 'text-green-400' : 'text-white/60'
                      }`}>
                        {referrer.validReferrals}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="text-white/60 text-sm">
                        {new Date(referrer.lastUpdated).toLocaleDateString()}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 p-4 bg-black/20 rounded-lg">
          <h4 className="text-white font-medium mb-2">{t('leaderboard.referral_system')}</h4>
          <div className="space-y-1 text-sm text-white/70">
            <p>🎯 <strong>{t('leaderboard.total')}:</strong> {t('leaderboard.total_referrals_desc')}</p>
            <p>✅ <strong>{t('leaderboard.valid')}:</strong> {t('leaderboard.valid_referrals_desc')}</p>
            <p>🏆 <strong>{t('leaderboard.rank')}:</strong> {t('leaderboard.ranking_desc')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralsLeaderboard;
