// MainLayout.tsx
import React from 'react';
import AppDisplay from '../app-display/Default';
import AppletCard from '../applet-card/Default';
import { LoadingSpinner } from '@/components/ui/spinner';
import Image from 'next/image';
import ModernAppletCard from '../applet-card/Modern';

interface MainLayoutProps {
  isInitialized: boolean;
  appName: string;
  appDescription: string;
  appIcon: any;
  appImageUrl: string;
  creator: string;
  primaryColor: string;
  accentColor: string;
  appletList: any[];
  appletsMap: Record<string, any>;
  navigateToApplet: (appletSlug: string) => void;
  getAppIcon: (props: any) => React.ReactNode;
  getAppIconWithBg: (props: any) => React.ReactNode;
}

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
  getAppIcon,
  getAppIconWithBg
}) => {
  if (!isInitialized) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Convert primary and accent colors to Tailwind classes
  const bgColorClass = primaryColor ? `bg-[${primaryColor}]` : 'bg-white dark:bg-gray-900';
  const accentColorClass = accentColor ? `text-[${accentColor}] border-[${accentColor}]` : 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400';
  const accentBgClass = accentColor ? `bg-[${accentColor}]` : 'bg-blue-600 dark:bg-blue-500';

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
        accentColorClass={accentColorClass}
        getAppIconWithBg={getAppIconWithBg}
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
                accentColorClass={accentColorClass}
                onClick={() => navigateToApplet(applet.slug)}
                getAppIcon={getAppIcon}
              />
            );
          })}
        </div>
        
        {appletList.length === 0 && (
          <div className="text-center p-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl text-gray-800 dark:text-gray-200 mb-2">No applets available</h3>
            <p className="text-gray-600 dark:text-gray-400">This app doesn't have any applets configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;