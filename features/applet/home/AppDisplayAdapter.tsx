'use client';

import React from 'react';
import getAppDisplayComponent, { AppDisplayVariant } from './app-display';

interface AppDisplayAdapterProps {
  variant?: AppDisplayVariant;
  appName: string;
  appDescription: string;
  appIcon: any;
  appImageUrl: string;
  creator: string;
  accentColor: string;
  primaryColor: string;
  isMobile: boolean;
}

const AppDisplayAdapter: React.FC<AppDisplayAdapterProps> = ({
  variant = 'default',
  appName,
  appDescription,
  appIcon,
  appImageUrl,
  creator,
  accentColor,
  primaryColor,
  isMobile,
}) => {
  const AppDisplayComponent = getAppDisplayComponent(variant, isMobile);
  return <AppDisplayComponent 
    appName={appName}
    appDescription={appDescription}
    appIcon={appIcon}
    appImageUrl={appImageUrl}
    creator={creator}
    accentColor={accentColor}
    primaryColor={primaryColor}
    isMobile={isMobile}
  />;
};

export default AppDisplayAdapter; 