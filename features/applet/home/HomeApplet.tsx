'use client';

import React from 'react';
import { AppDisplayVariant } from './app-display';
import { AppletCardVariant } from './applet-card';
import { MainLayoutVariant } from './main-layout';
import AppletCardAdapter from './AppletCardAdapter';
import AppDisplayAdapter from './AppDisplayAdapter';
import MainLayoutAdapter from './MainLayoutAdapter';

export interface HomeAppletProps {
  // Core props
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
  
  // Component variant control props
  appDisplayVariant?: AppDisplayVariant;
  appletCardVariant?: AppletCardVariant;
  mainLayoutVariant?: MainLayoutVariant;
}

export const HomeApplet: React.FC<HomeAppletProps> = ({
  // Set defaults for variants
  appDisplayVariant = 'default',
  appletCardVariant = 'default',
  mainLayoutVariant = 'default',
  ...props
}) => {
  // Calculate the accentColorClass for consistency
  const accentColorClass = props.accentColor 
    ? `text-[${props.accentColor}] border-[${props.accentColor}]` 
    : 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400';
  
  // Create display props
  const appDisplayProps = {
    variant: appDisplayVariant,
    appName: props.appName,
    appDescription: props.appDescription,
    appIcon: props.appIcon,
    appImageUrl: props.appImageUrl,
    creator: props.creator,
    accentColor: props.accentColor,
    primaryColor: props.primaryColor,
    accentColorClass: accentColorClass,
    getAppIconWithBg: props.getAppIconWithBg
  };
  
  // Create applet card render function
  const renderAppletCard = (applet: any) => (
    <AppletCardAdapter
      variant={appletCardVariant}
      applet={applet}
      primaryColor={props.primaryColor}
      accentColor={props.accentColor}
      accentColorClass={accentColorClass}
      onClick={() => props.navigateToApplet(applet.slug)}
      getAppIcon={props.getAppIcon}
    />
  );

  // Use the MainLayoutAdapter to bring everything together
  return (
    <MainLayoutAdapter
      variant={mainLayoutVariant}
      {...props}
      appDisplayComponent={<AppDisplayAdapter {...appDisplayProps} />}
      renderAppletCard={renderAppletCard}
    />
  );
};

export default HomeApplet; 