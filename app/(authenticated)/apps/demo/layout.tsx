// app/booking/layout.tsx
"use client";

import { ReactNode } from "react";
import AppletUserInputBar from "@/features/applet/runner/components/search-bar/bar/AppletSearchBar";
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import { allSystemWideMockApplets, travelAgentAppConfig } from "@/features/applet/sample-mock-data/constants";




export default function BookingLayout({ children }: { children: ReactNode }) {
    const fullAppConfig = travelAgentAppConfig
    
    return (
        <div className="w-full h-full bg-white dark:bg-gray-900 transition-colors">
            <CustomAppHeader config={fullAppConfig} />
            <AppletUserInputBar config={allSystemWideMockApplets} />
            <div className="w-full h-full">{children}</div>
        </div>
    );
}
