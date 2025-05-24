'use client';

import React, { useEffect, useState } from 'react';
import DesktopLayout from './DesktopLayout';
import MobileLayout from './MobileLayout';

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  primaryLinks: SidebarLink[];
  secondaryLinks?: SidebarLink[];
  initialOpen?: boolean;
  uniqueId?: string;
  isAdmin?: boolean;
  breakpoint?: number;
  forceMode?: 'desktop' | 'mobile' | 'auto';
}

export default function ResponsiveLayout({
  children,
  primaryLinks,
  secondaryLinks = [],
  initialOpen = false,
  uniqueId = "responsive-layout",
  isAdmin = false,
  breakpoint = 1024, // Default to lg breakpoint
  forceMode = 'auto'
}: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Function to check if we should use mobile layout
    const checkMobile = () => {
      if (forceMode !== 'auto') {
        setIsMobile(forceMode === 'mobile');
        return;
      }
      
      // Check viewport width
      const viewportWidth = window.innerWidth;
      setIsMobile(viewportWidth < breakpoint);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Also listen for orientation changes on mobile devices
    window.addEventListener('orientationchange', () => {
      setTimeout(checkMobile, 100); // Small delay to ensure dimensions are updated
    });

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, [breakpoint, forceMode]);

  // Common props for both layouts
  const layoutProps = {
    primaryLinks,
    secondaryLinks,
    uniqueId,
    isAdmin,
  };

  // During SSR or initial load, we can show a loading state or default to desktop
  if (!isClient) {
    // You could also read from headers here if you have viewport info from Next.js
    return (
      <DesktopLayout {...layoutProps} initialOpen={initialOpen}>
        {children}
      </DesktopLayout>
    );
  }

  // Render appropriate layout based on viewport
  return isMobile ? (
    <MobileLayout {...layoutProps}>
      {children}
    </MobileLayout>
  ) : (
    <DesktopLayout {...layoutProps} initialOpen={initialOpen}>
      {children}
    </DesktopLayout>
  );
}

// Hook to use in child components if they need to know the current mode
export function useLayoutMode() {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const checkMode = () => {
      setMode(window.innerWidth < 1024 ? 'mobile' : 'desktop');
    };

    checkMode();
    window.addEventListener('resize', checkMode);
    
    return () => window.removeEventListener('resize', checkMode);
  }, []);

  return { mode, isClient };
}