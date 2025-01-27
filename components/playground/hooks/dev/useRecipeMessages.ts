import React, { useCallback, useEffect, useState } from 'react';
import { ExpandRecursively, MessageTemplateDataOptional, MessageTemplateProcessed, MessageTemplateRecordWithKey, RecipeMessageRecordWithKey } from '@/types';
import { processJoinedData } from '@/app/entities/hooks/relationships/utils';
import { useMessageReordering } from '../messages/useMessageReordering';
import { RelationshipHook } from '@/app/entities/hooks/relationships/useRelationships';
import { recipeMessageDef } from '@/app/entities/hooks/relationships/definitionConversionUtil';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { getAllMatrxRecordIdsFromMessages } from '@/features/rich-text-editor/utils/patternUtils';
import { getOrFetchSelectedRecordsThunk, RecordResult } from '@/lib/redux/entity/thunks';

type NewMessage = {
    id?: string;
    createdAt?: Date;
    type?: "text" | "base64_image" | "blob" | "image_url" | "other" | string;
    role?: "user" | "assistant" | "system" | string;
    content?: string;
}

export type AddMessagePayload = {
    child: NewMessage;
    joining: { order: number };
};

export type RecipeMessageHook = ExpandRecursively<
    Omit<RelationshipHook, 'JoiningEntityRecords' | 'childRecords'> & {
        JoiningEntityRecords: RecipeMessageRecordWithKey[];
        childRecords: MessageTemplateRecordWithKey[];
    }
>;

export const extractUniqueBrokersFromRecords = (messages: MessageTemplateProcessed[]): string[] => {
    const brokerPattern = /\{([^}]+)\}!/g;
    const uniqueValues = new Set<string>();

    messages.forEach((message) => {
        let match;
        while ((match = brokerPattern.exec(message.content)) !== null) {
            uniqueValues.add(match[1].trim());
        }
    });

    return Array.from(uniqueValues);
};

export function useRecipeMessages(recipeMessageHook: RelationshipHook) {
    const dispatch = useAppDispatch();
    const [needsReprocess, setNeedsReprocess] = useState(false);
    const { actions: brokerActions } = useEntityTools('dataBroker');
    const {
        mapper: messageMapper,
        JoiningEntityRecords: recipeMessages,
        joiningMatrxIds: recipeMessageMatrxIds,
        childIds: messageIds,
        childMatrxIds: messageMatrxIds,
        childRecords: coreMessages,
        parentId: recipePkId,
        parentMatrxid: recipeMatrxId,
        deleteChildAndJoin: deleteMessage,
        createRelatedRecords: createMessage,
        isLoading: recipeMessageIsLoading,
        loadingState: recipeMessageLoadingState,
    } = recipeMessageHook;

    const [canProcess, setCanProcess] = useState(false);

    useEffect(() => {
        if (recipeMessageIsLoading) {
            setCanProcess(false);
            return;
        }

        const timer = setTimeout(() => {
            setCanProcess(true);
        }, 400);

        return () => clearTimeout(timer);
    }, [recipeMessageIsLoading]);

    // Store the last processed result to prevent empty states
    const [lastProcessedMessages, setLastProcessedMessages] = useState<MessageTemplateProcessed[]>([]);

    // Process messages with joining data when loading is stable
    const processedMessages = React.useMemo(() => {
        if (!canProcess) return lastProcessedMessages;

        const newProcessedMessages = processJoinedData({
            childRecords: coreMessages,
            joiningRecords: recipeMessages,
            relationshipDefinition: recipeMessageDef,
            parentMatrxId: recipeMatrxId,
        }) as MessageTemplateProcessed[];

        // Update the last known good state
        setLastProcessedMessages(newProcessedMessages);
        return newProcessedMessages;
    }, [coreMessages, recipeMessages, needsReprocess, canProcess]);

    // Similarly maintain last known brokers state
    const [lastUniqueBrokers, setLastUniqueBrokers] = useState<string[]>([]);

    const uniqueBrokers = React.useMemo(() => {
        if (!canProcess) return lastUniqueBrokers;
    
        const newUniqueBrokers = getAllMatrxRecordIdsFromMessages(processedMessages);
        
        if (newUniqueBrokers.length > 0) {
            console.log('----++++---- New unique brokers:', newUniqueBrokers);
        }
        
        setLastUniqueBrokers(newUniqueBrokers);
        return newUniqueBrokers;
    }, [processedMessages, canProcess]);


    useEffect(() => {
        if (uniqueBrokers.length > 0) {
            dispatch(getOrFetchSelectedRecordsThunk({
                entityKey: 'dataBroker',
                actions: brokerActions,
                payload: {
                    matrxRecordIds: uniqueBrokers,
                    fetchMode: 'fkIfk',
                }
            }))
            .unwrap()  // This extracts the actual payload from the AsyncThunk result
            .then((results: RecordResult<any>[]) => {
                const fetchedBrokers = results.filter(result => result.data);
                console.log('Fetched brokers:', fetchedBrokers.map(b => b.data.name));
                const missingBrokers = results.filter(result => !result.data);
                console.log('Missing brokers:', missingBrokers.map(b => b.recordId));
                
                if (missingBrokers.length > 0) {
                    console.log('Some brokers could not be fetched:', missingBrokers.map(b => b.recordId));
                }
            })
            .catch((error) => {
                console.error('Failed to fetch brokers:', error);
            });
        }
    }, [dispatch, brokerActions, uniqueBrokers]);



    
    const { handleDragDrop } = useMessageReordering(processedMessages, () => setNeedsReprocess(true));

    const addMessage = useCallback(
        (newMessage: MessageTemplateDataOptional, onComplete?: (success: boolean) => void) => {
            
            const nextOrder = processedMessages.length;
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
    

    return {
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

export type UseRecipeMessagesHook = ReturnType<typeof useRecipeMessages>;

