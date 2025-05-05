// context/AppletDataContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import { allSystemWideMockApplets, availableApps, getSelectOptionsFromApps } from "@/features/applet/sample-mock-data/constants";
import { AvailableAppletConfigs, CustomAppConfig, AppletContainersConfig } from "@/features/applet/runner/components/field-components/types";
import { AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";
import { getAppIcon, getSubmitButton } from "@/features/applet/layouts/helpers/StyledComponents";

interface AppletDataContextType {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    searchFocus: string | null;
    setSearchFocus: (focus: string | null) => void;
    isMobile: boolean;
    availableApplets: AvailableAppletConfigs;
    customAppConfig: CustomAppConfig;
    appletDefinition: AppletContainersConfig[];
    appId: string;
    setAppId: (id: string) => void;
    layoutType: AppletLayoutOption;
    setLayoutType: (layoutType: AppletLayoutOption) => void;
    activeAppIcon: ReactNode;
    submitButton: ReactNode;
    accentColor: string;
    primaryColor: string;
    iconName: string;
    appName: string;
    appSelectOptions: { value: string; label: string }[];
}

const AppletDataContext = createContext<AppletDataContextType | undefined>(undefined);

export function AppletDataProvider({
    children,
    isMobile = false,
}: {
    children: ReactNode;
    isMobile?: boolean;
}) {
    const [appId, setAppId] = useState<string>("travel-agent");
    const [layoutType, setLayoutType] = useState<AppletLayoutOption>("horizontal");
    const [searchFocus, setSearchFocus] = useState<string | null>(null);
    const [availableApplets, setAvailableApplets] = useState<AvailableAppletConfigs>(allSystemWideMockApplets);

    const customAppConfig = availableApps[appId];


    const [activeTab, setActiveTab] = useState<string>(
        customAppConfig.appletList && customAppConfig.appletList.length > 0 ? customAppConfig.appletList[0].value : ""
    );

    const appletDefinition = availableApplets[activeTab]


    // Update activeTab when appId changes
    useEffect(() => {
        if (customAppConfig.appletList && customAppConfig.appletList.length > 0) {
            setActiveTab(customAppConfig.appletList[0].value);
        } else {
            setActiveTab("");
        }
    }, [appId]); // Only run when appId changes

    const appSelectOptions = useMemo(() => getSelectOptionsFromApps(availableApps), []);

    const accentColor = customAppConfig.accentColor;
    const primaryColor = customAppConfig.primaryColor;
    const iconName = customAppConfig.mainAppIcon;
    const submitIconName = customAppConfig.mainAppSubmitIcon;
    const appName = customAppConfig.name;

    const activeAppIcon = getAppIcon({
        color: accentColor,
        icon: iconName,
        size: 24,
    });

    const submitButton = getSubmitButton({
        color: accentColor,
        icon: submitIconName,
        size: 24,
    });

    return (
        <AppletDataContext.Provider
            value={{
                activeTab,
                setActiveTab,
                searchFocus,
                setSearchFocus,
                isMobile,
                availableApplets,
                appletDefinition,
                customAppConfig,
                appId,
                setAppId,
                layoutType,
                setLayoutType,
                activeAppIcon,
                submitButton,
                accentColor,
                primaryColor,
                iconName,
                appName,
                appSelectOptions,
            }}
        >
            {children}
        </AppletDataContext.Provider>
    );
}

export function useAppletData() {
    const context = useContext(AppletDataContext);
    if (context === undefined) {
        throw new Error("useAppletData must be used within a AppletDataProvider");
    }
    return context;
}