'use client';

import React from 'react';
import getAppletCardComponent, { AppletCardVariant } from './applet-card';

interface AppletCardAdapterProps {
  variant?: AppletCardVariant;
  applet: any;
  primaryColor: string;
  accentColor: string;
  onClick: () => void;
  isMobile: boolean;
}

const AppletCardAdapter: React.FC<AppletCardAdapterProps> = ({
  variant = 'default',
  isMobile,
  ...props
}) => {
  const AppletCardComponent = getAppletCardComponent(variant, isMobile);
  return <AppletCardComponent {...props} isMobile={isMobile} />;
};

export default AppletCardAdapter; 