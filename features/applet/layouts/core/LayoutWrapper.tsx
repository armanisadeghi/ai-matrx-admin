// File: components/search/SearchApplet.tsx
'use client';

import React, { useState, useEffect, ReactNode } from "react";
import { Search } from "lucide-react";

import { useAppletData } from "@/context/AppletDataContext";
import { useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { ALL_BROKER_IDS } from "@/features/applet/sample-mock-data/constants";
import { GroupFieldConfig, KnownMethod } from "@/features/applet/runner/components/field-components/types";
import {
    AccordionSearchLayout,
    FlatSearchLayout,
    HorizontalSearchLayout,
    OpenSearchLayout,
    StepperSearchLayout,
    TabsSearchLayout,
    ThreeColumnSearchLayout,
    TwoColumnSearchLayout,
    VerticalSearchLayout,
    FourColumnSearchLayout,
    MinimalistSearchLayout,
    FloatingCardSearchLayout,
    SidebarSearchLayout,
    CarouselSearchLayout,
    CardStackSearchLayout,
    ContextualSearchLayout,
    ChatSearchLayout,
    MapBasedSearchLayout,
    FullWidthSidebarSearchLayout,
} from "@/features/applet/layouts/options";
import AppletUserInputBar from "@/features/applet/runner/components/search-bar/bar/AppletSearchBar";
import { AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";

interface AppletListItemConfig {
    value: string;
    label: string;
    icon?: ReactNode;
}

interface HeaderExtraButtonsConfig {
    label: string;
    icon?: ReactNode;
    actionType?: "button" | "link" | "redux" | "none";
    onClick?: () => void;
    route?: string;
    reduxAction?: string;
    knownMethod?: KnownMethod;
}


interface AppletContainersConfig {
    id: string;
    label: string;
    placeholder: string;
    description?: string;
    fields: GroupFieldConfig[];
}


interface CustomAppConfig {
    name: string;
    description: string;
    slug: string;
    icon: string;
    creator: string;
    primaryColor: string;
    accentColor: string;
    appletList: AppletListItemConfig[];
    extraButtons: HeaderExtraButtonsConfig[];
    layoutType: AppletLayoutOption;
}

interface AppletLayoutWrapperProps {
    layoutType: string;
    className?: string;
}

const AppletLayoutWrapper: React.FC<AppletLayoutWrapperProps> = ({ className = "", layoutType }) => {
    const { activeTab, availableApplets } = useAppletData();
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

    // Fetch data brokers (if needed)
    const dataBrokers = useGetorFetchRecords("dataBroker", ALL_BROKER_IDS);

    useEffect(() => {
        setActiveFieldId(null);
    }, [activeTab]);

    const searchButton = (
        <div className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full p-3">
            <Search size={24} />
        </div>
    );

    switch (layoutType) {
        case "input-bar":
            return (
                <AppletUserInputBar config={availableApplets} />
            );

        case "horizontal":
            return (
                <HorizontalSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "vertical":
            return (
                <VerticalSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "stepper":
            return (
                <StepperSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "flat":
            return (
                <FlatSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "open":
            return (
                <OpenSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "twoColumn":
            return (
                <TwoColumnSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "threeColumn":
            return (
                <ThreeColumnSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "tabs":
            return (
                <TabsSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "accordion":
            return (
                <AccordionSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "fourColumn":
            return (
                <FourColumnSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "minimalist":
            return (
                <MinimalistSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "floatingCard":
            return (
                <FloatingCardSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "sidebar":
            return (
                <SidebarSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "carousel":
            return (
                <CarouselSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "cardStack":
            return (
                <CardStackSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "contextual":
            return (
                <ContextualSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "chat":
            return (
                <ChatSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "mapBased":
            return (
                <MapBasedSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        case "fullWidthSidebar":
            return (
                <FullWidthSidebarSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
        default:
            return (
                <HorizontalSearchLayout
                    config={availableApplets}
                    activeTab={activeTab}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={searchButton}
                    className={className}
                />
            );
    }
};

export default AppletLayoutWrapper;
