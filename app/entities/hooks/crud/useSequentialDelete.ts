import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { callbackManager } from '@/utils/callbackManager';
import { useCallback, useState } from 'react';

interface UseSequentialDeleteResult {
    deleteRecords: (firstRecordId: MatrxRecordId, secondRecordId: MatrxRecordId) => void;
    isDeleting: boolean;
}

export const useSequentialDelete = (
    firstEntityKey: EntityKeys,
    secondEntityKey: EntityKeys,
    onComplete?: (success: boolean) => void
): UseSequentialDeleteResult => {
    const dispatch = useAppDispatch();
    const [isDeleting, setIsDeleting] = useState(false);
    const firstEntity = useEntityTools(firstEntityKey);
    const secondEntity = useEntityTools(secondEntityKey);

    const deleteRecords = useCallback(
        (firstRecordId: MatrxRecordId, secondRecordId: MatrxRecordId) => {
            setIsDeleting(true);

            dispatch(firstEntity.actions.addPendingOperation(firstRecordId));

            dispatch(
                firstEntity.actions.deleteRecord({
                    matrxRecordId: firstRecordId,
                    callbackId: callbackManager.register((firstSuccess: boolean) => {

                        dispatch(firstEntity.actions.removePendingOperation(firstRecordId));

                        if (!firstSuccess) {
                            setIsDeleting(false);
                            onComplete?.(false);
                            return;
                        }

                        dispatch(secondEntity.actions.addPendingOperation(secondRecordId));

                        dispatch(
                            secondEntity.actions.deleteRecord({
                                matrxRecordId: secondRecordId,
                                callbackId: callbackManager.register((secondSuccess: boolean) => {
                                    dispatch(secondEntity.actions.removePendingOperation(secondRecordId));

                                    setIsDeleting(false);
                                    onComplete?.(secondSuccess);
                                }),
                            })
                        );
                    }),
                })
            );
        },
        [dispatch, firstEntity.actions, secondEntity.actions, onComplete]
    );

    return { deleteRecords, isDeleting };
};
