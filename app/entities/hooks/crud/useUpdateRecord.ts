// useUpdateRecord.ts
import { useEntityToasts, useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { callbackManager } from '@/utils/callbackManager';
import { useCallback } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';

interface UseUpdateRecordResult {
    updateRecord: (matrxRecordId: MatrxRecordId) => void;
}

interface UseUpdateRecordOptions {
    onComplete?: () => void;
    showToast?: boolean;
}

export const useUpdateRecord = (
    entityKey: EntityKeys,
    options: UseUpdateRecordOptions = {}
): UseUpdateRecordResult => {
    const { onComplete, showToast = true } = options;
    const dispatch = useAppDispatch();
    const { store, actions, selectors } = useEntityTools(entityKey);
    const entityToasts = useEntityToasts(entityKey);

    const updateRecord = useCallback((matrxRecordId: MatrxRecordId) => {
        dispatch(actions.addPendingOperation(matrxRecordId));

        dispatch(actions.updateRecord({
            matrxRecordId,
            data: {},
            callbackId: callbackManager.register(({ success, error }) => {
                dispatch(actions.removePendingOperation(matrxRecordId));
                if (success) {
                    if (showToast) {
                        entityToasts.handleUpdateSuccess();
                    }
                    onComplete?.();
                } else {
                    if (showToast) {
                        entityToasts.handleError(error, 'update');
                    }
                }
            })
        }));
    }, [dispatch, actions, entityToasts, onComplete, showToast]);

    return { updateRecord };
};