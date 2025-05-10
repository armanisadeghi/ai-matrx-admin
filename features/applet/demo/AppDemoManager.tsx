"use client";

import AppletInputLayoutWrapper from "@/features/applet/layouts/core/AppletLayoutWrapper";
import { CustomAppHeader } from "@/features/applet/a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/header/CustomAppHeader";
import { availableApps } from "@/features/applet/depricated-do-not-use-sample-mock-data/constants";
import { AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";

interface AppDemoManagerProps {
    appId: string;
    layoutType: AppletLayoutOption;
    demoWidth?: string;  // Optional width for the demo container
    demoHeight?: string; // Optional height for the demo container
}

export const AppDemoManager = ({ 
    appId = "starter-app", 
    layoutType = "open",
    demoWidth = "800px",
    demoHeight = "600px" 
}: AppDemoManagerProps) => {
    const appConfig = availableApps[appId];
    
    if (!appConfig) {
        return <div className="text-red-500 p-4 border border-red-300 rounded">App not found</div>;
    }

    const demoHeaderClassName = "relative w-full z-40 h-14 bg-white dark:bg-gray-900 transition-colors shadow-sm";
    
    return (
        <div 
            className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg" 
            style={{ 
                width: demoWidth, 
                height: demoHeight,
                margin: "0 auto" // Center the demo container
            }}
        >
            {/* Use the CustomAppHeader with our demo-specific className */}
            <CustomAppHeader 
                appName={appId}
                isDemo={true}
                headerClassName={demoHeaderClassName} 
            />
            
            {/* Main content area */}
            <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors overflow-auto">
                <div>
                    <AppletInputLayoutWrapper layoutTypeOverride={layoutType} />
                </div>
            </div>
        </div>
    );
};

export default AppDemoManager;