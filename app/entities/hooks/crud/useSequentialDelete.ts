import { useEntityTools } from '@/lib/redux';
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
    const [isDeleting, setIsDeleting] = useState(false);
    const firstEntity = useEntityTools(firstEntityKey);
    const secondEntity = useEntityTools(secondEntityKey);

    const deleteRecords = useCallback((firstRecordId: MatrxRecordId, secondRecordId: MatrxRecordId) => {
        console.log('🚀 Starting sequential delete operation', {
            firstEntityKey,
            secondEntityKey,
            firstRecordId,
            secondRecordId
        });
        
        setIsDeleting(true);
        
        firstEntity.dispatch(firstEntity.actions.addPendingOperation(firstRecordId));
        console.log('📝 Added pending operation for first entity', { firstRecordId });

        firstEntity.dispatch(firstEntity.actions.deleteRecord({
            matrxRecordId: firstRecordId,
            callbackId: callbackManager.register((firstSuccess: boolean) => {
                console.log('⚡ First delete callback triggered', { 
                    firstSuccess, 
                    firstRecordId 
                });
                
                firstEntity.dispatch(firstEntity.actions.removePendingOperation(firstRecordId));
                console.log('🗑️ Removed pending operation for first entity');

                if (!firstSuccess) {
                    console.error('❌ First delete failed, aborting sequence', { 
                        firstEntityKey, 
                        firstRecordId 
                    });
                    setIsDeleting(false);
                    onComplete?.(false);
                    return;
                }

                console.log('✅ First delete succeeded, starting second delete');
                secondEntity.dispatch(secondEntity.actions.addPendingOperation(secondRecordId));
                console.log('📝 Added pending operation for second entity', { secondRecordId });

                secondEntity.dispatch(secondEntity.actions.deleteRecord({
                    matrxRecordId: secondRecordId,
                    callbackId: callbackManager.register((secondSuccess: boolean) => {
                        console.log('⚡ Second delete callback triggered', { 
                            secondSuccess, 
                            secondRecordId 
                        });
                        
                        secondEntity.dispatch(secondEntity.actions.removePendingOperation(secondRecordId));
                        console.log('🗑️ Removed pending operation for second entity');
                        
                        setIsDeleting(false);
                        onComplete?.(secondSuccess);
                        
                        console.log('🏁 Sequential delete complete', { 
                            finalSuccess: secondSuccess,
                            firstEntityKey,
                            secondEntityKey
                        });
                    })
                }));
            })
        }));
    }, [firstEntity.dispatch, firstEntity.actions, secondEntity.dispatch, secondEntity.actions, onComplete]);

    return { deleteRecords, isDeleting };
};