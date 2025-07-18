
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Users, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

const ReferralGenerator = () => {
  const { t } = useLanguage();
  const { walletAddress, username, isAuthenticated, connected, isGoogleAuthenticated } = useWallet();
  const [referralUrl, setReferralUrl] = useState<string>('');
  const [stats, setStats] = useState({ totalReferrals: 0, validReferrals: 0, referredUsers: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Only show referrals for wallet users (not Google users)
  const isWalletUser = connected && isAuthenticated && !isGoogleAuthenticated && walletAddress;

  useEffect(() => {
    if (walletAddress && isWalletUser) {
      const baseUrl = 'https://wenlive.fun';
      setReferralUrl(`${baseUrl}?ref=${walletAddress}`);
      loadReferralStats();
    } else {
      setReferralUrl('');
      setStats({ totalReferrals: 0, validReferrals: 0, referredUsers: [] });
    }
  }, [walletAddress, isWalletUser]);

  const loadReferralStats = async () => {
    if (!walletAddress || !isWalletUser) return;
    
    setIsLoading(true);
    try {
      // Get referral statistics
      const { data: statsData, error: statsError } = await supabase
        .from('referral_statistics')
        .select('referrals_total, referrals_valid')
        .eq('user_id', (await supabase.from('user_profiles').select('id').eq('wallet_address', walletAddress).single()).data?.id)
        .single();

      // Get referred users list
      const { data: referredUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('username, created_at')
        .eq('referred_by_wallet', walletAddress)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!statsError && statsData) {
        setStats({
          totalReferrals: statsData.referrals_total || 0,
          validReferrals: statsData.referrals_valid || 0,
          referredUsers: referredUsers || []
        });
      } else {
        setStats({
          totalReferrals: referredUsers?.length || 0,
          validReferrals: 0,
          referredUsers: referredUsers || []
        });
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('referral.url_copied'));
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Show message for Google users that referrals are wallet-only
  if (isGoogleAuthenticated && !connected) {
    return (
      <Card className="bg-secondary border-white/5">
        <CardContent className="text-center py-8">
          <p className="text-white/70 mb-4">{t('referral.wallet_only')}</p>
          <p className="text-white/50 text-sm">{t('referral.wallet_only_description')}</p>
        </CardContent>
      </Card>
    );
  }

  // Show authentication required message if user is not signed in
  if (!isAuthenticated || !walletAddress || !isWalletUser) {
    return (
      <Card className="bg-secondary border-white/5">
        <CardContent className="text-center py-8">
          <p className="text-white/70 mb-4">{t('referral.connect_required')}</p>
          <p className="text-white/50 text-sm">{t('referral.connect_description')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Link Generator */}
      <Card className="bg-secondary border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift className="w-5 h-5" />
            {t('referral.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">{t('referral.url_label')}</label>
            <div className="flex gap-2">
              <Input
                value={referralUrl || t('content.loading')}
                readOnly
                className="bg-black/20 border-white/10 text-white text-sm"
              />
              <Button
                onClick={() => copyToClipboard(referralUrl, t('referral.copy_url'))}
                variant="outline"
                size="icon"
                className="border-white/10 hover:bg-white/5"
                disabled={!referralUrl}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-4 mt-4">
            <h4 className="text-white font-medium mb-2">{t('referral.how_it_works')}</h4>
            <ul className="text-white/70 text-sm space-y-1">
              <li>• {t('referral.step1')}</li>
              <li>• {t('referral.step2')}</li>
              <li>• {t('referral.step3')}</li>
              <li>• {t('referral.step4')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Referral Stats */}
      <Card className="bg-secondary border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('referral.stats_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-white/70">{t('referral.loading_stats')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{stats.totalReferrals}</div>
                  <div className="text-white/70 text-sm">{t('referral.total_referrals')}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.validReferrals}</div>
                  <div className="text-white/70 text-sm">{t('referral.valid_referrals')}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{t('referral.active')}</div>
                  <div className="text-white/70 text-sm">{t('referral.status')}</div>
                </div>
              </div>

              {stats.totalReferrals > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-2">{t('referral.recent_referrals')}</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {stats.referredUsers.slice(0, 5).map((referral: any, index: number) => (
                      <div key={index} className="bg-black/20 rounded p-2 flex justify-between items-center">
                        <span className="text-white/80 text-sm">
                          {referral.username || t('referral.anonymous_user')}
                        </span>
                        <span className="text-white/60 text-xs">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralGenerator;
