"use client";

import AppletLayoutWrapper from "@/features/applet/layouts/core/LayoutWrapper";
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import { AppletListItemConfig, CustomAppConfig } from "@/features/applet/runner/components/field-components/types";
import { HeaderExtraButtonsConfig } from "@/features/applet/runner/components/field-components/types";
import { availableApps } from "@/features/applet/sample-mock-data/constants";

export const travelAgentListConfig: AppletListItemConfig[] = [
    { value: "stays", label: "Stays" },
    { value: "applet-creator", label: "Applet Creator" },
    { value: "vegas-nightlife", label: "Vegas Nightlife" },
    { value: "restaurants", label: "Restaurants" },
    { value: "activities", label: "Activities" },
    { value: "shopping", label: "Shopping" },
    { value: "transportation", label: "Transportation" },
    { value: "events", label: "Events" },
];

export const extraButtonsConfig: HeaderExtraButtonsConfig[] = [
    {
        label: "Travel Agent Chat",
        actionType: "button",
        knownMethod: "renderChat",
        onClick: () => {
            console.log("Travel Agent Chat");
        },
    },
];

export const travelAgentAppConfig: CustomAppConfig = {
    name: "Travel Agent",
    description: "Travel Agent",
    slug: "travel-agent",
    icon: "TreePalm",
    creator: "Travel Agent",
    primaryColor: "gray",
    accentColor: "fuchsia",
    appletList: travelAgentListConfig,
    extraButtons: extraButtonsConfig,
    layoutType: "twoColumn",
};

interface AppManagerProps {
    appId: string;
    layoutType: string;
}

export const AppManager = ({ appId, layoutType }: AppManagerProps) => {
    const appConfig = availableApps[appId];
    if (!appConfig) {
        return <div>App not found</div>;
    }
    return (
        <>
            <CustomAppHeader config={appConfig} />
            <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">
                <div className="pt-14">
                    <AppletLayoutWrapper layoutType={layoutType} />
                </div>
            </div>
        </>
    );
};

export default AppManager;
