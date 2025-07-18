
import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import BrowserStreamingStudio from '@/components/stream/BrowserStreamingStudio';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BrowserStreaming = () => {
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
        <BrowserStreamingStudio />
      </div>
    </Layout>
  );
};

export default BrowserStreaming;
