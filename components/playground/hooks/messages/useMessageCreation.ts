// import { useCallback, useState } from 'react';
// import { useEntityTools } from '@/lib/redux';
// import { MessageTemplateDataOptional, MatrxRecordId } from '@/types';
// import { useCreateRecord } from '@/app/entities/hooks/unsaved-records/useCreateRecord';

// interface PendingMessage {
//     messageRecordKey: MatrxRecordId;
//     relationshipRecordKey: MatrxRecordId;
//     messageId: string;
//     content: string;
//     role: "user" | "assistant" | "system";
//     type: "text" | "base64_image" | "blob" | "image_url" | "other";
//     order: number;
// }

// export function useMessageCreation(activeRecipeFieldId: string | undefined) {
//     const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
//     const [initializedRecipe, setInitializedRecipe] = useState<string | undefined>();
    
//     const { createRecord: createMessageTemplate } = useCreateRecord('messageTemplate');
//     const { createRecord: createRecipeMessage } = useCreateRecord('recipeMessage');
    
//     const { actions: messageTemplateActions, dispatch } = useEntityTools('messageTemplate');

//     const updateMessageContent = useCallback((messageId: string, content: string) => {
//         if (!activeRecipeFieldId) return;
    
//         // Find the pending message without setting state if it's not found
//         const pendingMessage = pendingMessages.find(msg => msg.messageId === messageId);
//         if (!pendingMessage) return;
    
//         // Only update if content actually changed
//         if (pendingMessage.content === content) return;
    
//         // Update Redux state first
//         dispatch(
//             messageTemplateActions.updateUnsavedField({
//                 recordId: pendingMessage.messageRecordKey,
//                 field: 'content',
//                 value: content,
//             })
//         );
    
//         // Then update local state
//         setPendingMessages(prev => 
//             prev.map(msg => 
//                 msg.messageId === messageId 
//                     ? { ...msg, content } 
//                     : msg
//             )
//         );
//     }, [activeRecipeFieldId, pendingMessages, dispatch, messageTemplateActions]);

//     const initializeNewRecipe = useCallback(() => {
//         if (!activeRecipeFieldId || initializedRecipe === activeRecipeFieldId) return;
    
//         // Clear any existing pending messages first
//         setPendingMessages([]);
    
//         const systemMessage: MessageTemplateDataOptional = {
//             id: 'system-1',
//             role: 'system',
//             type: 'text',
//             content: '',
//         };
    
//         const userMessage: MessageTemplateDataOptional = {
//             id: 'user-1',
//             role: 'user',
//             type: 'text',
//             content: '',
//         };
    
//         // Create both messages atomically
//         const systemId = startNewMessage(systemMessage, 0);
//         if (systemId) {
//             const userId = startNewMessage(userMessage, 1);
//             if (userId) {
//                 setInitializedRecipe(activeRecipeFieldId);
//             }
//         }
//     }, [activeRecipeFieldId, initializedRecipe, startNewMessage]);

//     const saveAllPendingMessages = useCallback(() => {
//         if (!activeRecipeFieldId || !pendingMessages.length) return;

//         pendingMessages.forEach(message => {
//             createMessageTemplate(message.messageRecordKey);
//             createRecipeMessage(message.relationshipRecordKey);
//         });

//         setPendingMessages([]);
//     }, [activeRecipeFieldId, pendingMessages, createMessageTemplate, createRecipeMessage]);

//     return {
//         startNewMessage,
//         updateMessageContent,
//         saveAllPendingMessages,
//         hasPendingMessages: pendingMessages.length > 0,
//         initializeNewRecipe
//     };
// }
