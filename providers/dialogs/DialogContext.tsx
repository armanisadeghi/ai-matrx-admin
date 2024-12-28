'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { 
    DialogContextValue, 
    DialogState, 
    DialogConfig, 
    DialogRegistryType, 
    BaseDialogProps
} from './types';

const DialogContext = createContext<DialogContextValue | null>(null);

type DialogAction =
    | { type: 'OPEN_DIALOG'; payload: { dialogId: string; props?: Record<string, any> } }
    | { type: 'CLOSE_DIALOG'; payload: { dialogId: string } }
    | { type: 'CLOSE_ALL_DIALOGS' };

const dialogReducer = (state: DialogState, action: DialogAction): DialogState => {
    switch (action.type) {
        case 'OPEN_DIALOG':
            return {
                ...state,
                [action.payload.dialogId]: {
                    isOpen: true,
                    props: action.payload.props
                }
            };
        case 'CLOSE_DIALOG':
            return {
                ...state,
                [action.payload.dialogId]: {
                    ...state[action.payload.dialogId],
                    isOpen: false
                }
            };
        case 'CLOSE_ALL_DIALOGS':
            return Object.keys(state).reduce((acc, dialogId) => ({
                ...acc,
                [dialogId]: { ...state[dialogId], isOpen: false }
            }), state);
        default:
            return state;
    }
};

interface DialogProviderProps {
    children: ReactNode;
}

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
    const [dialogState, dispatch] = useReducer(dialogReducer, {});
    const [registry] = React.useState<DialogRegistryType>(new Map());

    const openDialog = useCallback(<T = any>(dialogId: string, props?: Omit<T, keyof BaseDialogProps>) => {
        dispatch({ type: 'OPEN_DIALOG', payload: { dialogId, props } });
    }, []);

    const closeDialog = useCallback((dialogId: string) => {
        dispatch({ type: 'CLOSE_DIALOG', payload: { dialogId } });
    }, []);

    const closeAllDialogs = useCallback(() => {
        dispatch({ type: 'CLOSE_ALL_DIALOGS' });
    }, []);

    const registerDialog = useCallback(<T = any>(config: DialogConfig<T>) => {
        registry.set(config.id, config);
    }, [registry]);

    const unregisterDialog = useCallback((dialogId: string) => {
        registry.delete(dialogId);
    }, [registry]);

    const contextValue = React.useMemo<DialogContextValue>(() => ({
        openDialog,
        closeDialog,
        closeAllDialogs,
        registerDialog,
        unregisterDialog
    }), [openDialog, closeDialog, closeAllDialogs, registerDialog, unregisterDialog]);

    return (
        <DialogContext.Provider value={contextValue}>
            {children}
            {Array.from(registry.entries()).map(([dialogId, config]) => {
                const DialogComponent = config.component;
                const currentDialogState = dialogState[dialogId] || { isOpen: false };
                const combinedProps = {
                    ...config.defaultProps,
                    ...currentDialogState.props,
                    isOpen: currentDialogState.isOpen,
                    onClose: () => closeDialog(dialogId)
                };

                return <DialogComponent key={dialogId} {...combinedProps} />;
            })}
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

