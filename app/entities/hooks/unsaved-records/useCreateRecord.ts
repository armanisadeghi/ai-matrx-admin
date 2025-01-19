// useCreateRecord.ts
import { useEntityToasts, useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { callbackManager } from '@/utils/callbackManager';
import { useCallback, useState } from 'react';

interface UseCreateRecordOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    returnCallbackId?: boolean;
}

interface CreateRecordBaseResult {
    createRecord: (matrxRecordId: MatrxRecordId) => Promise<void>;
}

interface CreateRecordWithCallbackResult extends CreateRecordBaseResult {
    callbackId: string | null;
}

type UseCreateRecordResult = CreateRecordBaseResult | CreateRecordWithCallbackResult;

export const useCreateRecord = (
    entityKey: EntityKeys,
    options?: UseCreateRecordOptions
): UseCreateRecordResult => {
    const { actions, dispatch, selectors, store } = useEntityTools(entityKey);
    const entityToasts = useEntityToasts(entityKey);
    const [currentCallbackId, setCurrentCallbackId] = useState<string | null>(null);

    const createRecord = useCallback((matrxRecordId: MatrxRecordId): Promise<void> => {
        return new Promise<void>((resolve) => {
            const createPayload = selectors.selectCreatePayload(store.getState(), matrxRecordId);
            dispatch(actions.addPendingOperation(matrxRecordId));

            const callbackId = callbackManager.register(({ success, error }) => {
                dispatch(actions.removePendingOperation(matrxRecordId));
                if (success) {
                    entityToasts.handleCreateSuccess();
                    options?.onSuccess?.();
                } else {
                    entityToasts.handleError(error, 'create');
                    options?.onError?.(error);
                }
                resolve();
            });

            // Store callbackId if requested
            if (options?.returnCallbackId) {
                setCurrentCallbackId(callbackId);
            }

            dispatch(actions.createRecord({
                ...createPayload,
                callbackId
            }));
        });
    }, [dispatch, actions, selectors, entityToasts, store, entityKey, options]);

    // Return different shapes based on options
    if (options?.returnCallbackId) {
        return { createRecord, callbackId: currentCallbackId };
    }

    return { createRecord };
};