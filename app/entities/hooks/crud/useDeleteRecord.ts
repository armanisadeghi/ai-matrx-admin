// useDeleteRecord.ts
import { useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { callbackManager } from '@/utils/callbackManager';
import { useCallback } from 'react';

interface UseDeleteRecordResult {
    deleteRecord: (matrxRecordId: MatrxRecordId) => void;
}

export const useDeleteRecord = (
    entityKey: EntityKeys,
    onComplete?: (success: boolean) => void
): UseDeleteRecordResult => {
    const { actions, dispatch } = useEntityTools(entityKey);

    const deleteRecord = useCallback((matrxRecordId: MatrxRecordId) => {
        dispatch(actions.addPendingOperation(matrxRecordId));

        dispatch(actions.deleteRecord({
            matrxRecordId,
            callbackId: callbackManager.register((success: boolean) => {
                dispatch(actions.removePendingOperation(matrxRecordId));
                onComplete?.(success);
            })
        }));
    }, [dispatch, actions, onComplete]);

    return { deleteRecord };
};