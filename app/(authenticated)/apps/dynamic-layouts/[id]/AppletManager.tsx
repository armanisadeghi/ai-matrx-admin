"use client";

import AppletInputLayoutWrapper from "@/features/applet/layouts/core/AppletLayoutWrapper";
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import { availableApps } from "@/features/applet/sample-mock-data/constants";
import { AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";

interface AppManagerProps {
    appId: string;
    layoutType: AppletLayoutOption;
}

export const AppManager = ({ appId, layoutType }: AppManagerProps) => {
    const appConfig = availableApps[appId];
    if (!appConfig) {
        return <div>App not found</div>;
    }
    return (
        <>
            <CustomAppHeader appName={appId} isDemo={true} />
            <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">
                <div className="pt-14">
                    <AppletInputLayoutWrapper layoutTypeOverride={layoutType} />
                </div>
            </div>
        </>
    );
};

export default AppManager;
