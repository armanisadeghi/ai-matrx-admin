// app/booking/layout.tsx
"use client";

import { ReactNode } from "react";
import AppletSearchBar from "@/features/applet/runner/components/search-bar/bar/AppletSearchBar";
import { AppletHeader, HeaderConfig } from "@/features/applet/runner/components/header/AppletHeader";
import { TabConfig } from "@/features/applet/runner/components/header/HeaderTabs";
import { ButtonConfig } from "@/features/applet/runner/components/header/HeaderButtons";
import { searchConfig } from "@/features/applet/sample-mock-data/constants";

export const tabConfig: TabConfig[] = [
    { value: "stays", label: "Stays" },
    { value: "vegas-nightlife", label: "Vegas Nightlife" },
    { value: "restaurants", label: "Restaurants" },
    { value: "activities", label: "Activities" },
    { value: "shopping", label: "Shopping" },
    { value: "transportation", label: "Transportation" },
    { value: "events", label: "Events" },
];

const buttonsConfig: ButtonConfig[] = [{ label: "Build Applets", onClick: () => {} }];

const headerConfig: HeaderConfig = {
    tabs: tabConfig,
    buttons: buttonsConfig,
};

export default function BookingLayout({ children }: { children: ReactNode }) {
    return (
        <div className="w-full h-full">
            <AppletHeader config={headerConfig} />
            <AppletSearchBar config={searchConfig} />
            <div className="w-full h-full">{children}</div>
        </div>
    );
}
