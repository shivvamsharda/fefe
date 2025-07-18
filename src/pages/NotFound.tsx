
import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';

const NotFound = () => {
  const { t } = useLanguage();
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 min-h-[70vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          {/* solana-gradient will use Neon Green to Hot Pink */}
          <div className="h-24 w-24 mx-auto mb-6 rounded-full solana-gradient flex items-center justify-center">
            {/* text-white -> text-primary-foreground (black) if on gradient, or text-foreground if gradient is bg only */}
            {/* For simplicity and contrast on the gradient, let's make text black */}
            <span className="text-primary-foreground text-4xl font-bold">404</span>
          </div>
          {/* text-white -> text-foreground */}
          <h1 className="text-3xl font-bold text-foreground mb-4">{t('notfound.title')}</h1>
          {/* text-white/70 -> text-foreground/70 */}
          <p className="text-foreground/70 mb-6">
            {t('notfound.description')}
          </p>
          <Link to="/">
            {/* Button uses primary (Neon Green) */}
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {t('notfound.return_home')}
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
