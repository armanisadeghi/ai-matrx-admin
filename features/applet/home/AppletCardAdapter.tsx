'use client';

import React from 'react';
import getAppletCardComponent, { AppletCardVariant } from './applet-card';

interface AppletCardAdapterProps {
  variant?: AppletCardVariant;
  applet: any;
  primaryColor: string;
  accentColor: string;
  accentColorClass: string;
  onClick: () => void;
  getAppIcon: (props: any) => React.ReactNode;
}

const AppletCardAdapter: React.FC<AppletCardAdapterProps> = ({
  variant = 'default',
  ...props
}) => {
  const AppletCardComponent = getAppletCardComponent(variant);
  return <AppletCardComponent {...props} />;
};

export default AppletCardAdapter; 