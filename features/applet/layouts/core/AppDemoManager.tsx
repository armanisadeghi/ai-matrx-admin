"use client";

import AppletLayoutWrapper from "@/features/applet/layouts/core/LayoutWrapper";
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import { availableApps } from "@/features/applet/sample-mock-data/constants";


interface AppDemoManagerProps {
    appId: string;
    layoutType: string;
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
                config={appConfig} 
                headerClassName={demoHeaderClassName} 
            />
            
            {/* Main content area */}
            <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors overflow-auto">
                <div>
                    <AppletLayoutWrapper layoutType={layoutType} />
                </div>
            </div>
        </div>
    );
};

export default AppDemoManager;