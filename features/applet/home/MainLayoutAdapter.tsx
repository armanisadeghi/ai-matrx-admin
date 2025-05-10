'use client';

import React from 'react';
import getMainLayoutComponent, { MainLayoutVariant } from './main-layout';
import { LoadingSpinner } from '@/components/ui/spinner';

interface MainLayoutAdapterProps {
  variant?: MainLayoutVariant;
  // Core props from existing components
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
  // Custom components
  appDisplayComponent?: React.ReactNode;
  renderAppletCard?: (applet: any) => React.ReactNode;
}

const MainLayoutAdapter: React.FC<MainLayoutAdapterProps> = ({
  variant = 'default',
  appDisplayComponent,
  renderAppletCard,
  isInitialized,
  appletList,
  appletsMap,
  ...props
}) => {
  // Get the base MainLayout component
  const MainLayoutComponent = getMainLayoutComponent(variant);
  
  if (!isInitialized) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  // Create our own custom layout that uses the appDisplay and appletCard components
  return (
    <div className="h-full w-full overflow-auto p-4 md:p-8">
      {/* App Header - Using provided app display component */}
      {appDisplayComponent}
      
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
              <div key={applet.id}>
                {renderAppletCard ? renderAppletCard(applet) : null}
              </div>
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

export default MainLayoutAdapter; 