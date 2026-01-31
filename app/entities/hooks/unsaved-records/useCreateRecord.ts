import { useAppDispatch, useEntityToasts, useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { callbackManager } from '@/utils/callbackManager';
import { useCallback, useState } from 'react';

interface UseCreateRecordOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    returnCallbackId?: boolean;
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
}

interface CreateRecordBaseResult {
    createRecord: (matrxRecordId: MatrxRecordId) => Promise<void>;
    createRecordWithCallbackId: (matrxRecordId: MatrxRecordId) => Promise<string>;
}

interface CreateRecordWithCallbackResult extends CreateRecordBaseResult {
    callbackId: string | null;
}

type UseCreateRecordResult = CreateRecordBaseResult | CreateRecordWithCallbackResult;

export const useCreateRecord = (entityKey: EntityKeys, options?: UseCreateRecordOptions): UseCreateRecordResult => {
    const dispatch = useAppDispatch();
    const { actions, selectors, store } = useEntityTools(entityKey);
    const entityToasts = useEntityToasts(entityKey);
    const [currentCallbackId, setCurrentCallbackId] = useState<string | null>(null);
    
    // Default values for new toast options
    const showSuccessToast = options?.showSuccessToast !== false; // Default to true
    const showErrorToast = options?.showErrorToast !== false; // Default to true
    
    const createRecord = useCallback(
        (matrxRecordId: MatrxRecordId): Promise<void> => {
            return new Promise<void>((resolve) => {
                const createPayload = selectors.selectCreatePayload(store.getState(), matrxRecordId);
                dispatch(actions.addPendingOperation(matrxRecordId));
                const callbackId = callbackManager.register(({ success, error }) => {
                    dispatch(actions.removePendingOperation(matrxRecordId));
                    if (success) {
                        if (showSuccessToast) {
                            entityToasts.handleCreateSuccess();
                        }
                        options?.onSuccess?.();
                    } else {
                        if (showErrorToast) {
                            entityToasts.handleError(error, 'create');
                        }
                        options?.onError?.(error);
                    }
                    resolve();
                });
                // Store callbackId if requested
                if (options?.returnCallbackId) {
                    setCurrentCallbackId(callbackId);
                }
                dispatch(
                    actions.createRecord({
                        ...createPayload,
                        callbackId,
                    })
                );
            });
        },
        [dispatch, actions, selectors, entityToasts, store, entityKey, options, showSuccessToast, showErrorToast]
    );
    
    // New method that returns the callback ID directly
    const createRecordWithCallbackId = useCallback(
        (matrxRecordId: MatrxRecordId): Promise<string> => {
            return new Promise<string>((resolve) => {
                const createPayload = selectors.selectCreatePayload(store.getState(), matrxRecordId);
                dispatch(actions.addPendingOperation(matrxRecordId));
                const callbackId = callbackManager.register(({ success, error }) => {
                    dispatch(actions.removePendingOperation(matrxRecordId));
                    if (success) {
                        if (showSuccessToast) {
                            entityToasts.handleCreateSuccess();
                        }
                        options?.onSuccess?.();
                    } else {
                        if (showErrorToast) {
                            entityToasts.handleError(error, 'create');
                        }
                        options?.onError?.(error);
                    }
                });
                
                // Store callbackId if requested by the original options
                if (options?.returnCallbackId) {
                    setCurrentCallbackId(callbackId);
                }
                
                dispatch(
                    actions.createRecord({
                        ...createPayload,
                        callbackId,
                    })
                );
                
                // Return the callback ID immediately
                resolve(callbackId);
            });
        },
        [dispatch, actions, selectors, entityToasts, store, entityKey, options, showSuccessToast, showErrorToast]
    );
    
    // Return different shapes based on options
    if (options?.returnCallbackId) {
        return { createRecord, createRecordWithCallbackId, callbackId: currentCallbackId };
    }
    return { createRecord, createRecordWithCallbackId };
};