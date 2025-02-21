// app/booking/layout.tsx
"use client";

import AppletSearchBar from "./components/search-bar/bar/AppletSearchBar";
import { AppletHeader, HeaderConfig } from "./components/header/AppletHeader";
import { ReactNode } from "react";
import { TabConfig } from "./components/header/HeaderTabs";
import { ButtonConfig } from "./components/header/HeaderButtons";
import { searchConfig } from "./constants";

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
