// components/GlobalContextMenu/types.ts
export interface ContextMenuItemProps {
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick?: () => void;
    disabled?: boolean;
    shortcut?: string;
    danger?: boolean;
    items?: ContextMenuItemProps[]; // For nested menus
}

export interface ContextMenuOptions {
    items: ContextMenuItemProps[];
}
