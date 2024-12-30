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
    | { type: 'CLOSE_ALL_DIALOGS' }
    | { type: 'DIALOG_REGISTERED'; payload: { dialogId: string } }
    | { type: 'DIALOG_UNREGISTERED'; payload: { dialogId: string } };

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
        case 'DIALOG_REGISTERED':
        case 'DIALOG_UNREGISTERED':
            return state; // No state update needed for registration
        default:
            return state;
    }
};

interface DialogProviderProps {
    children: ReactNode;
}

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
    const [dialogState, dispatch] = useReducer(dialogReducer, {});
    const registryRef = React.useRef<DialogRegistryType>(new Map());
    
    const openDialog = useCallback(<T = any>(dialogId: string, props?: Omit<T, keyof BaseDialogProps>) => {
        if (!registryRef.current.has(dialogId)) {
            console.warn(`No dialog registered with id: ${dialogId}`);
            return;
        }
        dispatch({ type: 'OPEN_DIALOG', payload: { dialogId, props } });
    }, []);

    const closeDialog = useCallback((dialogId: string) => {
        dispatch({ type: 'CLOSE_DIALOG', payload: { dialogId } });
    }, []);

    const closeAllDialogs = useCallback(() => {
        dispatch({ type: 'CLOSE_ALL_DIALOGS' });
    }, []);

    const registerDialog = useCallback((config: DialogConfig) => {
        if (!registryRef.current.has(config.id)) {
            registryRef.current.set(config.id, config);
        }
    }, []);

    const unregisterDialog = useCallback((dialogId: string) => {
        registryRef.current.delete(dialogId);
    }, []);

    const contextValue = React.useMemo<DialogContextValue>(() => ({
        openDialog,
        closeDialog,
        closeAllDialogs,
        registerDialog,
        unregisterDialog
    }), [openDialog, closeDialog, closeAllDialogs, registerDialog, unregisterDialog]);

    const renderedDialogs = React.useMemo(() => {
        return Array.from(registryRef.current.entries())
            .filter(([dialogId]) => dialogState[dialogId]?.isOpen)
            .map(([dialogId, config]) => {
                const currentDialogState = dialogState[dialogId];
                const combinedProps = {
                    ...config.defaultProps,
                    ...currentDialogState.props,
                    isOpen: true,
                    onClose: () => closeDialog(dialogId)
                };

                // Create the component instance
                const DialogComponent = config.component();

                return (
                    <React.Fragment key={dialogId}>
                        {DialogComponent(combinedProps)}
                    </React.Fragment>
                );
            });
    }, [dialogState, closeDialog]);


    return (
        <DialogContext.Provider value={contextValue}>
            {children}
            {renderedDialogs}
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