import { ReactNode } from "react";

// Layout configuration types
export type LayoutConfig = {
    container: string;
    content?: string;
    primary?: string;
    secondary?: string;
    columns?: string;
    item?: string;
};

// Define layout configurations with their types
export type LayoutConfigs = {
    single: {
        standard: LayoutConfig;
        narrow: LayoutConfig;
        wide: LayoutConfig;
    };
    twoColumn: {
        even: LayoutConfig;
        primaryLeft: LayoutConfig;
        primaryRight: LayoutConfig;
    };
    threeColumn: {
        equal: LayoutConfig;
        primaryCenter: LayoutConfig;
    };
    grid: {
        cards: LayoutConfig;
        masonry: LayoutConfig;
    };
    list: {
        standard: LayoutConfig;
        compact: LayoutConfig;
    };
};


// Define the props for the ContentLayout component
export interface ContentLayoutProps {
    type?: 'single' | 'twoColumn' | 'threeColumn' | 'grid' | 'list';
    variant?: string;
    primaryContent?: ReactNode;  // Make primaryContent optional for grid layouts
    secondaryContent?: ReactNode;
    tertiaryContent?: ReactNode;
    items?: ReactNode[];  // This is specifically for grid and list layouts
    className?: string;
}
