// types.ts
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export type MenuItemType = 'item' | 'checkbox' | 'radio' | 'sub';

export type MenuHandler = () => void | Promise<void>;

export interface BaseMenuItem {
    id: string;
    label: string;
    icon?: LucideIcon;
    shortcut?: string;
    disabled?: boolean;
    hidden?: boolean;
    type?: MenuItemType;
    handler?: MenuHandler;
    className?: string;
}

export interface MenuItem extends BaseMenuItem {
    type?: 'item';
}

export interface MenuCheckboxItem extends BaseMenuItem {
    type: 'checkbox';
    checked?: boolean;
}

export interface MenuRadioItem extends BaseMenuItem {
    type: 'radio';
    value: string;
    groupName: string;
}

export interface MenuSubItem extends BaseMenuItem {
    type: 'sub';
    items: MenuItemConfig[];
}

export type MenuItemConfig = MenuItem | MenuCheckboxItem | MenuRadioItem | MenuSubItem;

export interface ContextMenuConfig {
    id: string;
    items: MenuItemConfig[];
    defaultItems?: MenuItemConfig[];
    className?: string;
    children?: ReactNode;
}
