// app\(authenticated)\apps\dynamic-layouts\page.tsx
"use client";

import { CustomAppHeader } from "@/features/applet/runner/header";
import AppletUserInputBar from "@/features/applet/runner/search-bar/bar/AppletSearchBar";


export default function DynamicLayoutsPage() {
    return (
        <>
            <CustomAppHeader appName={"everything-combined"} />
            <AppletUserInputBar initialAppName={"everything-combined"} />

            <div className="px-6">
                <div className="py-8">
                    {/* Content based on active tab */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{/* Cards would go here */}</div>
                </div>
            </div>
        </>
    );
}
