// app/booking/layout.tsx
"use client";

import { ReactNode, useEffect } from "react";
import AppletUserInputBar from "@/features/applet/runner/components/search-bar/bar/AppletSearchBar";
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import { useAppletData } from "@/context/AppletDataContext";

export default function BookingLayout({ children }: { children: ReactNode }) {
    const demoAppName = "starter-app";
    const { setAppId } = useAppletData();
    
    useEffect(() => {
        setAppId(demoAppName);
    }, [demoAppName, setAppId]);
    
    return (
        <div className="w-full h-full bg-white dark:bg-gray-900 transition-colors">
            <CustomAppHeader appName={demoAppName} isDemo={true} />
            <AppletUserInputBar initialAppName={demoAppName} />
            <div className="w-full h-full">{children}</div>
        </div>
    );
}
