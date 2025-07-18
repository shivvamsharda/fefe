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
  Copy,
  Megaphone,
  Star
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const CollapsibleSidebar = () => {
  const { isAuthenticated } = useWallet();
  const { t } = useLanguage();
  const { state, setOpen } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (isCollapsed) {
      setIsTransitioning(true);
      setOpen(true);
      // Reset transition state after animation completes
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isCollapsed) {
        setIsTransitioning(true);
        setOpen(false);
        // Reset transition state after animation completes
        setTimeout(() => setIsTransitioning(false), 300);
      }
    }, 150);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
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
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border pt-[5.375rem]" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarContent className={isTransitioning ? "overflow-hidden" : "overflow-auto"}>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* $WENLIVE CA Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={copyToClipboard}
                  tooltip={isCollapsed ? '$WENLIVE CA' : undefined}
                  className="bg-primary/10 hover:bg-primary/20 border border-primary/20"
                >
                  <Copy size={20} />
                  {!isCollapsed && <span className="font-medium">$WENLIVE CA</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Promote Stream */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={isCollapsed ? 'Promote Stream' : undefined}
                  className="bg-gradient-to-r from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 border border-orange-500/20"
                >
                  <Link to="/promote-stream">
                    <Megaphone size={20} className="text-orange-600" />
                    {!isCollapsed && <span className="font-medium text-orange-600">Promote Stream</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Viewer Points - Only when authenticated */}
              {isAuthenticated && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={isCollapsed ? 'Viewer Points' : undefined}
                    className="bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 border border-primary/20"
                  >
                    <Link to="/viewer-points">
                      <Star size={20} className="text-primary" />
                      {!isCollapsed && <span className="font-medium text-primary">Viewer Points</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Home */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? t('nav.home') : undefined}>
                  <Link to="/">
                    <LayoutDashboard size={20} />
                    {!isCollapsed && <span className="font-medium">{t('nav.home')}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Browse */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? t('nav.browse') : undefined}>
                  <Link to="/watch">
                    <Play size={20} />
                    {!isCollapsed && <span className="font-medium">{t('nav.browse')}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Following - Only when authenticated */}
              {isAuthenticated && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={isCollapsed ? t('nav.following') : undefined}>
                    <Link to="/following">
                      <Heart size={20} />
                      {!isCollapsed && <span className="font-medium">{t('nav.following')}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Explore */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? t('nav.explore') : undefined}>
                  <Link to="/explore-creators">
                    <Compass size={20} />
                    {!isCollapsed && <span className="font-medium">{t('nav.explore')}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Become Creator */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? t('nav.become_creator') : undefined}>
                  <Link to="/create">
                    <UserPlus size={20} />
                    {!isCollapsed && <span className="font-medium">{t('nav.become_creator')}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Spaces */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? 'Spaces' : undefined}>
                  <Link to="/spaces">
                    <Users size={20} />
                    {!isCollapsed && <span className="font-medium">Spaces</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* How It Works */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? t('nav.how_it_works') : undefined}>
                  <Link to="/how-it-works">
                    <HelpCircle size={20} />
                    {!isCollapsed && <span className="font-medium">{t('nav.how_it_works')}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Leaderboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? t('nav.leaderboard') : undefined}>
                  <Link to="/leaderboard">
                    <Trophy size={20} />
                    {!isCollapsed && <span className="font-medium">{t('nav.leaderboard')}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Docs */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? 'Docs' : undefined}>
                  <a
                    href="https://wenlive-fun.gitbook.io/wenlive.fun"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText size={20} />
                    {!isCollapsed && <span className="font-medium">Docs</span>}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Categories */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {t('category.categories')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <SidebarMenuItem key={category.value}>
                      <SidebarMenuButton asChild>
                        <Link to={`/watch?category=${encodeURIComponent(category.value)}`}>
                          <IconComponent size={18} />
                          <span>{category.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Categories (Collapsed - Icons Only) */}
        {isCollapsed && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <SidebarMenuItem key={category.value}>
                      <SidebarMenuButton asChild tooltip={category.name}>
                        <Link to={`/watch?category=${encodeURIComponent(category.value)}`}>
                          <IconComponent size={18} />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Socials */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {t('category.socials')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a
                      href="https://x.com/wenlivedotfun_"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src="/lovable-uploads/d1ed5909-20f2-4767-bc5e-f81c41f9484f.png" alt="X logo" className="w-[18px] h-[18px] filter-to-white" />
                      <span>{t('social.x_twitter')}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a
                      href="https://t.me/wenlivefun"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Send size={18} />
                      <span>{t('social.telegram')}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="mailto:connect@wenlive.fun">
                      <Mail size={18} />
                      <span>{t('social.email')}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Socials (Collapsed - Icons Only) */}
        {isCollapsed && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t('social.x_twitter')}>
                    <a
                      href="https://x.com/wenlivedotfun_"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src="/lovable-uploads/d1ed5909-20f2-4767-bc5e-f81c41f9484f.png" alt="X logo" className="w-[18px] h-[18px] filter-to-white" />
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t('social.telegram')}>
                    <a
                      href="https://t.me/wenlivefun"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Send size={18} />
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t('social.email')}>
                    <a href="mailto:connect@wenlive.fun">
                      <Mail size={18} />
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default CollapsibleSidebar;