import { useCallback } from 'react';
import { MatrxRecordId, MessageTemplateProcessed } from '@/types';
import { useAppDispatch, useAppStore, useEntityTools } from '@/lib/redux';
import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';

// Base hook for updating order
export const useUpdateOrder = () => {
    const dispatch = useAppDispatch();
    const store = useAppStore();
    const { actions, selectors } = useEntityTools('recipeMessage');
    const { updateRecord } = useUpdateRecord('recipeMessage');

    return useCallback(
        (message: MessageTemplateProcessed, newOrder: number) => {
            const state = store.getState();
            const recipeMessageKey = selectors.selectRecordKeyByFieldValue(state, 'messageId', message.id);

            if (recipeMessageKey) {
                dispatch(
                    actions.updateUnsavedField({
                        recordId: recipeMessageKey,
                        field: 'order',
                        value: newOrder,
                    })
                );
                updateRecord(recipeMessageKey);
            }
        },
        [dispatch, actions, selectors, store, updateRecord]
    );
};

// Hook for moving a message up
export const useMoveUp = () => {
    const dispatch = useAppDispatch();
    const { actions, selectors, store } = useEntityTools('recipeMessage');

    return useCallback(
        (message: MessageTemplateProcessed) => {
            const state = store.getState();
            const recipeMessageKey = selectors.selectRecordKeyByFieldValue(state, 'messageId', message.id);

            const payload = {
                matrxRecordId: recipeMessageKey,
                data: { order: message.order - 1 },
            };

            dispatch(actions.directUpdateRecord(payload));
        },
        [dispatch, actions]
    );
};

// Hook for moving a message down
export const useMoveDown = () => {
    const dispatch = useAppDispatch();
    const { actions, selectors, store } = useEntityTools('recipeMessage');

    return useCallback(
        (message: MessageTemplateProcessed) => {
            const state = store.getState();
            const recipeMessageKey = selectors.selectRecordKeyByFieldValue(state, 'messageId', message.id);

            const payload = {
                matrxRecordId: recipeMessageKey,
                data: { order: message.order + 1 },
            };

            dispatch(actions.directUpdateRecord(payload));
        },
        [dispatch, actions]
    );
};

// Optional: Combined hook for all reordering functionality
export const useMessageReordering = (messages: MessageTemplateProcessed[], onComplete?: () => void) => {
    const updateOrder = useUpdateOrder();
    const moveUpHook = useMoveUp();
    const moveDownHook = useMoveDown();

    const handleDragDrop = useCallback(
        (draggedId: MatrxRecordId, dropTargetId: MatrxRecordId) => {
            const draggedIndex = messages.findIndex((message) => message.matrxRecordId === draggedId);
            const dropTargetIndex = messages.findIndex((message) => message.matrxRecordId === dropTargetId);

            if (draggedIndex === -1 || dropTargetIndex === -1) return;

            const draggedMessage = messages[draggedIndex];

            updateOrder(draggedMessage, dropTargetIndex + 1);
            
            if (draggedIndex > dropTargetIndex) {
                for (let i = dropTargetIndex; i < draggedIndex; i++) {
                    moveDownHook(messages[i]);
                }
            } else {
                for (let i = draggedIndex + 1; i <= dropTargetIndex; i++) {
                    moveUpHook(messages[i]);
                }
            }
            onComplete?.();
        },
        [messages, updateOrder]
    );

    return {
        moveUpHook,
        moveDownHook,
        updateOrder,
        handleDragDrop,
    };
};
