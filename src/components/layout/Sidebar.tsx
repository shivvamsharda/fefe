import React from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Play, 
  Compass, 
  UserPlus, 
  DollarSign, 
  TrendingUp, 
  Code, 
  Gamepad, 
  Book, 
  EyeOff,
  HelpCircle,
  Send,
  Mail,
  Heart,
  Trophy,
  Users,
  FileText,
  Rocket,
  Copy,
  Megaphone,
  Star
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';

const Sidebar = () => {
  const { isAuthenticated } = useWallet();
  const { t } = useLanguage();
  
  const categories = [
    { name: t('category.memecoins'), value: 'memecoins', icon: DollarSign },
    { name: t('category.gaming'), value: 'gaming', icon: Gamepad },
    { name: t('category.development'), value: 'dev', icon: Code },
    { name: t('category.trading'), value: 'trading', icon: TrendingUp },
    { name: t('category.education'), value: 'education', icon: Book },
    { name: t('category.nsfw'), value: 'nsfw', icon: EyeOff }
  ];

  const copyToClipboard = async () => {
    const contractAddress = 'GndWt4p2L3zekGScuUSFmbqKjfri1jRq5KfXr6oEpump';
    try {
      await navigator.clipboard.writeText(contractAddress);
      toast.success('Contract address copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy contract address');
    }
  };

  return (
    <aside className="fixed left-0 top-[5.375rem] h-[calc(100vh-5.375rem)] w-60 bg-background border-r border-border overflow-y-auto z-40">
      <div className="p-4">
        {/* Main Navigation */}
        <div className="space-y-2 mb-6">
          {/* $WENLIVE CA Button */}
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors w-full text-left bg-primary/10 hover:bg-primary/20 border border-primary/20"
          >
            <Copy size={20} />
            <span className="font-medium">$WENLIVE CA</span>
          </button>
          
          {/* Promote Stream - Moved above Home */}
          <Link 
            to="/promote-stream" 
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors bg-gradient-to-r from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 border border-orange-500/20"
          >
            <Megaphone size={20} className="text-orange-600" />
            <span className="font-medium text-orange-600">Promote Stream</span>
          </Link>
          
          {/* Viewer Points - Right below Promote Stream when logged in */}
          {isAuthenticated && (
            <Link 
              to="/viewer-points" 
              className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 border border-primary/20"
            >
              <Star size={20} className="text-primary" />
              <span className="font-medium text-primary">Viewer Points</span>
            </Link>
          )}
          
          <Link 
            to="/" 
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">{t('nav.home')}</span>
          </Link>
          
          <Link 
            to="/watch" 
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <Play size={20} />
            <span className="font-medium">{t('nav.browse')}</span>
          </Link>
          {isAuthenticated && (
          <Link 
            to="/following" 
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <Heart size={20} />
            <span className="font-medium">{t('nav.following')}</span>
          </Link>
        )}
        <Link
            to="/explore-creators" 
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <Compass size={20} />
            <span className="font-medium">{t('nav.explore')}</span>
          </Link>
          <Link 
            to="/create" 
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <UserPlus size={20} />
            <span className="font-medium">{t('nav.become_creator')}</span>
          </Link>
          
          <Link 
            to="/spaces" 
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <Users size={20} />
            <span className="font-medium">Spaces</span>
          </Link>
          <Link 
            to="/how-it-works" 
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <HelpCircle size={20} />
            <span className="font-medium">{t('nav.how_it_works')}</span>
          </Link>
          <Link
            to="/leaderboard"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <Trophy size={20} />
            <span className="font-medium">{t('nav.leaderboard')}</span>
          </Link>
          <a
            href="https://wenlive-fun.gitbook.io/wenlive.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <FileText size={20} />
            <span className="font-medium">Docs</span>
          </a>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t('category.categories')}
          </h3>
          <div className="space-y-1">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Link
                  key={category.value}
                  to={`/watch?category=${encodeURIComponent(category.value)}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
                >
                  <IconComponent size={18} />
                  <span>{category.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Socials */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t('category.socials')}
          </h3>
          <div className="space-y-1">
            <a
              href="https://x.com/wenlivedotfun_"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
            >
              <img src="/lovable-uploads/d1ed5909-20f2-4767-bc5e-f81c41f9484f.png" alt="X logo" className="w-[18px] h-[18px] filter-to-white" />
              <span>{t('social.x_twitter')}</span>
            </a>
            <a
              href="https://t.me/wenlivefun"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
            >
              <Send size={18} />
              <span>{t('social.telegram')}</span>
            </a>
            <a
              href="mailto:connect@wenlive.fun"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
            >
              <Mail size={18} />
              <span>{t('social.email')}</span>
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
