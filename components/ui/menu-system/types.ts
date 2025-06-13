export interface MenuItemDefinition {
    id: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
    visible?: boolean;
}

export interface MenuDefinition {
    id: string;
    name: string;
    customItems: (props: any) => MenuItemDefinition[];
    // Global item visibility controls
    hideProfile?: boolean;
    hideTheme?: boolean;
    hideLogout?: boolean;
    // Custom global items this menu wants to hide
    hideGlobalItems?: string[];
}

export interface MenuRenderProps {
    renderMenuItem: (item: MenuItemDefinition) => React.ReactNode;
    renderSeparator?: () => React.ReactNode;
}

export interface GlobalMenuItem {
    id: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    destructive?: boolean;
    visible?: boolean;
    order: number; // For sorting
} 