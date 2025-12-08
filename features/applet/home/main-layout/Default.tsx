// MainLayout.tsx
'use client';
import React from 'react';
import { getAppIconWithBg, getAppIcon, COLOR_VARIANTS } from '@/features/applet/styles/StyledComponents';
import { MainLayoutProps } from '@/features/applet/home/types';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/spinner';
import AppDisplay from '@/features/applet/home/app-display/Default';
import ModernAppletCard from '@/features/applet/home/applet-card/Modern';

const MainLayout: React.FC<MainLayoutProps> = ({
  isInitialized,
  appName,
  appDescription,
  appIcon,
  appImageUrl,
  creator,
  primaryColor,
  accentColor,
  appletList,
  appletsMap,
  navigateToApplet,
  isMobile
}) => {
  if (!isInitialized) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }


  return (
    <div className="h-full w-full overflow-auto p-4 md:p-8">
      {/* App Header - Delegated to AppDisplay component */}
      <AppDisplay 
        appName={appName}
        appDescription={appDescription}
        appIcon={appIcon}
        appImageUrl={appImageUrl}
        creator={creator}
        accentColor={accentColor}
        primaryColor={primaryColor}
        isMobile={isMobile}
      />
      
      {/* App Cards */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
          Available Applets
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appletList.map((item) => {
            const applet = appletsMap[item.appletId];
            if (!applet) return null;
            
            return (
              <ModernAppletCard 
                key={applet.id}
                applet={applet}
                primaryColor={primaryColor}
                accentColor={accentColor}
                onClick={() => navigateToApplet(applet.slug)}
                isMobile={isMobile}
              />
            );
          })}
        </div>
        
        {appletList.length === 0 && (
          <div className="text-center p-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-border">
            <h3 className="text-xl text-gray-800 dark:text-gray-200 mb-2">No applets available</h3>
            <p className="text-gray-600 dark:text-gray-400">This app doesn't have any applets configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;