"use client";
import React from "react";
import { AppDisplayVariant } from "./app-display";
import { AppletCardVariant } from "./applet-card";
import { MainLayoutVariant } from "./main-layout";
import AppletCardAdapter from "./AppletCardAdapter";
import AppDisplayAdapter from "./AppDisplayAdapter";
import MainLayoutAdapter from "./MainLayoutAdapter";
import { useAppSelector } from "@/lib/redux/hooks";
import {
    selectAppRuntimeAppletList,
    selectAppRuntimeMainAppIcon,
    selectAppRuntimeName,
    selectAppRuntimeDescription,
    selectAppRuntimeCreator,
    selectAppRuntimeCoreBackgroundColor,
    selectAppRuntimeAccentColor,
    selectAppRuntimeIsInitialized,
    selectAppRuntimeImageUrl,
} from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { selectAppletRuntimeApplets } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { getAppIcon, getAppIconWithBg } from "@/features/applet/styles/StyledComponents";

export interface HomeAppletProps {
    navigateToApplet: (appletSlug: string) => void;
    appDisplayVariant?: AppDisplayVariant;
    appletCardVariant?: AppletCardVariant;
    mainLayoutVariant?: MainLayoutVariant;
}

export const HomeApplet: React.FC<HomeAppletProps> = ({
    navigateToApplet,
    appDisplayVariant = "default",
    appletCardVariant = "default",
    mainLayoutVariant = "default",
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


    // Generate accent color class using the resolved accent color
    const accentColorClass = storeAccentColor
        ? `text-[${storeAccentColor}] border-[${storeAccentColor}]`
        : "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400";

    // Create display props with resolved values
    const appDisplayProps = {
        variant: appDisplayVariant,
        appName: storeAppName,
        appDescription: storeAppDescription,
        appIcon: storeAppIcon,
        appImageUrl: storeAppImageUrl,
        creator: storeCreator,
        accentColor: storeAccentColor,
        primaryColor: storePrimaryColor,
        accentColorClass,
        getAppIconWithBg,
    };

    // Create applet card render function
    const renderAppletCard = (applet: any) => (
        <AppletCardAdapter
            variant={appletCardVariant}
            applet={applet}
            primaryColor={storePrimaryColor}
            accentColor={storeAccentColor}
            accentColorClass={accentColorClass}
            onClick={() => navigateToApplet(applet.slug)}
            getAppIcon={getAppIcon}
        />
    );

    // Use the MainLayoutAdapter to bring everything together
    return (
        <MainLayoutAdapter
            variant={mainLayoutVariant}
            isInitialized={storeIsInitialized}
            appName={storeAppName}
            appDescription={storeAppDescription}
            appIcon={storeAppIcon}
            appImageUrl={storeAppImageUrl}
            creator={storeCreator}
            primaryColor={storePrimaryColor}
            accentColor={storeAccentColor}
            appletList={storeAppletList}
            appletsMap={storeAppletsMap}
            navigateToApplet={navigateToApplet}
            getAppIcon={getAppIcon}
            getAppIconWithBg={getAppIconWithBg}
            appDisplayComponent={
                <AppDisplayAdapter
                    variant={appDisplayVariant}
                    appName={storeAppName}
                    appDescription={storeAppDescription}
                    appIcon={storeAppIcon}
                    appImageUrl={storeAppImageUrl}
                    creator={storeCreator}
                    accentColor={storeAccentColor}
                    primaryColor={storePrimaryColor}
                    accentColorClass={accentColorClass}
                    getAppIconWithBg={getAppIconWithBg}
                />
            }
            renderAppletCard={renderAppletCard}
        />
    );
};

export default HomeApplet;
