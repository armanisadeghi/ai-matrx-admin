// File: features\applet\runner\layouts\core\AppletInputLayoutManager.tsx
"use client";

import React, { useEffect } from "react";
import {
    AccordionAppletInputLayout,
    FlatAppletInputLayout,
    HorizontalSearchLayout,
    OpenAppletInputLayout,
    StepperSearchLayout,
    TabsSearchLayout,
    ThreeColumnSearchLayout,
    TwoColumnSearchLayout,
    VerticalAppletInputLayout,
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
    FlatAppletInputLayoutAccordion,
    StepperAppletFieldInputLayout,
} from "@/features/applet/runner/layouts/options";
import { ReactNode, useState } from "react";
import { AppletLayoutOption, FieldDefinition } from "@/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
    selectAppletRuntimeAccentColor,
    selectAppletRuntimeActiveApplet,
    selectAppletRuntimeAppletIcon,
    selectAppletRuntimeLayoutType,
    selectAppletRuntimeActiveAppletId,
} from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { getSubmitButton } from "@/features/applet/styles/StyledComponents";
import { useIsMobile } from "@/hooks/use-mobile";
import useAppletRecipe from "../../hooks/useAppletRecipe";

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
    hideFieldLabels?: boolean;
    children?: ReactNode;
    preventClose?: boolean;
    source: string;
    containerDescriptionLocation?: "container-header" | "container-body";
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
    containerDescriptionLocation?: "container-header" | "container-body";
    initialExpanded?: boolean;
}

interface AppletLayoutManagerProps {
    appletId: string;
    appSlug?: string;
    source?: string;
    layoutTypeOverride?: AppletLayoutOption;
    className?: string;
    handleSubmit?: () => void;
    initialExpanded?: boolean;
    isPreview?: boolean;
}

const AppletLayoutManager: React.FC<AppletLayoutManagerProps> = ({ appletId, appSlug, layoutTypeOverride, className, source = "applet", handleSubmit, initialExpanded = true, isPreview = false }) => {
    const isMobile = useIsMobile();
    const dispatch = useAppDispatch();
    const [activeContainerId, setActiveContainerId] = useState<string | null>(null);

    const appletLayoutType = useAppSelector((state) => selectAppletRuntimeLayoutType(state, appletId || ""));
    const accentColor = useAppSelector((state) => selectAppletRuntimeAccentColor(state, appletId || "")) || "pink";
    const submitIconName = useAppSelector((state) => selectAppletRuntimeAppletIcon(state, appletId || "")) || "Search";
    const activeApplet = useAppSelector((state) => selectAppletRuntimeActiveApplet(state)) || null;

    const containerDescriptionLocation = "container-header";  // "container-header" or "container-body"




    const submitButton = getSubmitButton({
        color: accentColor,
        icon: submitIconName,
        size: 24,
    });

    useEffect(() => {
        setActiveContainerId(null);
    }, [activeApplet]);

    const layoutType = layoutTypeOverride || appletLayoutType;

    const actionButton = (
        <div className="ml-2" onClick={handleSubmit}>
            {submitButton}
        </div>
    );

    switch (layoutType) {
        case "oneColumn":
        case "open":
            return (
                <OpenAppletInputLayout
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                    containerDescriptionLocation={containerDescriptionLocation}
                />
            );

        case "vertical":
            return (
                <VerticalAppletInputLayout
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
                <FlatAppletInputLayout
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
                <AccordionAppletInputLayout
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


        case "flat-accordion":
            return (
                <FlatAppletInputLayoutAccordion
                    appletId={appletId}
                    activeContainerId={activeContainerId}
                    setActiveContainerId={setActiveContainerId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                    source={source}
                    initialExpanded={initialExpanded}
                />
            );

        case "stepper-field":
            return (
                <StepperAppletFieldInputLayout
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
