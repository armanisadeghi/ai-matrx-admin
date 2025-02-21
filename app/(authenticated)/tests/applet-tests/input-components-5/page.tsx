"use client";

import SearchApplet from "./SearchApplet";
import { searchConfig } from "../input-components-4/constants";
import { AppletHeader, HeaderConfig } from "../input-components-4/components/header/AppletHeader";
import { TabConfig } from "../input-components-4/components/header/HeaderTabs";
import { ButtonConfig } from "../input-components-4/components/header/HeaderButtons";
import { UniformHeightProvider } from "./layouts";

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
                <SearchApplet config={searchConfig} />

                <SectionSeparator name="Two Column Layout" />
                <SearchApplet config={searchConfig} layoutType="twoColumn" />

                <SectionSeparator name="Three Column Layout" />
                <SearchApplet config={searchConfig} layoutType="threeColumn" />

                <SectionSeparator name="Four Column Layout" />
                <SearchApplet config={searchConfig} layoutType="fourColumn" />

                <SectionSeparator name="Tabs Layout" />
                <SearchApplet config={searchConfig} layoutType="tabs" />

                <SectionSeparator name="Accordion Layout" />
                <SearchApplet config={searchConfig} layoutType="accordion" />

                <SectionSeparator name="Vertical Layout" />
                <SearchApplet config={searchConfig} layoutType="vertical" />

                <SectionSeparator name="Horizontal Layout" />
                <SearchApplet config={searchConfig} layoutType="horizontal" />

                <SectionSeparator name="Stepper Layout" />
                <SearchApplet config={searchConfig} layoutType="stepper" />

                <SectionSeparator name="Flat Layout" />
                <SearchApplet config={searchConfig} layoutType="flat" />

                {/* First Set of New Layouts */}
                <SectionSeparator name="Carousel Layout" />
                <SearchApplet config={searchConfig} layoutType="carousel" />

                <SectionSeparator name="Floating Card Layout" />
                <SearchApplet config={searchConfig} layoutType="floatingCard" />

                <SectionSeparator name="Minimalist Layout" />
                <SearchApplet config={searchConfig} layoutType="minimalist" />

                <SectionSeparator name="Sidebar Layout" />
                <SearchApplet config={searchConfig} layoutType="sidebar" />

                <SectionSeparator name="Full Width Sidebar Layout" />
                <SearchApplet config={searchConfig} layoutType="fullWidthSidebar" />

                {/* Second Set of New Layouts */}
                <SectionSeparator name="Card Stack Layout" />
                <SearchApplet config={searchConfig} layoutType="cardStack" />

                <SectionSeparator name="Contextual Layout" />
                <SearchApplet config={searchConfig} layoutType="contextual" />

                <SectionSeparator name="Chat Layout" />
                <SearchApplet config={searchConfig} layoutType="chat" />

                <SectionSeparator name="Map Based Layout" />
                <SearchApplet config={searchConfig} layoutType="mapBased" />

                {/* Original Layouts */}
                <SectionSeparator name="Open Layout" />
                <SearchApplet config={searchConfig} layoutType="open" />
            </div>
        </UniformHeightProvider>
    );
}
