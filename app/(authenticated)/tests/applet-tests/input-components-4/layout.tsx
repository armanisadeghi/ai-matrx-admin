// app\(authenticated)\tests\applet-tests\input-components-4\layout.tsx
"use client";

import { everythingCombinedAppConfig } from "@/features/applet/a-old-depricated-do-not-use/depricated-do-not-use-sample-mock-data/constants";
import { ReactNode } from "react";




export default function BookingLayout({ children }: { children: ReactNode }) {
    const fullAppConfig = everythingCombinedAppConfig
    
    return (
        <div className="w-full h-full">
            {/* <CustomAppHeader config={fullAppConfig} />
            <AppletUserInputBar config={allSystemWideMockApplets} /> */}
            <div className="w-full h-full">{children}</div>
        </div>
    );
}
