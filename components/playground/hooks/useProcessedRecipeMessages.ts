import React, { useCallback, useEffect, useState } from 'react';
import {
    EntityDataWithKey,
    ExpandRecursively,
    MessageTemplateDataOptional,
    MessageTemplateProcessed,
    MessageTemplateRecordWithKey,
    RecipeMessageRecordWithKey,
} from '@/types';
import { useMessageReordering } from './messages/useMessageReordering';
import { RelationshipHook } from '@/app/entities/hooks/relationships/useRelationships';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { getNewMatrxRecordIdsFromMessages } from '@/features/rich-text-editor/utils/patternUtils';
import { getOrFetchSelectedRecordsThunk, RecordResult } from '@/lib/redux/entity/thunks';
import { RelationshipProcessingHook } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import { useDebounce } from '@uidotdev/usehooks';

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


    const { handleDragDrop } = useMessageReordering(processedMessages, () => triggerProcessing());

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
    };
}

export type UseProcessedRecipeMessagesHook = ReturnType<typeof useProcessedRecipeMessages>;
