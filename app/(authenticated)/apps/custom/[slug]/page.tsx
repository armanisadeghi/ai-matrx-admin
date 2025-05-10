// app/(authenticated)/apps/custom/[slug]/page.tsx
'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { HomeApplet } from '@/features/applet/home';
export default function CustomAppHomePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const isInitialized = useAppSelector(selectAppRuntimeIsInitialized);
  const appName = useAppSelector(selectAppRuntimeName);
  const appDescription = useAppSelector(selectAppRuntimeDescription);
  const appletList = useAppSelector(selectAppRuntimeAppletList) || [];
  const appIcon = useAppSelector(selectAppRuntimeMainAppIcon);
  const appImageUrl = useAppSelector(selectAppRuntimeImageUrl);
  const creator = useAppSelector(selectAppRuntimeCreator);
  const primaryColor = useAppSelector(selectAppRuntimeCoreBackgroundColor);
  const accentColor = useAppSelector(selectAppRuntimeAccentColor);
  
  // Get all applets to access their full details
  const appletsMap = useAppSelector(selectAppletRuntimeApplets);
  
  // Navigate to applet
  const navigateToApplet = (appletSlug: string) => {
    router.push(`/apps/custom/${slug}/${appletSlug}`);
  };
  
  // Render the MainLayout with all necessary props
  return (
    <HomeApplet 
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
      navigateToApplet={navigateToApplet}
      getAppIcon={getAppIcon}
      getAppIconWithBg={getAppIconWithBg}
      appDisplayVariant="QuarterThreeQuarters"
      appletCardVariant="default"
      mainLayoutVariant="default"
    />
  );
}