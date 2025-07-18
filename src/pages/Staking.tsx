
import React from 'react';
import Layout from '../components/layout/Layout';
import { Coins, Clock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const Staking = () => {
  const { t } = useLanguage();
  
  return (
    <Layout>
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <Coins size={80} className="mx-auto mb-6 text-primary" />
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {t('staking.title')}
            </h1>
            <p className="text-lg text-foreground/70 mb-6">
              {t('staking.description')}
            </p>
          </div>

          <div className="bg-card/50 rounded-lg border border-border p-8 mb-8">
            <Clock size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t('staking.what_to_expect')}
            </h2>
            <div className="space-y-3 text-foreground/80">
              <p>🚀 {t('staking.competitive_rewards')}</p>
              <p>🔒 {t('staking.secure_pools')}</p>
              <p>📊 {t('staking.real_time_analytics')}</p>
              <p>💰 {t('staking.flexible_periods')}</p>
            </div>
          </div>

          <div className="text-sm text-foreground/60">
            <p>{t('staking.stay_tuned')}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Staking;
