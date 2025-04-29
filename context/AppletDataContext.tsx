// context/AppletDataContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { allSystemWideMockApplets, travelAgentAppConfig } from "@/features/applet/sample-mock-data/constants";
import { AvailableAppletConfigs, CustomAppConfig } from "@/features/applet/runner/components/field-components/types";
import { AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";

type TabType = "stays" | "experiences";

interface AppletDataContextType {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    searchFocus: string | null;
    setSearchFocus: (focus: string | null) => void;
    isMobile: boolean; // Include isMobile in the context type
    availableApplets: AvailableAppletConfigs;
    config: CustomAppConfig;
    appId: string;
    setAppId: (id: string) => void;
    layoutType: AppletLayoutOption;
    setLayoutType: (layoutType: AppletLayoutOption) => void;

}

const AppletDataContext = createContext<AppletDataContextType | undefined>(undefined);

export function AppletDataProvider({
    children,
    isMobile = false, // Default to false if not provided
}: {
    children: ReactNode;
    isMobile?: boolean;
}) {
    const [activeTab, setActiveTab] = useState<TabType>("stays");
    const [searchFocus, setSearchFocus] = useState<string | null>(null);
    const [availableApplets, setAvailableApplets] = useState<AvailableAppletConfigs>(allSystemWideMockApplets);
    const [config, setConfig] = useState<CustomAppConfig>(travelAgentAppConfig);
    const [appId, setAppId] = useState<string>("travel-agent");
    const [layoutType, setLayoutType] = useState<AppletLayoutOption>("horizontal");


    return (
        <AppletDataContext.Provider
            value={{
                activeTab,
                setActiveTab,
                searchFocus,
                setSearchFocus,
                isMobile,
                availableApplets,
                config,
                appId,
                setAppId,
                layoutType,
                setLayoutType,
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
