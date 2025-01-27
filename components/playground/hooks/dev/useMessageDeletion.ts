import { useCallback } from 'react';
import { useAppSelector, useEntityTools } from '@/lib/redux';
import { MatrxRecordId, RecipeMessageDataRequired } from '@/types';
import { useDeleteRecord } from '@/app/entities/hooks/crud/useDeleteRecord';
import { useAppDispatch } from '@/lib/redux';

interface UseMessageDeletionOptions {
    activeRecipeFieldId: string | undefined;
}

export function useMessageDeletion({ activeRecipeFieldId }: UseMessageDeletionOptions) {
    const { selectors: recipeMessageSelectors } = useEntityTools('recipeMessage');
    const { actions: recipeMessageActions } = useEntityTools('recipeMessage');

    const dispatch = useAppDispatch();

    // Delete handlers for both entities
    const handleRecipeMessageDelete = useCallback((success: boolean) => {
        // Handle completion of recipe message deletion
    }, []);

    const handleMessageTemplateDelete = useCallback((success: boolean) => {
        // Handle completion of message template deletion
    }, []);

    const { deleteRecord: deleteRecipeMessage } = useDeleteRecord('recipeMessage', handleRecipeMessageDelete);
    const { deleteRecord: deleteMessageTemplate } = useDeleteRecord('messageTemplate', handleMessageTemplateDelete);

    const deleteMessage = useCallback(
        async (messageId: string) => {
            if (!activeRecipeFieldId) return;

            // 1. Get the recipe message to be deleted to know its order
            const recipeMessages = useAppSelector(recipeMessageSelectors.selectRecordsByFieldValue('messageId', messageId)) as RecipeMessageDataRequired[];

            const recipeMessage = recipeMessages[0];
            if (!recipeMessage) return;

            const deletedOrder = recipeMessage.order;

            // 2. Get all recipe messages for this recipe to reorder them
            const allRecipeMessages = useAppSelector(recipeMessageSelectors.selectRecordsByFieldValue('recipeId', activeRecipeFieldId)) as RecipeMessageDataRequired[];

            // 3. Delete the recipe message relationship first
            deleteRecipeMessage(recipeMessage.id as MatrxRecordId);

            // 4. Delete the message template
            deleteMessageTemplate(messageId as MatrxRecordId);

            // 5. Update orders for all messages that came after the deleted one
            allRecipeMessages
                .filter((msg) => msg.order > deletedOrder)
                .forEach((msg) => {
                    dispatch(
                        recipeMessageActions.updateUnsavedField({
                            recordId: msg.id as MatrxRecordId,
                            field: 'order',
                            value: msg.order - 1,
                        })
                    );
                });
        },
        [activeRecipeFieldId, deleteRecipeMessage, deleteMessageTemplate, dispatch, recipeMessageActions]
    );

    return {
        deleteMessage,
    };
}
