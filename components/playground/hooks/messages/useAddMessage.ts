import useStartCreateRecord from "@/app/entities/hooks/unsaved-records/useStartCreateRecord";
import { useEntityTools } from "@/lib/redux";
import { MessageTemplateDataOptional, MatrxRecordId } from "@/types";
import { useCallback } from "react";

interface MessageOperationState {
    recipeStatus: 'initializing' | 'loading' | 'idle';
    mode: 'existingRecipe' | 'newRecipe' | null;
}

// Hook specific types
interface UseAddMessageResult {
    addMessage: (message: MessageTemplateDataOptional, order: number) => MatrxRecordId | null;
}

interface UseUpdateMessageResult {
    updateMessageContent: (recordId: MatrxRecordId, content: string) => void;
    saveMessageContent: (recordId: MatrxRecordId) => void;
    updateRecipeMessageOrder: (recordId: MatrxRecordId, order: number) => void;
    saveRecipeMessage: (recordId: MatrxRecordId) => void;
}




export function useAddMessage(state: MessageOperationState) {
    const { actions: messageTemplateActions, dispatch } = useEntityTools('messageTemplate');
    const { actions: recipeMessageActions } = useEntityTools('recipeMessage');
    const startCreateMessageTemplate = useStartCreateRecord({ entityKey: 'messageTemplate' });
    const startCreateRecipeMessage = useStartCreateRecord({ entityKey: 'recipeMessage' });

    const addMessage = useCallback((message: MessageTemplateDataOptional, order: number): MatrxRecordId | null => {
        if (state.recipeStatus !== 'idle') return null;

        // Start message template creation
        const messageRecordKey = startCreateMessageTemplate();
        if (!messageRecordKey) return null;

        // Initialize message template data
        dispatch(
            messageTemplateActions.updateUnsavedField({
                recordId: messageRecordKey,
                field: 'type',
                value: message.type,
            })
        );
        dispatch(
            messageTemplateActions.updateUnsavedField({
                recordId: messageRecordKey,
                field: 'role',
                value: message.role,
            })
        );
        dispatch(
            messageTemplateActions.updateUnsavedField({
                recordId: messageRecordKey,
                field: 'content',
                value: message.content || '',
            })
        );

        return messageRecordKey;
    }, [state.recipeStatus, startCreateMessageTemplate, dispatch, messageTemplateActions]);

    return { addMessage };
}