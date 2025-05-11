'use client';
import React from 'react';
import { AppDisplayVariant } from './app-display';
import { AppletCardVariant } from './applet-card';
import { MainLayoutVariant } from './main-layout';
import AppletCardAdapter from './AppletCardAdapter';
import AppDisplayAdapter from './AppDisplayAdapter';
import MainLayoutAdapter from './MainLayoutAdapter';
import { useAppSelector } from '@/lib/redux/hooks';
import { 
  selectAppRuntimeConfig,
  selectAppRuntimeAppletList,
  selectAppRuntimeMainAppIcon,
  selectAppRuntimeName,
  selectAppRuntimeDescription,
  selectAppRuntimeCreator,
  selectAppRuntimeCoreBackgroundColor,
  selectAppRuntimeAccentColor,
  selectAppRuntimeIsInitialized,
  selectAppRuntimeImageUrl
} from '@/lib/redux/app-runner/slices/customAppRuntimeSlice';
import { selectAppletRuntimeApplets } from '@/lib/redux/app-runner/slices/customAppletRuntimeSlice';
import { getAppIcon, getAppIconWithBg } from '@/features/applet/styles/StyledComponents';

export interface HomeAppletProps {
  // Core props
  isInitialized?: boolean;
  appName?: string;
  appDescription?: string;
  appIcon?: any;
  appImageUrl?: string;
  creator?: string;
  primaryColor?: string;
  accentColor?: string;
  appletList?: any[];
  appletsMap?: Record<string, any>;
  navigateToApplet: (appletSlug: string) => void;
  getAppIcon?: (props: any) => React.ReactNode;
  getAppIconWithBg?: (props: any) => React.ReactNode;
  
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
  // Get values from Redux store
  const storeIsInitialized = useAppSelector(selectAppRuntimeIsInitialized);
  const storeAppName = useAppSelector(selectAppRuntimeName);
  const storeAppDescription = useAppSelector(selectAppRuntimeDescription);
  const storeAppletList = useAppSelector(selectAppRuntimeAppletList) || [];
  const storeAppIcon = useAppSelector(selectAppRuntimeMainAppIcon);
  const storeAppImageUrl = useAppSelector(selectAppRuntimeImageUrl);
  const storeCreator = useAppSelector(selectAppRuntimeCreator);
  const storePrimaryColor = useAppSelector(selectAppRuntimeCoreBackgroundColor);
  const storeAccentColor = useAppSelector(selectAppRuntimeAccentColor);
  const storeAppletsMap = useAppSelector(selectAppletRuntimeApplets);
  
  // Use props if provided, otherwise fall back to Redux store values
  const isInitialized = props.isInitialized !== undefined ? props.isInitialized : storeIsInitialized;
  const appName = props.appName || storeAppName;
  const appDescription = props.appDescription || storeAppDescription;
  const appIcon = props.appIcon || storeAppIcon;
  const appImageUrl = props.appImageUrl || storeAppImageUrl;
  const creator = props.creator || storeCreator;
  const primaryColor = props.primaryColor || storePrimaryColor;
  const accentColor = props.accentColor || storeAccentColor;
  const appletList = props.appletList || storeAppletList;
  const appletsMap = props.appletsMap || storeAppletsMap;
  
  // Use props provided icon utility functions or fall back to imported ones
  const getAppIconFn = props.getAppIcon || getAppIcon;
  const getAppIconWithBgFn = props.getAppIconWithBg || getAppIconWithBg;
  
  // Generate accent color class using the resolved accent color
  const accentColorClass = accentColor 
    ? `text-[${accentColor}] border-[${accentColor}]` 
    : 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400';
  
  // Create display props with resolved values
  const appDisplayProps = {
    variant: appDisplayVariant,
    appName,
    appDescription,
    appIcon,
    appImageUrl,
    creator,
    accentColor,
    primaryColor,
    accentColorClass,
    getAppIconWithBg: getAppIconWithBgFn
  };
  
  // Create applet card render function
  const renderAppletCard = (applet: any) => (
    <AppletCardAdapter
      variant={appletCardVariant}
      applet={applet}
      primaryColor={primaryColor}
      accentColor={accentColor}
      accentColorClass={accentColorClass}
      onClick={() => props.navigateToApplet(applet.slug)}
      getAppIcon={getAppIconFn}
    />
  );

  // Use the MainLayoutAdapter to bring everything together
  return (
    <MainLayoutAdapter
      variant={mainLayoutVariant}
      isInitialized={isInitialized}
      appName={appName}
      appDescription={appDescription}
      appIcon={appIcon}
      appImageUrl={appImageUrl}
      creator={creator}
      primaryColor={primaryColor}
      accentColor={accentColor}
      appletList={appletList}
      appletsMap={appletsMap}
      navigateToApplet={props.navigateToApplet}
      getAppIcon={getAppIconFn}
      getAppIconWithBg={getAppIconWithBgFn}
      appDisplayComponent={<AppDisplayAdapter {...appDisplayProps} />}
      renderAppletCard={renderAppletCard}
    />
  );
};

export default HomeApplet;