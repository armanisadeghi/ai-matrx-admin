// useCreateRecord.ts
import { useEntityToasts, useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { callbackManager } from '@/utils/callbackManager';
import { useCallback } from 'react';

interface UseCreateRecordResult {
    createRecord: (matrxRecordId: MatrxRecordId) => void;
}

export const useCreateRecord = (entityKey: EntityKeys): UseCreateRecordResult => {
    const { actions, dispatch, selectors, store } = useEntityTools(entityKey);
    const entityToasts = useEntityToasts(entityKey);

    const createRecord = useCallback((matrxRecordId: MatrxRecordId) => {
        // Get fresh state at time of callback execution
        const createPayload = selectors.selectCreatePayload(store.getState(), matrxRecordId);

        dispatch(actions.addPendingOperation(matrxRecordId));

        dispatch(actions.createRecord({
            ...createPayload,
            callbackId: callbackManager.register(({ success, error }) => {
                dispatch(actions.removePendingOperation(matrxRecordId));
                if (success) {
                    entityToasts.handleCreateSuccess();
                } else {
                    entityToasts.handleError(error, 'create');
                }
            })
        }));
    }, [dispatch, actions, selectors, entityToasts, store, entityKey]);

    return { createRecord };
};