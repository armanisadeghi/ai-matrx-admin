"use client";

import { CustomAppHeader } from "@/features/applet/runner/header";
import { AppletLayoutOption } from "@/types/customAppTypes";

import { availableApps } from "@/features/applet/a-old-depricated-do-not-use/depricated-do-not-use-sample-mock-data/constants";
import AppletLayoutManager from "@/features/applet/runner/layouts/AppletLayoutManager";


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
            <CustomAppHeader appId={appId} isDemo={true} />
            <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">
                <div className="pt-14">
                    <AppletLayoutManager appletId={appId} layoutTypeOverride={layoutType} />
                </div>
            </div>
        </>
    );
};

export default AppManager;
