// File: features\applet\layouts\core\AppletInputLayoutManager.tsx
'use client';


import React from "react";
import { AppletInputProps, AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";
import AppletUserInputBar from "@/features/applet/runner/components/search-bar/bar/AppletSearchBar";
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

interface AppletInputLayoutManagerProps extends AppletInputProps {
    layoutType: AppletLayoutOption;
    initialAppName?: string;
}

const AppletInputLayoutManager: React.FC<AppletInputLayoutManagerProps> = ({ 
    layoutType, 
    initialAppName,
    ...props 
}) => {
    switch (layoutType) {
        case "horizontal":
            return <HorizontalSearchLayout {...props} />;
        case "vertical":
            return <VerticalSearchLayout {...props} />;
        case "stepper":
            return <StepperSearchLayout {...props} />;
        case "flat":
            return <FlatSearchLayout {...props} />;
        case "open":
            return <OpenSearchLayout {...props} />;
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
            return <AppletUserInputBar initialAppName={initialAppName} />;
        default:
            return <HorizontalSearchLayout {...props} />;
    }
};

export default AppletInputLayoutManager;
