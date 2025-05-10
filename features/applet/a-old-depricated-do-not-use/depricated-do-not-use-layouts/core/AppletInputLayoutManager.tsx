// File: features\applet\layouts\core\AppletInputLayoutManager.tsx
'use client';


import React from "react";
import { AppletInputProps, AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";
import AppletUserInputBar from "@/features/applet/runner/search-bar/bar/AppletSearchBar";
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
    appId?: string;
}

const AppletInputLayoutManager: React.FC<AppletInputLayoutManagerProps> = ({ 
    layoutType, 
    appId,
    ...props 
}) => {

    console.log("layoutType", layoutType);

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
