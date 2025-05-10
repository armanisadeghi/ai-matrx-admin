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
  ...props
}) => {
  const AppDisplayComponent = getAppDisplayComponent(variant);
  return <AppDisplayComponent {...props} />;
};

export default AppDisplayAdapter; 