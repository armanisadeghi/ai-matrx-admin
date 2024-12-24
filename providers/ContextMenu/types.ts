// types.ts
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export type DialogType = 'confirm' | 'input' | 'select' | 'loader' | 'custom';

export interface DialogBase {
    title: string;
    message?: string;
}

export interface ConfirmDialog extends DialogBase {
    type: 'confirm';
}

export interface InputDialog extends DialogBase {
    type: 'input';
    label: string;
    placeholder?: string;
}

export interface SelectDialog extends DialogBase {
    type: 'select';
    options: Array<{ label: string; value: string }>;
}

export interface LoaderDialog extends DialogBase {
    type: 'loader';
}

export interface CustomDialog extends DialogBase {
    type: 'custom';
    content: ReactNode;
}

export type DialogConfig =
    | ConfirmDialog
    | InputDialog
    | SelectDialog
    | LoaderDialog
    | CustomDialog;

export interface MenuItemBase {
    id: string;
    label: string;
    icon?: LucideIcon;
    disabled?: boolean;
    hidden?: boolean;
    children?: MenuItem[];
}

export interface ActionMenuItem extends MenuItemBase {
    type: 'action';
    handler: (...args: any[]) => void | Promise<void>;
}

export interface LinkMenuItem extends MenuItemBase {
    type: 'link';
    href: string;
}

export interface RouteMenuItem extends MenuItemBase {
    type: 'route';
    path: string;
    params?: Record<string, string>;
}

export interface DialogMenuItem extends MenuItemBase {
    type: 'dialog';
    dialog: DialogConfig;
    onResult?: (result: any) => void | Promise<void>;
}

export type MenuItem =
    | ActionMenuItem
    | LinkMenuItem
    | RouteMenuItem
    | DialogMenuItem
    | (MenuItemBase & { type?: never });

export interface MenuConfig {
    id: string;
    items: MenuItem[];
}