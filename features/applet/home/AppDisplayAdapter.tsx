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
  accentColorClass: string;
  getAppIconWithBg: (props: any) => React.ReactNode;
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
  accentColorClass,
  getAppIconWithBg,
}) => {
  const AppDisplayComponent = getAppDisplayComponent(variant);
  return <AppDisplayComponent 
    appName={appName}
    appDescription={appDescription}
    appIcon={appIcon}
    appImageUrl={appImageUrl}
    creator={creator}
    accentColor={accentColor}
    primaryColor={primaryColor}
    accentColorClass={accentColorClass}
    getAppIconWithBg={getAppIconWithBg}
  />;
};

export default AppDisplayAdapter; 