
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const MobileBottomNav = () => {
  const location = useLocation();

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      href: '/',
      active: location.pathname === '/'
    },
    {
      icon: Search,
      label: 'Browse',
      href: '/explore',
      active: location.pathname === '/explore'
    },
    {
      icon: Heart,
      label: 'Following',
      href: '/following',
      active: location.pathname === '/following'
    },
    {
      icon: Plus,
      label: 'Create',
      href: '/create-stream',
      active: location.pathname === '/create-stream'
    },
    {
      icon: User,
      label: 'Profile',
      href: '/creator/setup',
      active: location.pathname.includes('/creator')
    }
  ];

  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "bottom-nav-item",
                item.active && "active"
              )}
            >
              <Icon size={20} />
              <span className="text-xs font-medium mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
