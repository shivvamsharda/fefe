
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-background py-8 mt-auto"> 
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img 
                src="/lovable-uploads/783a35e9-de79-46e3-a576-b7993ddf054e.png" 
                alt="WenLive Logo" 
                className="h-10 w-auto" 
              />
            </div>
            <p className="text-foreground/70 text-sm">
              {t('footer.description')}
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-foreground mb-3">{t('footer.platform')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-foreground/70 hover:text-foreground transition-colors">
                  {t('footer.home')}
                </Link>
              </li>
              <li>
                <Link to="/watch" className="text-foreground/70 hover:text-foreground transition-colors">
                  {t('footer.browse_streams')}
                </Link>
              </li>
              <li>
                <Link to="/explore-creators" className="text-foreground/70 hover:text-foreground transition-colors">
                  {t('footer.creators')}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-foreground mb-3">{t('footer.legal')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/termsofservice" className="text-foreground/70 hover:text-foreground transition-colors">
                  {t('footer.terms_of_service')}
                </Link>
              </li>
              <li>
                <Link to="/privacypolicies" className="text-foreground/70 hover:text-foreground transition-colors">
                  {t('footer.privacy_policy')}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-foreground mb-3">{t('footer.connect')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://x.com/wenlivedotfun_" target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-foreground transition-colors">
                  {t('footer.twitter')}
                </a>
              </li>
              <li>
                <a href="https://t.me/wenlivefun" target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-foreground transition-colors">
                  {t('social.telegram')}
                </a>
              </li>
              <li>
                <a href="mailto:connect@wenlive.fun" className="text-foreground/70 hover:text-foreground transition-colors">
                  {t('social.email')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-foreground/50 text-sm">
            &copy; {new Date().getFullYear()} WenLive.fun. {t('footer.copyright')}
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-foreground/50 hover:text-foreground text-sm transition-colors">{t('footer.status')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
