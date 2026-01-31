import { useCallback, useEffect, useState } from 'react';
import {
    ExpandRecursively,
    MessageTemplateProcessed,
    MessageTemplateRecordWithKey,
    RecipeMessageRecordWithKey,
} from '@/types/AutomationSchemaTypes';
import { RelationshipHook } from '@/app/entities/hooks/relationships/useRelationships';
import { RelationshipProcessingHook } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import { useDebounce } from '@uidotdev/usehooks';
import { useNewMessageReordering } from '@/hooks/aiCockpit/newMessageRecordering';
import { generateMessageFromAssitantResponse } from '@/components/playground/messages/prompts';

type CoreMessage = {
    id?: string;
    createdAt?: Date;
    type?: 'text' | 'base64_image' | 'blob' | 'image_url' | 'other' | string;
    role?: 'user' | 'assistant' | 'system' | string;
    content: string;
};

export type NewMessageEntry = {
    content: string;
    role: 'user' | 'system' | 'assistant';
    type: 'other' | 'text' | 'base64_image' | 'blob' | 'image_url';
    order?: number;
    id?: string;
    createdAt?: Date;
};

export type AddMessagePayload = {
    child: CoreMessage;
    joining: { order: number };
};

export type RecipeMessageHook = ExpandRecursively<
    Omit<RelationshipHook, 'JoiningEntityRecords' | 'childRecords'> & {
        JoiningEntityRecords: RecipeMessageRecordWithKey[];
        childRecords: MessageTemplateRecordWithKey[];
    }
>;


export const validateProcessedMessages = (processedMessages: MessageTemplateProcessed[]): NewMessageEntry[] => {
    const missingMessages: NewMessageEntry[] = [];
    const hasValidSystemMessage = processedMessages.some((msg) => msg.order === 1 && msg.role === 'system');
    const hasValidUserMessage = processedMessages.some((msg) => msg.order === 2 && msg.role === 'user');

    if (!hasValidSystemMessage) {
        missingMessages.push({ role: 'system', type: 'text', content: '', order: 1 });
    }

    if (!hasValidUserMessage) {
        missingMessages.push({ role: 'user', type: 'text', content: '', order: 2 });
    }

    return missingMessages;
};

export function useProcessedRecipeMessages(recipeMessagesProcessingHook: RelationshipProcessingHook) {
    const [validateMessages, setValidateMessages] = useState<boolean>(false);

    const {
        joinRecords: recipeMessages,
        joiningMatrxIds: recipeMessageMatrxIds,
        childIds: messageIds,
        childMatrxIds: messageMatrxIds,
        unprocessedChildRecords,
        childRecords,
        parentId: recipePkId,
        parentMatrxid: recipeMatrxId,
        deleteChildAndJoin: deleteMessage,
        createRelatedRecords: createMessage,
        isLoading: recipeMessageIsLoading,
        loadingState: recipeMessageLoadingState,
        triggerProcessing,
    } = recipeMessagesProcessingHook;

    const coreMessages = unprocessedChildRecords as MessageTemplateRecordWithKey[];
    const shouldValidate = useDebounce(!recipeMessageIsLoading && coreMessages.length > 0 && coreMessages.length < 3 && !validateMessages, 200);

    const processedMessages = childRecords as MessageTemplateProcessed[];


    const { handleDragDrop } = useNewMessageReordering(processedMessages, () => triggerProcessing());

    const addMessage = useCallback(
        (newMessage: NewMessageEntry, onComplete?: (success: boolean) => void) => {
            const nextOrder = newMessage.order ? newMessage.order : processedMessages.length + 1;
            createMessage(
                {
                    child: newMessage,
                    joining: { order: nextOrder },
                },
                {
                    onSuccess: () => {
                        onComplete?.(true);
                    },
                    onError: (error) => {
                        console.error('Failed to create relationship:', error);
                        onComplete?.(false);
                    },
                }
            );
        },
        [createMessage, processedMessages]
    );

    const addAssistantResponse = useCallback(
        (response: string, onComplete?: (success: boolean) => void) => {
            const nextOrder = processedMessages.length + 1;
            const newMessage = generateMessageFromAssitantResponse(response, nextOrder) as NewMessageEntry;
            createMessage(
                {
                    child: newMessage,
                    joining: { order: nextOrder },
                },
                {
                    onSuccess: () => {
                        onComplete?.(true);
                    },
                    onError: (error) => {
                        console.error('Failed to create relationship:', error);
                        onComplete?.(false);
                    },
                }
            );
        },
        [createMessage, processedMessages]
    );


    const validateMessagesCallback = useCallback(() => {
        if (recipeMessageIsLoading) return;
        if (!validateMessages) return;
        const messagesToAdd = validateProcessedMessages(processedMessages);

        if (messagesToAdd.length > 0) {
            console.log('Adding missing messages:', messagesToAdd);
            messagesToAdd.forEach((msg) => {
                addMessage(msg);
            });
        }
        setValidateMessages(false);
    }, [addMessage, processedMessages, validateMessages]);

    useEffect(() => {
        if (validateMessages) {
            validateMessagesCallback();
        }
    }, [validateMessages]);



    useEffect(() => {
        console.log("Loading state changed:", JSON.stringify(recipeMessageLoadingState, null, 2));
        console.log("Recipe message is loading:", recipeMessageIsLoading);
    }, [recipeMessageLoadingState, recipeMessageIsLoading]);

    return {
        recipeMatrxId,
        recipePkId,
        messages: processedMessages,
        messageMatrxIds,
        messageIds,
        recipeMessages,
        recipeMessageMatrxIds,
        recipeMessageIsLoading,
        recipeMessageLoadingState,
        deleteMessage,
        handleDragDrop,
        addMessage,
        addAssistantResponse,
    };
}

export type UseProcessedRecipeMessagesHook = ReturnType<typeof useProcessedRecipeMessages>;
