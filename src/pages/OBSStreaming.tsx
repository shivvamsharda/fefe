
import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import OBSStreamingStudio from '@/components/stream/OBSStreamingStudio';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const OBSStreaming = () => {
  const { t } = useLanguage();
  const { hasWalletCapability, effectiveWalletAddress } = useWallet();
  const navigate = useNavigate();
  
  // Redirect if no wallet capability
  useEffect(() => {
    if (!hasWalletCapability || !effectiveWalletAddress) {
      toast.error(t('streaming.wallet_required'), {
        description: t('streaming.wallet_description')
      });
      navigate('/create/stream');
      return;
    }
  }, [hasWalletCapability, effectiveWalletAddress, navigate, t]);
  
  return (
    <Layout>
      <div className="container py-8 pt-24 md:pt-8">
        <h1 className="text-3xl font-bold mb-6">{t('streaming.obs_title')}</h1>
        <p className="text-white/70 mb-6">
          {t('streaming.obs_description')}
        </p>
        <OBSStreamingStudio />
      </div>
    </Layout>
  );
};

export default OBSStreaming;
