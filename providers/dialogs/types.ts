// providers\dialogs\types.ts
import { ReactNode } from 'react';

export type BaseDialogProps = {
   isOpen: boolean;
   onClose: () => void;
};

// The function that creates a dialog component
export type DialogComponentCreator = () => DialogComponent;

// The actual dialog component
export type DialogComponent = (props: BaseDialogProps) => ReactNode;

// Dialog configuration for registration
export interface DialogConfig {
   id: string;
   component: DialogComponentCreator;
   defaultProps?: Record<string, any>;
}

export type DialogRegistryType = Map<string, DialogConfig>;

export interface DialogContextValue {
   openDialog: (dialogId: string, props?: Record<string, any>) => void;
   closeDialog: (dialogId: string) => void;
   closeAllDialogs: () => void;
   registerDialog: (config: DialogConfig) => void;
   unregisterDialog: (dialogId: string) => void;
}

export interface DialogState {
   [dialogId: string]: {
       isOpen: boolean;
       props?: Record<string, any>;
   };
}