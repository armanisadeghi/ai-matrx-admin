// useCreateRecord.ts
import { useEntityToasts, useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { callbackManager } from '@/utils/callbackManager';
import { useCallback } from 'react';

interface UseCreateRecordResult {
    createRecord: (matrxRecordId: MatrxRecordId) => void;
}

export const useCreateRecord = (entityKey: EntityKeys): UseCreateRecordResult => {
    const { store, actions, dispatch, selectors } = useEntityTools(entityKey);
    const entityToasts = useEntityToasts(entityKey);

    const createRecord = useCallback((matrxRecordId: MatrxRecordId) => {
        const state = store.getState();
        const createPayload = selectors.selectCreatePayload(state, matrxRecordId);

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
    }, [dispatch, actions, selectors, entityToasts]);

    return { createRecord };
};