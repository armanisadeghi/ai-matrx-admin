// app/booking/page.tsx
"use client";
import { useAppletData } from "@/context/AppletDataContext";
import AppletUserInputBar from "@/features/applet/runner/components/search-bar/bar/AppletSearchBar";
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import { allSystemWideMockApplets } from "@/features/applet/sample-mock-data/constants";
import {
  CustomAppConfig,
  HeaderExtraButtonsConfig,
  AppletListItemConfig,
} from "@/features/applet/runner/components/field-components/types";

export const travelAgentListConfig: AppletListItemConfig[] = [
  { value: "stays", label: "Stays" },
  { value: "applet-creator", label: "Applet Creator" },
  { value: "vegas-nightlife", label: "Vegas Nightlife" },
  { value: "restaurants", label: "Restaurants" },
  { value: "activities", label: "Activities" },
  { value: "shopping", label: "Shopping" },
  { value: "transportation", label: "Transportation" },
  { value: "events", label: "Events" },
];

// Layout options for the selector
export const layoutOptions = [
  { value: "sidebar", label: "Sidebar" },
  { value: "twoColumn", label: "Two Column" },
  { value: "threeColumn", label: "Three Column" },
  { value: "tabs", label: "Tabs" }
];

export const extraButtonsConfig: HeaderExtraButtonsConfig[] = [
  {
      label: "Travel Agent Chat",
      actionType: "button",
      knownMethod: "renderChat",
  },
];

export const travelAgentAppConfig: CustomAppConfig = {
  name: "Travel Agent",
  description: "Travel Agent",
  slug: "travel-agent",
  icon: "TreePalm",
  creator: "Travel Agent",
  primaryColor: "gray",
  accentColor: "fuchsia",
  appletList: travelAgentListConfig,
  extraButtons: extraButtonsConfig,
  layoutType: "twoColumn",
};



export default function BookingPage() {
    const fullAppConfig = travelAgentAppConfig;
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
