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
}

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
    const [lastUniqueBrokers, setLastUniqueBrokers] = useState<string[]>([]);
    const [validateMessages, setValidateMessages] = useState<boolean>(false);

    const dispatch = useAppDispatch();
    const { actions: brokerActions } = useEntityTools('dataBroker');
    const {
        mapper: messageMapper,
        JoiningEntityRecords: recipeMessages,
        joiningMatrxIds: recipeMessageMatrxIds,
        childIds: messageIds,
        childMatrxIds: messageMatrxIds,
        childRecords,
        processedChildRecords,
        parentId: recipePkId,
        parentMatrxid: recipeMatrxId,
        deleteChildAndJoin: deleteMessage,
        createRelatedRecords: createMessage,
        isLoading: recipeMessageIsLoading,
        loadingState: recipeMessageLoadingState,
        triggerProcessing,
    } = recipeMessagesProcessingHook;

    const coreMessages = childRecords as MessageTemplateRecordWithKey[];
    const processedMessages = processedChildRecords as MessageTemplateProcessed[];

    useEffect(() => {
        setLastUniqueBrokers([]);
    }, [recipePkId]);

    useEffect(() => {
        if (!recipeMessageIsLoading && processedMessages.length > 0 && processedMessages.length < 3 && !validateMessages) {
            setValidateMessages(true);
        }
    }, [recipeMessageIsLoading, processedMessages, validateMessages]);

    const uniqueEncodedBrokers = React.useMemo(() => {
        if (recipeMessageIsLoading) return lastUniqueBrokers;
        const newUniqueBrokers = getNewMatrxRecordIdsFromMessages(coreMessages, lastUniqueBrokers);
        if (newUniqueBrokers.length > 0) {
            console.log('-useProcessedRecipeMessages New unique brokers from ENCODED TEXT:', newUniqueBrokers);
        }
        setLastUniqueBrokers(newUniqueBrokers);
        return newUniqueBrokers;
    }, [coreMessages, recipeMessageIsLoading, lastUniqueBrokers]);

    useEffect(() => {
        if (uniqueEncodedBrokers.length > 0) {
            dispatch(
                getOrFetchSelectedRecordsThunk({
                    entityKey: 'dataBroker',
                    actions: brokerActions,
                    payload: {
                        matrxRecordIds: uniqueEncodedBrokers,
                        fetchMode: 'fkIfk',
                    },
                })
            )
                .unwrap() // This extracts the actual payload from the AsyncThunk result
                .then((results: RecordResult<any>[]) => {
                    const fetchedBrokers = results.filter((result) => result.data);
                    console.log(
                        'Fetched brokers:',
                        fetchedBrokers.map((b) => b.data.name)
                    );
                    const missingBrokers = results.filter((result) => !result.data);
                    console.log(
                        'Missing brokers:',
                        missingBrokers.map((b) => b.recordId)
                    );

                    if (missingBrokers.length > 0) {
                        console.log(
                            'Some brokers could not be fetched:',
                            missingBrokers.map((b) => b.recordId)
                        );
                    }
                })
                .catch((error) => {
                    console.error('Failed to fetch brokers:', error);
                });
        }
    }, [dispatch, brokerActions, uniqueEncodedBrokers]);

    const { handleDragDrop } = useMessageReordering(processedMessages, () => triggerProcessing());

    const addMessage = useCallback(
        (newMessage: NewMessageEntry, onComplete?: (success: boolean) => void) => {
            const nextOrder = newMessage.order? newMessage.order : processedMessages.length + 1;
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
        messageMapper,
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
