import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';
import SearchBar from '@/components/search/SearchBar';
import LanguageSelector from '@/components/ui/LanguageSelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActiveLiveKitStream } from '@/hooks/useActiveLiveKitStream';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Menu,
  X,
  Play,
  UserPlus,
  Shield,
  User,
  UserCircle,
  LogOut,
  Compass,
  Settings,
  Coins,
  DollarSign,
  TrendingUp,
  Code,
  Gamepad,
  Book,
  EyeOff,
  HelpCircle,
  Heart,
  Trophy,
  Send,
  Mail,
  Trash2,
  Monitor,
  Rocket
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const Navbar = () => {
  const { 
    connected, 
    disconnectWallet, 
    publicKey, 
    solBalance, 
    currentWallet,
    isAuthenticated,
    username,
    userUuid,
    hasCreatorProfile,
    openWalletModal,
    googleUser,
    isGoogleAuthenticated
  } = useWallet();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const navigate = useNavigate();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const formatPublicKey = (key: string | null) => {
    if (!key) return '';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setIsMobileMenuOpen(false);
  };

  const handleSubscriptionSettingsClick = () => {
    navigate('/creator/subscription-settings');
    setIsMobileMenuOpen(false); 
  };

  const handleDeleteAccountClick = () => {
    navigate('/delete-account');
    setIsMobileMenuOpen(false); 
  };

  const handleStartStreamingClick = async () => {
    if (!isAuthenticated) {
      openWalletModal();
      return;
    }

    setIsCheckingProfile(true);
    try {
      if (hasCreatorProfile) {
        navigate('/create/stream');
      } else {
        navigate('/creator/setup');
      }
    } catch (error) {
      console.error('Error checking creator profile:', error);
      toast.error('Failed to check creator profile');
      navigate('/creator/setup');
    } finally {
      setIsCheckingProfile(false);
    }
  };

  const isLoggedIn = connected || isGoogleAuthenticated;

  const categories = [
    { name: t('category.memecoins'), value: 'memecoins', icon: DollarSign },
    { name: t('category.gaming'), value: 'gaming', icon: Gamepad },
    { name: t('category.development'), value: 'dev', icon: Code },
    { name: t('category.trading'), value: 'trading', icon: TrendingUp },
    { name: t('category.education'), value: 'education', icon: Book },
    { name: t('category.nsfw'), value: 'nsfw', icon: EyeOff }
  ];

  const { activeStream, isLoading } = useActiveLiveKitStream();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="w-full py-2">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Left Section - Logo, Start Streaming Button, Language Selector - Flush Left */}
          <div className="flex items-center gap-3 flex-shrink-0 pl-3">
            
            {/* Mobile Menu Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="md:hidden text-foreground p-2">
                  <Menu size={24} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {/* Main Navigation */}
                    <div className="space-y-2 mb-6">
                      <Link 
                        to="/" 
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <LayoutDashboard size={20} />
                        <span className="font-medium">{t('nav.home')}</span>
                      </Link>
                      <Link 
                        to="/watch" 
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Play size={20} />
                        <span className="font-medium">{t('nav.browse')}</span>
                      </Link>
                      {isAuthenticated && (
                        <Link 
                          to="/following" 
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Heart size={20} />
                          <span className="font-medium">{t('nav.following')}</span>
                        </Link>
                      )}
                      <Link 
                        to="/explore-creators" 
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Compass size={20} />
                        <span className="font-medium">{t('nav.explore')}</span>
                      </Link>
                      <Link 
                        to="/create" 
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <UserPlus size={20} />
                        <span className="font-medium">{t('nav.become_creator')}</span>
                      </Link>
                      <Link 
                        to="/launch-token" 
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Rocket size={20} />
                        <span className="font-medium">Launch Token</span>
                      </Link>
                      <Link 
                        to="/how-it-works" 
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <HelpCircle size={20} />
                        <span className="font-medium">{t('nav.how_it_works')}</span>
                      </Link>
                      <Link
                        to="/leaderboard"
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-accent transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Trophy size={20} />
                        <span className="font-medium">{t('nav.leaderboard')}</span>
                      </Link>
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
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <IconComponent size={18} />
                              <span>{category.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    {/* Language Selector for Mobile */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Language
                      </h3>
                      <div className="px-3">
                        <LanguageSelector />
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
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <img src="/lovable-uploads/d1ed5909-20f2-4767-bc5e-f81c41f9484f.png" alt="X logo" className="w-[18px] h-[18px] filter-to-white" />
                          <span>{t('social.x_twitter')}</span>
                        </a>
                        <a
                          href="https://t.me/wenlivefun"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Send size={18} />
                          <span>{t('social.telegram')}</span>
                        </a>
                        <a
                          href="mailto:connect@wenlive.fun"
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Mail size={18} />
                          <span>{t('social.email')}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-2">
              <img 
                src="/lovable-uploads/97871d8d-9cc3-4989-86cf-7ddaa3d7f319.png" 
                alt="WenLive.fun Logo" 
                className="h-[4.375rem] w-auto" 
              />
            </Link>
            <Button 
              variant="outline" 
              className="flex items-center gap-1 md:gap-2 border-primary text-primary hover:bg-primary/10 px-2 md:px-4 py-1 md:py-2 h-8 md:h-10 text-xs md:text-sm"
              onClick={handleStartStreamingClick}
              disabled={isCheckingProfile}
            >
              {isCheckingProfile ? (
                <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-primary"></div>
              ) : (
                <Play size={14} className="md:size-4" />
              )}
              Start Streaming
            </Button>
            {/* Language Selector - Desktop - Moved here */}
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            
            {/* Your Stream Button - Only show when user has active LiveKit OBS stream */}
            {!isLoading && activeStream && (
              <Link to={`/create/stream/obs-v2?streamId=${activeStream.id}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50">
                  <Monitor size={16} />
                  Your Stream
                </Button>
              </Link>
            )}
          </div>
          
          {/* Search Bar - Desktop (Positioned to center with hero text, moved 10% right) */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2" style={{ marginLeft: '120px' }}>
            <div className="w-[400px]">
              <SearchBar />
            </div>
          </div>
          
          {/* Auth Section - Desktop */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0 pr-4">
            {isLoggedIn ? (
              <>
                {/* Settings Button - Only show for authenticated users */}
                {isAuthenticated && (
                  <Button
                    onClick={handleSettingsClick}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Settings size={16} />
                    {t('user.settings')}
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-3 py-1.5 h-auto">
                      {username ? (
                        <>
                          <User size={18} />
                          <span>{username}</span>
                        </>
                      ) : (
                        <UserCircle size={20} />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {username ? username : (isGoogleAuthenticated ? t('user.google_user') : t('user.connected_wallet'))}
                        </p>
                        {publicKey && (
                          <p className="text-xs leading-none text-muted-foreground break-all">
                            {publicKey}
                          </p>
                        )}
                        {googleUser?.email && (
                          <p className="text-xs leading-none text-muted-foreground break-all">
                            {googleUser.email}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {connected && (
                      <>
                        <div className="px-2 py-1.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('user.balance')}</span>
                            <span className="font-medium">{solBalance?.toFixed(2) ?? 'N/A'} SOL</span>
                          </div>
                        </div>
                        {currentWallet && (
                          <div className="px-2 py-1.5 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t('user.wallet')}</span>
                              <div className="flex items-center gap-1">
                                 <span className="font-medium">{currentWallet}</span>
                                 {isAuthenticated && <Shield size={14} className="text-green-400" />}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {isAuthenticated && hasCreatorProfile && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={handleSubscriptionSettingsClick} className="cursor-pointer">
                          <Settings size={16} className="mr-2" />
                          {t('user.subscription_settings')}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleDeleteAccountClick} className="cursor-pointer text-red-500 hover:!text-red-500 focus:!text-red-500 focus:!bg-red-500/10">
                      <Trash2 size={16} className="mr-2" />
                      Delete Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={disconnectWallet} className="cursor-pointer text-red-500 hover:!text-red-500 focus:!text-red-500 focus:!bg-red-500/10">
                      <LogOut size={16} className="mr-2" />
                      {isGoogleAuthenticated ? t('user.sign_out') : t('user.disconnect')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="relative">
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={openWalletModal}
                >
                  {t('nav.login')}
                </Button>
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-foreground/60 font-bold whitespace-nowrap">{t('nav.beta_stage')}</span>
              </div>
            )}
          </div>
          
          {/* Mobile Auth Section - Only show login/auth, no menu items */}
          <div className="flex md:hidden items-center gap-3 pr-4">
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-1.5 h-auto">
                    {username ? (
                      <>
                        <User size={18} />
                        <span>{username}</span>
                      </>
                    ) : (
                      <UserCircle size={20} />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {username ? username : (isGoogleAuthenticated ? t('user.google_user') : t('user.connected_wallet'))}
                      </p>
                      {publicKey && (
                        <p className="text-xs leading-none text-muted-foreground break-all">
                          {publicKey}
                        </p>
                      )}
                      {googleUser?.email && (
                        <p className="text-xs leading-none text-muted-foreground break-all">
                          {googleUser.email}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {connected && (
                    <>
                      <div className="px-2 py-1.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t('user.balance')}</span>
                          <span className="font-medium">{solBalance?.toFixed(2) ?? 'N/A'} SOL</span>
                        </div>
                      </div>
                      {currentWallet && (
                        <div className="px-2 py-1.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('user.wallet')}</span>
                            <div className="flex items-center gap-1">
                               <span className="font-medium">{currentWallet}</span>
                               {isAuthenticated && <Shield size={14} className="text-green-400" />}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {googleUser?.email && (
                    <div className="px-2 py-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('user.email')}</span>
                        <span className="font-medium">{googleUser.email}</span>
                      </div>
                    </div>
                  )}
                  {isAuthenticated && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleSettingsClick} className="cursor-pointer">
                        <Settings size={16} className="mr-2" />
                        {t('user.settings')}
                      </DropdownMenuItem>
                      {hasCreatorProfile && (
                        <DropdownMenuItem onSelect={handleSubscriptionSettingsClick} className="cursor-pointer">
                          <Settings size={16} className="mr-2" />
                          {t('user.subscription_settings')}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleDeleteAccountClick} className="cursor-pointer text-red-500 hover:!text-red-500 focus:!text-red-500 focus:!bg-red-500/10">
                    <Trash2 size={16} className="mr-2" />
                    Delete Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={disconnectWallet} className="cursor-pointer text-red-500 hover:!text-red-500 focus:!text-red-500 focus:!bg-red-500/10">
                    <LogOut size={16} className="mr-2" />
                    {isGoogleAuthenticated ? t('user.sign_out') : t('user.disconnect')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="relative">
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={openWalletModal}
                >
                  {t('nav.login')}
                </Button>
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-foreground/60 font-bold whitespace-nowrap">{t('nav.beta_stage')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Search Bar - Show below navbar */}
      <div className="md:hidden bg-secondary border-t border-border px-4 py-3">
        <SearchBar onClose={() => setIsMobileMenuOpen(false)} />
      </div>
    </nav>
  );
};

export default Navbar;
