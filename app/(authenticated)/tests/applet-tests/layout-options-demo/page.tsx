"use client";

import AppletLayoutWrapper from "@/features/applet/layouts/core/SearchApplet";
import { searchConfig } from "@/features/applet/sample-mock-data/constants";
import { AppletHeader, HeaderConfig } from "@/features/applet/runner/components/header/AppletHeader";
import { TabConfig } from "@/features/applet/runner/components/header/HeaderTabs";
import { ButtonConfig } from "@/features/applet/runner/components/header/HeaderButtons";
import { UniformHeightProvider } from "@/features/applet/layouts";

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
                <AppletHeader config={headerConfig} />

                <SectionSeparator name="Default Layout" />
                <AppletLayoutWrapper config={searchConfig} />

                <SectionSeparator name="Two Column Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="twoColumn" />

                <SectionSeparator name="Three Column Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="threeColumn" />

                <SectionSeparator name="Four Column Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="fourColumn" />

                <SectionSeparator name="Tabs Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="tabs" />

                <SectionSeparator name="Accordion Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="accordion" />

                <SectionSeparator name="Vertical Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="vertical" />

                <SectionSeparator name="Horizontal Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="horizontal" />

                <SectionSeparator name="Stepper Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="stepper" />

                <SectionSeparator name="Flat Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="flat" />

                {/* First Set of New Layouts */}
                <SectionSeparator name="Carousel Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="carousel" />

                <SectionSeparator name="Floating Card Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="floatingCard" />

                <SectionSeparator name="Minimalist Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="minimalist" />

                <SectionSeparator name="Sidebar Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="sidebar" />

                <SectionSeparator name="Full Width Sidebar Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="fullWidthSidebar" />

                {/* Second Set of New Layouts */}
                <SectionSeparator name="Card Stack Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="cardStack" />

                <SectionSeparator name="Contextual Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="contextual" />

                <SectionSeparator name="Chat Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="chat" />

                <SectionSeparator name="Map Based Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="mapBased" />

                {/* Original Layouts */}
                <SectionSeparator name="Open Layout" />
                <AppletLayoutWrapper config={searchConfig} layoutType="open" />
            </div>
        </UniformHeightProvider>
    );
}
