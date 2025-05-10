"use client";

import { CustomAppHeader } from "@/features/applet/runner/header";
import AppletInputLayoutWrapper from "@/features/applet/runner/layouts/core/AppletLayoutWrapper";



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
            <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">
                <CustomAppHeader isDemo={true} />

                <SectionSeparator name="Applet Specified Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" />
                {/* Original Layouts */}
                <SectionSeparator name="Open Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="open" />

                <SectionSeparator name="Horizontal Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="horizontal" />

                <SectionSeparator name="Stepper Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="stepper" />


                <SectionSeparator name="Vertical Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="vertical" />

                <SectionSeparator name="Two Column Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="twoColumn" />

                <SectionSeparator name="Three Column Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="threeColumn" />

                <SectionSeparator name="Four Column Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="fourColumn" />

                <SectionSeparator name="Tabs Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="tabs" />

                <SectionSeparator name="Accordion Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="accordion" />

                <SectionSeparator name="Flat Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="flat" />

                {/* First Set of New Layouts */}
                <SectionSeparator name="Carousel Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="carousel" />

                <SectionSeparator name="Floating Card Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="floatingCard" />

                <SectionSeparator name="Minimalist Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="minimalist" />

                <SectionSeparator name="Sidebar Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="sidebar" />

                <SectionSeparator name="Full Width Sidebar Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="fullWidthSidebar" />

                {/* Second Set of New Layouts */}
                <SectionSeparator name="Card Stack Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="cardStack" />

                <SectionSeparator name="Contextual Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="contextual" />

                <SectionSeparator name="Chat Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="chat" />

                <SectionSeparator name="Map Based Layout" />
                <AppletInputLayoutWrapper initialAppName="travel-agent" layoutTypeOverride="mapBased" />

            </div>
    );
}
