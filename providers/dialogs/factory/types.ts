import { ReactNode } from 'react';

// Basic Dialog Types
export type DialogType = 'standard' | 'alert';

// Props for Dialog Components
export type BaseDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

// Component Definition
export interface DialogComponent<T = any> {
    (props: T & BaseDialogProps): ReactNode;
}

// Base Configuration for Dialog Templates
export interface BaseDialogConfig {
    id: string;
    type: DialogType;
    title: string;
    description?: string | ReactNode;
    trigger?: ReactNode | ((open: () => void) => ReactNode);
}

// Standard Dialog Template Configuration
export interface StandardDialogConfig extends BaseDialogConfig {
    type: 'standard';
    content?: ReactNode | ((close: () => void) => ReactNode);
    footer?: ReactNode | ((close: () => void) => ReactNode);
}

// Alert Dialog Template Configuration
export interface AlertDialogConfig extends BaseDialogConfig {
    type: 'alert';
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: 'default' | 'destructive';
    onConfirm?: () => Promise<void> | void;
}

// Template Config Type Union
export type DialogTemplateConfig = StandardDialogConfig | AlertDialogConfig;

// Registry Dialog Configuration
export interface DialogRegistryConfig {
    id: string;
    component: DialogComponent;
    defaultProps?: Omit<any, keyof BaseDialogProps>;
}