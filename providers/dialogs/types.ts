import { ReactNode } from 'react';

export type BaseDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

export interface DialogComponent<T = any> {
    (props: T & BaseDialogProps): ReactNode;
}

export interface DialogConfig<T = any> {
    id: string;
    component: DialogComponent<T>;
    defaultProps?: Omit<T, keyof BaseDialogProps>;
}

export type DialogRegistryType = Map<string, DialogConfig>;

export interface DialogContextValue {
    openDialog: <T = any>(dialogId: string, props?: Omit<T, keyof BaseDialogProps>) => void;
    closeDialog: (dialogId: string) => void;
    closeAllDialogs: () => void;
    registerDialog: <T = any>(config: DialogConfig<T>) => void;
    unregisterDialog: (dialogId: string) => void;
}

export interface DialogState {
    [dialogId: string]: {
        isOpen: boolean;
        props?: Record<string, any>;
    };
}


