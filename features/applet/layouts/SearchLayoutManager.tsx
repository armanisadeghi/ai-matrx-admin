import React from "react";
import { SearchLayoutProps, SearchLayoutType } from "@/features/applet/layouts/types";
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
} from "@/features/applet/layouts";

interface SearchLayoutManagerProps extends SearchLayoutProps {
    layoutType: SearchLayoutType;
}

const SearchLayoutManager: React.FC<SearchLayoutManagerProps> = ({ layoutType, ...props }) => {
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
        default:
            return <HorizontalSearchLayout {...props} />;
    }
};

export default SearchLayoutManager;
