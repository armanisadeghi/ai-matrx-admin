import { ReactNode } from "react";
import { TabSearchConfig } from "@/features/applet/runner/components/field-components/types";
import { GroupFieldConfig } from "@/features/applet/runner/components/field-components/types";

export interface SearchLayoutProps {
    config: TabSearchConfig;
    activeTab: string;
    activeFieldId: string | null;
    setActiveFieldId: (id: string | null) => void;
    actionButton?: ReactNode;
    className?: string;
}

// Shared props for all search group renderers
export interface SearchGroupRendererProps {
    id: string;
    label: string;
    placeholder: string;
    description?: string;
    fields: GroupFieldConfig[];
    isActive: boolean;
    onClick: (id: string) => void;
    onOpenChange: (open: boolean) => void;
    isLast?: boolean;
    actionButton?: ReactNode;
    className?: string;
    isMobile?: boolean;
}

// Base search field props
export interface SearchFieldProps {
    id: string;
    label: string;
    placeholder: string;
    isActive: boolean;
    onClick: (id: string) => void;
    onOpenChange: (open: boolean) => void;
    isLast?: boolean;
    actionButton?: ReactNode;
    children?: ReactNode;
    className?: string;
    preventClose?: boolean;
    isMobile?: boolean;
}

// Layout options type
export type SearchLayoutType =
    | "horizontal"
    | "vertical"
    | "stepper"
    | "flat"
    | "open"
    | "twoColumn"
    | "threeColumn"
    | "tabs"
    | "accordion"
    | "fourColumn"
    | "minimalist"
    | "floatingCard"
    | "sidebar"
    | "carousel"
    | "cardStack"
    | "contextual"
    | "chat"
    | "mapBased"
    | "fullWidthSidebar";
