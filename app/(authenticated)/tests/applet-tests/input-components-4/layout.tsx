// app\(authenticated)\tests\applet-tests\input-components-4\layout.tsx
"use client";

import { ReactNode } from "react";
import AppletUserInputBar from "@/features/applet/runner/components/search-bar/bar/AppletSearchBar";
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import { allSystemWideMockApplets, everythingCombinedAppConfig } from "@/features/applet/sample-mock-data/constants";




export default function BookingLayout({ children }: { children: ReactNode }) {
    const fullAppConfig = everythingCombinedAppConfig
    
    return (
        <div className="w-full h-full">
            <CustomAppHeader config={fullAppConfig} />
            <AppletUserInputBar config={allSystemWideMockApplets} />
            <div className="w-full h-full">{children}</div>
        </div>
    );
}
