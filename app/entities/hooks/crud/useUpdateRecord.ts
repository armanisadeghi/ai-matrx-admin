// useUpdateRecord.ts
import { useEntityToasts, useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { callbackManager } from '@/utils/callbackManager';
import { useCallback } from 'react';

interface UseUpdateRecordResult {
    updateRecord: (matrxRecordId: MatrxRecordId) => void;
}

export const useUpdateRecord = (
    entityKey: EntityKeys, 
    onComplete?: () => void
): UseUpdateRecordResult => {
    const { actions, dispatch } = useEntityTools(entityKey);
    const entityToasts = useEntityToasts(entityKey);

    const updateRecord = useCallback((matrxRecordId: MatrxRecordId) => {
        dispatch(actions.addPendingOperation(matrxRecordId));

        dispatch(actions.updateRecord({
            matrxRecordId,
            callbackId: callbackManager.register(({ success, error }) => {
                dispatch(actions.removePendingOperation(matrxRecordId));
                if (success) {
                    entityToasts.handleUpdateSuccess();
                    onComplete?.();
                } else {
                    entityToasts.handleError(error, 'update');
                }
            })
        }));
    }, [dispatch, actions, entityToasts, onComplete]);

    return { updateRecord };
};