// File: features\applet\runner\layouts\core\AppletInputLayoutManager.tsx
"use client";

import React, { useEffect } from "react";
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
} from "@/features/applet/runner/layouts/options";
import AppletUserInputBar from "../search-bar/bar/AppletSearchBar";
import { ReactNode, useState } from "react";
import { AppletLayoutOption, FieldDefinition } from "@/types";
import { useAppSelector } from "@/lib/redux/hooks";
import {
    selectAppletRuntimeAccentColor,
    selectAppletRuntimeActiveApplet,
    selectAppletRuntimeAppletIcon,
    selectAppletRuntimeLayoutType,
    selectAppletRuntimeActiveAppletId,
} from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { getSubmitButton } from "@/features/applet/styles/StyledComponents";
import { useIsMobile } from "@/hooks/use-mobile";

export interface ContainerRenderProps {
    id: string;
    label: string;
    description?: string;
    fields: FieldDefinition[];
    appletId: string;
    isActive: boolean;
    onClick: (id: string) => void;
    onOpenChange: (open: boolean) => void;
    isMobile: boolean;
    isLast?: boolean;
    actionButton?: ReactNode;
    className?: string;
    hideContainerPlaceholder?: boolean;
    children?: ReactNode;
    preventClose?: boolean;
    source: string;
}


export interface AppletLayoutOptionInfo {
    value: AppletLayoutOption;
    title: string;
    description: string;
    icon: React.ReactNode;
}

export interface AppletInputProps {
    appletId: string;
    source?: string;
    activeContainerId: string | null;
    setActiveContainerId: (id: string | null) => void;
    isMobile: boolean;
    actionButton?: ReactNode;
    className?: string;
}

interface AppletLayoutManagerProps {
    appletId: string;
    source?: string;
    layoutTypeOverride?: AppletLayoutOption;
    className?: string;
}

const AppletLayoutManager: React.FC<AppletLayoutManagerProps> = ({ appletId, layoutTypeOverride, className, source = "applet" }) => {
    const isMobile = useIsMobile();
    const [activeContainerId, setActiveContainerId] = useState<string | null>(null);

    const appletLayoutType = useAppSelector((state) => selectAppletRuntimeLayoutType(state, appletId || ""));
    const accentColor = useAppSelector((state) => selectAppletRuntimeAccentColor(state, appletId || "")) || "pink";
    const submitIconName = useAppSelector((state) => selectAppletRuntimeAppletIcon(state, appletId || "")) || "Search";
    const activeApplet = useAppSelector((state) => selectAppletRuntimeActiveApplet(state)) || null;

    const submitButton = getSubmitButton({
        color: accentColor,
        icon: submitIconName,
        size: 24,
    });

    useEffect(() => {
        setActiveContainerId(null);
    }, [activeApplet]);

    const layoutType = layoutTypeOverride || appletLayoutType;

    const actionButton = <div className="ml-2">{submitButton}</div>;

    switch (layoutType) {
        case "open":
            return (
                <OpenSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "vertical":
            return (
                <VerticalSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "stepper":
            return (
                <StepperSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "flat":
            return (
                <FlatSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "twoColumn":
            return (
                <TwoColumnSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "threeColumn":
            return (
                <ThreeColumnSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "fourColumn":
            return (
                <FourColumnSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "tabs":
            return (
                <TabsSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "accordion":
            return (
                <AccordionSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "minimalist":
            return (
                <MinimalistSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "floatingCard":
            return (
                <FloatingCardSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "sidebar":
            return (
                <SidebarSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "carousel":
            return (
                <CarouselSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "cardStack":
            return (
                <CardStackSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "contextual":
            return (
                <ContextualSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "chat":
            return (
                <ChatSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "mapBased":
            return (
                <MapBasedSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "fullWidthSidebar":
            return (
                <FullWidthSidebarSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );

        case "input-bar":
            return <AppletUserInputBar appletId={appletId} />;

        case "horizontal":
            return (
                <HorizontalSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );


        default:
            console.error(`[DEBUG] No layout found for layout type: ${layoutType}`);
            return (
                <HorizontalSearchLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                />
            );
    }
};

export default AppletLayoutManager;
