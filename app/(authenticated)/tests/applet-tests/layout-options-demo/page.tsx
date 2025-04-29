"use client";

import AppletLayoutWrapper from "@/features/applet/layouts/core/AppletLayoutWrapper";
import { CustomAppHeader } from "@/features/applet/runner/components/header/CustomAppHeader";
import { UniformHeightProvider } from "@/features/applet/layouts/options";
import { AppletListItemConfig, CustomAppConfig } from "@/features/applet/runner/components/field-components/types";
import { HeaderExtraButtonsConfig } from "@/features/applet/runner/components/field-components/types";


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

export const extraButtonsConfig: HeaderExtraButtonsConfig[] = [
    {
        label: "Travel Agent Chat",
        actionType: "button",
        knownMethod: "renderChat",
        onClick: () => {
            console.log("Travel Agent Chat");
        },
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



// Separator component with name
const SectionSeparator = ({ name }: { name: string }) => (
    <div className="w-full my-8">
        <div className="flex items-center">
            <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
            <span className="px-4 font-medium text-gray-600 dark:text-gray-400">{name}</span>
            <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
        </div>
    </div>
);

export default function SearchAppletPage() {
    return (
        <UniformHeightProvider>
            <div className="w-full h-full">
                <CustomAppHeader config={travelAgentAppConfig} />

                <SectionSeparator name="Default Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} />

                <SectionSeparator name="Two Column Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="twoColumn" />

                <SectionSeparator name="Three Column Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="threeColumn" />

                <SectionSeparator name="Four Column Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="fourColumn" />

                <SectionSeparator name="Tabs Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="tabs" />

                <SectionSeparator name="Accordion Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="accordion" />

                <SectionSeparator name="Vertical Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="vertical" />

                <SectionSeparator name="Horizontal Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="horizontal" />

                <SectionSeparator name="Stepper Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="stepper" />

                <SectionSeparator name="Flat Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="flat" />

                {/* First Set of New Layouts */}
                <SectionSeparator name="Carousel Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="carousel" />

                <SectionSeparator name="Floating Card Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="floatingCard" />

                <SectionSeparator name="Minimalist Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="minimalist" />

                <SectionSeparator name="Sidebar Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="sidebar" />

                <SectionSeparator name="Full Width Sidebar Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="fullWidthSidebar" />

                {/* Second Set of New Layouts */}
                <SectionSeparator name="Card Stack Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="cardStack" />

                <SectionSeparator name="Contextual Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="contextual" />

                <SectionSeparator name="Chat Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="chat" />

                <SectionSeparator name="Map Based Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="mapBased" />

                {/* Original Layouts */}
                <SectionSeparator name="Open Layout" />
                <AppletLayoutWrapper config={travelAgentAppConfig} layoutTypeOverride="open" />
            </div>
        </UniformHeightProvider>
    );
}
