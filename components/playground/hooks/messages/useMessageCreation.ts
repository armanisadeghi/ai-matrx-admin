import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useEntityTools } from '@/lib/redux';
import { MessageTemplateDataOptional, MatrxRecordId, RecipeMessageDataRequired } from '@/types';
import useStartCreateRecord from '@/app/entities/hooks/unsaved-records/useStartCreateRecord';
import { useCreateRecord } from '@/app/entities/hooks/unsaved-records/useCreateRecord';

interface PendingMessage {
    messageRecordKey: MatrxRecordId;
    relationshipRecordKey: MatrxRecordId;
    messageId: string;
    content: string;
    role: "user" | "assistant" | "system";
    type: "text" | "base64_image" | "blob" | "image_url" | "other";
    order: number;
}

export function useMessageCreation(activeRecipeFieldId: string | undefined) {
    const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
    const [initializedRecipe, setInitializedRecipe] = useState<string | undefined>();
    
    const startCreateMessageTemplate = useStartCreateRecord({ entityKey: 'messageTemplate' });
    const startCreateRecipeMessage = useStartCreateRecord({ entityKey: 'recipeMessage' });
    const { createRecord: createMessageTemplate } = useCreateRecord('messageTemplate');
    const { createRecord: createRecipeMessage } = useCreateRecord('recipeMessage');
    
    const { actions: messageTemplateActions, dispatch } = useEntityTools('messageTemplate');
    const { actions: recipeMessageActions } = useEntityTools('recipeMessage');

    const startNewMessage = useCallback((newMessage: MessageTemplateDataOptional, order: number) => {
        if (!activeRecipeFieldId) return null;
    
        const messageId = uuidv4();
        const messageRecordKey = startCreateMessageTemplate();
        const relationshipRecordKey = startCreateRecipeMessage();
    
        if (!messageRecordKey || !relationshipRecordKey) return null;
    
        // Create message template
        dispatch(
            messageTemplateActions.updateUnsavedField({
                recordId: messageRecordKey,
                field: 'type',
                value: newMessage.type,
            })
        );
        dispatch(
            messageTemplateActions.updateUnsavedField({
                recordId: messageRecordKey,
                field: 'role',
                value: newMessage.role,
            })
        );
        dispatch(
            messageTemplateActions.updateUnsavedField({
                recordId: messageRecordKey,
                field: 'id',
                value: messageId,
            })
        );
        dispatch(
            messageTemplateActions.updateUnsavedField({
                recordId: messageRecordKey,
                field: 'content',
                value: newMessage.content || '',
            })
        );
    
        // Create relationship
        const relationshipId = uuidv4();
        dispatch(
            recipeMessageActions.updateUnsavedField({
                recordId: relationshipRecordKey,
                field: 'messageId',
                value: messageId,
            })
        );
        dispatch(
            recipeMessageActions.updateUnsavedField({
                recordId: relationshipRecordKey,
                field: 'recipeId',
                value: activeRecipeFieldId,
            })
        );
        dispatch(
            recipeMessageActions.updateUnsavedField({
                recordId: relationshipRecordKey,
                field: 'order',
                value: order,
            })
        );
        dispatch(
            recipeMessageActions.updateUnsavedField({
                recordId: relationshipRecordKey,
                field: 'id',
                value: relationshipId,
            })
        );
    
        const newPendingMessage: PendingMessage = {
            messageRecordKey,
            relationshipRecordKey,
            messageId,
            content: newMessage.content || '',
            role: newMessage.role,
            type: newMessage.type,
            order
        };
    
        setPendingMessages(prev => [...prev, newPendingMessage]);
        
        createMessageTemplate(messageRecordKey);
        createRecipeMessage(relationshipRecordKey);
    
        return messageId;
    }, [
        activeRecipeFieldId,
        startCreateMessageTemplate, 
        startCreateRecipeMessage, 
        dispatch, 
        messageTemplateActions,
        recipeMessageActions,
        createMessageTemplate,
        createRecipeMessage
    ]);
    

    const updateMessageContent = useCallback((messageId: string, content: string) => {
        if (!activeRecipeFieldId) return;
    
        // Find the pending message without setting state if it's not found
        const pendingMessage = pendingMessages.find(msg => msg.messageId === messageId);
        if (!pendingMessage) return;
    
        // Only update if content actually changed
        if (pendingMessage.content === content) return;
    
        // Update Redux state first
        dispatch(
            messageTemplateActions.updateUnsavedField({
                recordId: pendingMessage.messageRecordKey,
                field: 'content',
                value: content,
            })
        );
    
        // Then update local state
        setPendingMessages(prev => 
            prev.map(msg => 
                msg.messageId === messageId 
                    ? { ...msg, content } 
                    : msg
            )
        );
    }, [activeRecipeFieldId, pendingMessages, dispatch, messageTemplateActions]);

    const initializeNewRecipe = useCallback(() => {
        if (!activeRecipeFieldId || initializedRecipe === activeRecipeFieldId) return;
    
        // Clear any existing pending messages first
        setPendingMessages([]);
    
        const systemMessage: MessageTemplateDataOptional = {
            id: 'system-1',
            role: 'system',
            type: 'text',
            content: '',
        };
    
        const userMessage: MessageTemplateDataOptional = {
            id: 'user-1',
            role: 'user',
            type: 'text',
            content: '',
        };
    
        // Create both messages atomically
        const systemId = startNewMessage(systemMessage, 0);
        if (systemId) {
            const userId = startNewMessage(userMessage, 1);
            if (userId) {
                setInitializedRecipe(activeRecipeFieldId);
            }
        }
    }, [activeRecipeFieldId, initializedRecipe, startNewMessage]);

    const saveAllPendingMessages = useCallback(() => {
        if (!activeRecipeFieldId || !pendingMessages.length) return;

        pendingMessages.forEach(message => {
            createMessageTemplate(message.messageRecordKey);
            createRecipeMessage(message.relationshipRecordKey);
        });

        setPendingMessages([]);
    }, [activeRecipeFieldId, pendingMessages, createMessageTemplate, createRecipeMessage]);

    return {
        startNewMessage,
        updateMessageContent,
        saveAllPendingMessages,
        hasPendingMessages: pendingMessages.length > 0,
        initializeNewRecipe
    };
}
