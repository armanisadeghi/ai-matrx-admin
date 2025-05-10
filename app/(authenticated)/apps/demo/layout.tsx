// app/booking/layout.tsx
"use client";

import { ReactNode, useEffect } from "react";
import { useAppletData } from "@/context/AppletDataContext";
import { CustomAppHeader } from "@/features/applet/runner/header";
import AppletUserInputBar from "@/features/applet/runner/search-bar/bar/AppletSearchBar";

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
