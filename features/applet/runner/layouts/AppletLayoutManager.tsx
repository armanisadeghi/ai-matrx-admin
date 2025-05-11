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
}

export interface AppletLayoutOptionInfo {
    value: AppletLayoutOption;
    title: string;
    description: string;
    icon: React.ReactNode;
}

export interface AppletInputProps {
    appletId: string;
    activeFieldId: string | null;
    setActiveFieldId: (id: string | null) => void;
    isMobile: boolean;
    actionButton?: ReactNode;
    className?: string;
}

interface AppletLayoutManagerProps {
    appletId: string;
    layoutTypeOverride?: AppletLayoutOption;
    className?: string;
}

const AppletLayoutManager: React.FC<AppletLayoutManagerProps> = ({ appletId, layoutTypeOverride, className }) => {
    const isMobile = useIsMobile();
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

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
        setActiveFieldId(null);
    }, [activeApplet]);

    const layoutType = layoutTypeOverride || appletLayoutType;

    const actionButton = <div className="ml-2">{submitButton}</div>;

    switch (layoutType) {
        case "open":
            return (
                <OpenSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "vertical":
            return (
                <VerticalSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "stepper":
            return (
                <StepperSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "flat":
            return (
                <FlatSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "twoColumn":
            return (
                <TwoColumnSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "accordion":
            return (
                <AccordionSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "fourColumn":
            return (
                <FourColumnSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "minimalist":
            return (
                <MinimalistSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "floatingCard":
            return (
                <FloatingCardSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "sidebar":
            return (
                <SidebarSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "carousel":
            return (
                <CarouselSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "cardStack":
            return (
                <CardStackSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "contextual":
            return (
                <ContextualSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "chat":
            return (
                <ChatSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "mapBased":
            return (
                <MapBasedSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "fullWidthSidebar":
            return (
                <FullWidthSidebarSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );

        case "input-bar":
            return <AppletUserInputBar appletId={appletId} />;

        default:
            return (
                <HorizontalSearchLayout
                    appletId={appletId}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                    actionButton={actionButton}
                    className={className}
                    isMobile={isMobile}
                />
            );
    }
};

export default AppletLayoutManager;
