// types/menu.ts
import { LucideIcon } from 'lucide-react';

export type ModuleType = 'fileSystem' | 'userProfile' | 'settings' | 'dashboard' | 'admin' | 'fileManager';

export interface MenuItemDefinition {
    id: string;
    label: string;
    icon?: LucideIcon;
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    defaultVisible: boolean;
    modules?: ModuleType[];
    subItems?: string[];
    category?: string;
}

export interface MenuRegistry {
    definitions: Record<string, MenuItemDefinition>;
    handlers: Record<string, Record<ModuleType, Function>>;
}

export interface MenuItemConfig {
    id: string;
    label: string;
    icon?: LucideIcon;
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    defaultVisible: boolean; // true for always shown, false for optional
    modules?: ModuleType[]; // if undefined, available in all modules
    subItems?: string[]; // references to other menu item IDs
    handler?: (module: ModuleType, data?: any) => void;
}
