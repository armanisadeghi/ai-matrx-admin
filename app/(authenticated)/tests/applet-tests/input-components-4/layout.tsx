// app/booking/layout.tsx
"use client";

import TravelSearchBar from "./components/TravelSearchBar";
import { AppletHeader, HeaderConfig } from "./components/header/AppletHeader";
import { SearchTabProvider } from "@/context/SearchTabContext";
import { ReactNode } from "react";
import { TabConfig } from "./components/header/HeaderTabs";
import { ButtonConfig } from "./components/header/HeaderButtons";
import { searchConfig } from "./constants";

const tabConfig: TabConfig[] = [
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
        <SearchTabProvider>
            <div className="w-full h-full">
                <AppletHeader config={headerConfig} />
                <TravelSearchBar config={searchConfig} />
                <div className="w-full h-full">{children}</div>
            </div>
        </SearchTabProvider>
    );
}
