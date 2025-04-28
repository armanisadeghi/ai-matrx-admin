"use client";

import AppletLayoutWrapper from "@/features/applet/layouts/core/SearchApplet";
import { availableApplets } from "@/features/applet/sample-mock-data/constants";
import { CustomAppHeader, HeaderConfig } from "@/features/applet/runner/components/header/CustomAppHeader";
import { TabConfig } from "@/features/applet/runner/components/header/HeaderTabs";
import { AppletNamesMenuListConfig } from "@/features/applet/runner/components/header/HeaderButtons";
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

const buttonsConfig: AppletNamesMenuListConfig[] = [{ label: "Build Applets", onClick: () => {} }];

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
                <CustomAppHeader config={headerConfig} />

                <SectionSeparator name="Default Layout" />
                <AppletLayoutWrapper config={availableApplets} />

                <SectionSeparator name="Two Column Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="twoColumn" />

                <SectionSeparator name="Three Column Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="threeColumn" />

                <SectionSeparator name="Four Column Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="fourColumn" />

                <SectionSeparator name="Tabs Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="tabs" />

                <SectionSeparator name="Accordion Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="accordion" />

                <SectionSeparator name="Vertical Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="vertical" />

                <SectionSeparator name="Horizontal Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="horizontal" />

                <SectionSeparator name="Stepper Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="stepper" />

                <SectionSeparator name="Flat Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="flat" />

                {/* First Set of New Layouts */}
                <SectionSeparator name="Carousel Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="carousel" />

                <SectionSeparator name="Floating Card Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="floatingCard" />

                <SectionSeparator name="Minimalist Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="minimalist" />

                <SectionSeparator name="Sidebar Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="sidebar" />

                <SectionSeparator name="Full Width Sidebar Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="fullWidthSidebar" />

                {/* Second Set of New Layouts */}
                <SectionSeparator name="Card Stack Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="cardStack" />

                <SectionSeparator name="Contextual Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="contextual" />

                <SectionSeparator name="Chat Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="chat" />

                <SectionSeparator name="Map Based Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="mapBased" />

                {/* Original Layouts */}
                <SectionSeparator name="Open Layout" />
                <AppletLayoutWrapper config={availableApplets} layoutType="open" />
            </div>
        </UniformHeightProvider>
    );
}
