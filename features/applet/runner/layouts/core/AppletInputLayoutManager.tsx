// File: features\applet\runner\layouts\core\AppletInputLayoutManager.tsx
"use client";

import React from "react";
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
import AppletUserInputBar from "../../search-bar/bar/AppletSearchBar";
import { ReactNode } from "react";
import { AppletLayoutOption, FieldDefinition } from "@/types";

export interface ContainerRenderProps {
    id: string;
    label: string;
    description?: string;
    fields: FieldDefinition[];
    isActive: boolean;
    onClick: (id: string) => void;
    onOpenChange: (open: boolean) => void;
    isLast?: boolean;
    actionButton?: ReactNode;
    className?: string;
    isMobile?: boolean;
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
    activeFieldId: string | null;
    setActiveFieldId: (id: string | null) => void;
    actionButton?: ReactNode;
    className?: string;
}

interface AppletInputLayoutManagerProps extends AppletInputProps {
    layoutType: AppletLayoutOption;
    appId?: string;
}

const AppletInputLayoutManager: React.FC<AppletInputLayoutManagerProps> = ({ layoutType, appId, ...props }) => {
    switch (layoutType) {
        case "open":
            return <OpenSearchLayout {...props} />;
        case "vertical":
            return <VerticalSearchLayout {...props} />;
        case "stepper":
            return <StepperSearchLayout {...props} />;
        case "flat":
            return <FlatSearchLayout {...props} />;
        case "twoColumn":
            return <TwoColumnSearchLayout {...props} />;
        case "threeColumn":
            return <ThreeColumnSearchLayout {...props} />;
        case "tabs":
            return <TabsSearchLayout {...props} />;
        case "accordion":
            return <AccordionSearchLayout {...props} />;
        case "fourColumn":
            return <FourColumnSearchLayout {...props} />;
        case "minimalist":
            return <MinimalistSearchLayout {...props} />;
        case "floatingCard":
            return <FloatingCardSearchLayout {...props} />;
        case "sidebar":
            return <SidebarSearchLayout {...props} />;
        case "carousel":
            return <CarouselSearchLayout {...props} />;
        case "cardStack":
            return <CardStackSearchLayout {...props} />;
        case "contextual":
            return <ContextualSearchLayout {...props} />;
        case "chat":
            return <ChatSearchLayout {...props} />;
        case "mapBased":
            return <MapBasedSearchLayout {...props} />;
        case "fullWidthSidebar":
            return <FullWidthSidebarSearchLayout {...props} />;
        case "input-bar":
            return <AppletUserInputBar appId={appId} />;
        default:
            return <HorizontalSearchLayout {...props} />;
    }
};

export default AppletInputLayoutManager;
