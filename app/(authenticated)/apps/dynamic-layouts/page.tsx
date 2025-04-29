// app/booking/page.tsx
"use client";
import AppletUserInputBar from "@/features/applet/runner/components/search-bar/bar/AppletSearchBar";
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import { allSystemWideMockApplets, availableApps } from "@/features/applet/sample-mock-data/constants";



export default function DynamicLayoutsPage() {
    const fullAppConfig = availableApps["everything-combined"];
    return (
        <>
            <CustomAppHeader config={fullAppConfig} />
            <AppletUserInputBar config={allSystemWideMockApplets} />

            <div className="px-6">
                <div className="py-8">
                    {/* Content based on active tab */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{/* Cards would go here */}</div>
                </div>
            </div>
        </>
    );
}
