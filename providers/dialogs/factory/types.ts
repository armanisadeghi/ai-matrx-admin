import { ReactNode } from 'react';

export type DialogType = 'standard' | 'alert';

export interface BaseDialogConfig {
    id: string;
    type: DialogType;
    title: string;
    description?: string;
    trigger?: ReactNode | ((open: () => void) => ReactNode);
}

export interface StandardDialogConfig extends BaseDialogConfig {
    type: 'standard';
    content?: ReactNode | ((close: () => void) => ReactNode);
    footer?: ReactNode | ((close: () => void) => ReactNode);
}

export interface AlertDialogConfig extends BaseDialogConfig {
    type: 'alert';
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: 'default' | 'destructive';
    onConfirm?: () => Promise<void> | void;
}

export type DialogConfig = StandardDialogConfig | AlertDialogConfig;
