
import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import CollapsibleSidebar from './CollapsibleSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface LayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, hideFooter = false }) => {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:block">
          <CollapsibleSidebar />
        </div>
        
        <SidebarInset className="flex flex-col">
          <Navbar />
          <main className="flex-1 pt-[5.375rem] pb-20 md:pb-0">
            {children}
          </main>
          {!hideFooter && <Footer />}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
