import React from 'react';
import { 
  Columns, 
  LayoutGrid, 
  ArrowRight, 
  Rows, 
  Maximize, 
  MenuSquare, 
  Columns3, 
  Columns2, 
  Columns4, 
  FolderTree, 
  Minimize, 
  Square, 
  Sidebar, 
  Layers, 
  Settings, 
  MessageSquare, 
  Map, 
  SidebarOpen,
  Terminal,
  List,
  Search,
  Grid
} from 'lucide-react';
import { PiTabsBold } from "react-icons/pi";
import { TbCarouselHorizontal } from "react-icons/tb";
import { AppletLayoutOption, AppletLayoutOptionInfo } from './layout.types';
import { AppLayoutOptions } from '../../builder/builder.types';


export const appletLayoutOptions: Record<AppletLayoutOption, AppletLayoutOptionInfo> = {
  "horizontal": {
    value: "horizontal",
    title: "Horizontal Layout",
    description: "Components are arranged side by side in a horizontal flow",
    icon: <Columns size={24} />
  },
  "vertical": {
    value: "vertical",
    title: "Vertical Layout",
    description: "Components are stacked on top of each other vertically",
    icon: <Rows size={24} />
  },
  "stepper": {
    value: "stepper",
    title: "Stepper Layout",
    description: "Multi-step process with a sequential flow through different stages",
    icon: <ArrowRight size={24} />
  },
  "flat": {
    value: "flat",
    title: "Flat Layout",
    description: "All elements displayed on a single level with no hierarchical structure",
    icon: <MenuSquare size={24} />
  },
  "open": {
    value: "open",
    title: "Open Layout",
    description: "Spacious layout with maximized content area and minimal borders",
    icon: <Maximize size={24} />
  },
  "oneColumn": {
    value: "oneColumn",
    title: "One Column Layout",
    description: "Single column of components for a focused, linear experience",
    icon: <LayoutGrid size={24} />
  },
  "twoColumn": {
    value: "twoColumn",
    title: "Two Column Layout",
    description: "Content organized in two columns for efficient space usage",
    icon: <Columns2 size={24} />
  },
  "threeColumn": {
    value: "threeColumn",
    title: "Three Column Layout",
    description: "Content distributed across three equal columns",
    icon: <Columns3 size={24} />
  },
  "fourColumn": {
    value: "fourColumn",
    title: "Four Column Layout",
    description: "Dense grid with four columns for maximum content display",
    icon: <Columns4 size={24} />
  },
  "tabs": {
    value: "tabs",
    title: "Tabbed Layout",
    description: "Content organized into tabs for easy navigation between sections",
    icon: <PiTabsBold size={24} />
  },
  "accordion": {
    value: "accordion",
    title: "Accordion Layout",
    description: "Collapsible sections that expand to reveal content when clicked",
    icon: <FolderTree size={24} />
  },
  "minimalist": {
    value: "minimalist",
    title: "Minimalist Layout",
    description: "Clean, simplified design with only essential elements visible",
    icon: <Minimize size={24} />
  },
  "floatingCard": {
    value: "floatingCard",
    title: "Floating Card Layout",
    description: "Elements displayed as floating cards with shadow effects",
    icon: <Square size={24} />
  },
  "sidebar": {
    value: "sidebar",
    title: "Sidebar Layout",
    description: "Main content area with a navigation sidebar on one side",
    icon: <Sidebar size={24} />
  },
  "carousel": {
    value: "carousel",
    title: "Carousel Layout",
    description: "Rotating display of content items that can be browsed sequentially",
    icon: <TbCarouselHorizontal size={24} />
  },
  "cardStack": {
    value: "cardStack",
    title: "Card Stack Layout",
    description: "Cards stacked on top of each other with ability to browse through them",
    icon: <Layers size={24} />
  },
  "contextual": {
    value: "contextual",
    title: "Contextual Layout",
    description: "Layout adapts based on the context or type of content being displayed",
    icon: <Settings size={24} />
  },
  "chat": {
    value: "chat",
    title: "Chat Layout",
    description: "Conversation-style layout with messages displayed in a timeline",
    icon: <MessageSquare size={24} />
  },
  "mapBased": {
    value: "mapBased",
    title: "Map-Based Layout",
    description: "Content organized spatially on a map or canvas with positional meaning",
    icon: <Map size={24} />
  },
  "fullWidthSidebar": {
    value: "fullWidthSidebar",
    title: "Full-Width Sidebar Layout",
    description: "Expanded sidebar that takes up more screen real estate for rich navigation",
    icon: <SidebarOpen size={24} />
  },
  "input-bar": {
    value: "input-bar",
    title: "Input Bar Layout",
    description: "Focused layout with prominent input control for command or search interfaces",
    icon: <Terminal size={24} />
  }
};

// Helper to convert the object to an array for easier mapping in components
export const appletLayoutOptionsArray: AppletLayoutOptionInfo[] = Object.values(appletLayoutOptions);

// App Layout Option Info interface with the same structure as AppletLayoutOptionInfo
export interface AppLayoutOptionInfo {
  value: AppLayoutOptions;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// App Layout Options similar to Applet Layout Options
export const appLayoutOptions: Record<AppLayoutOptions, AppLayoutOptionInfo> = {
  "tabbedApplets": {
    value: "tabbedApplets",
    title: "Tabbed Applets",
    description: "Shows applets in a tabbed interface for easy navigation",
    icon: <PiTabsBold size={24} />
  },
  "singleDropdown": {
    value: "singleDropdown",
    title: "Single Dropdown",
    description: "A dropdown menu for selecting a single applet",
    icon: <List size={24} />
  },
  "multiDropdown": {
    value: "multiDropdown",
    title: "Multi Dropdown",
    description: "A dropdown menu allowing multiple applet selections",
    icon: <Layers size={24} />
  },
  "singleDropdownWithSearch": {
    value: "singleDropdownWithSearch",
    title: "Searchable Dropdown",
    description: "A searchable dropdown menu for finding applets",
    icon: <Search size={24} />
  },
  "icons": {
    value: "icons",
    title: "Icon Layout",
    description: "Displays applets as clickable icons for visual navigation",
    icon: <Grid size={24} />
  }
};

// Helper to convert the object to an array for easier mapping in components
export const appLayoutOptionsArray: AppLayoutOptionInfo[] = Object.values(appLayoutOptions);