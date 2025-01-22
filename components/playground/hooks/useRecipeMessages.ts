import React, { useCallback, useEffect, useState } from 'react';
import { ExpandRecursively, MessageTemplateDataOptional, MessageTemplateProcessed, MessageTemplateRecordWithKey, RecipeMessageRecordWithKey } from '@/types';
import { processJoinedData } from '@/app/entities/hooks/relationships/utils';
import { useMessageReordering } from './messages/useMessageReordering';
import { RelationshipHook } from '@/app/entities/hooks/relationships/useRelationships';
import { recipeMessageDef } from '@/app/entities/hooks/relationships/definitionConversionUtil';
import { useAppDispatch, useEntityTools } from '@/lib/redux';

export type AddMessagePayload = {
    child: MessageTemplateDataOptional;
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
    const [canProcess, setCanProcess] = useState(false);
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

    // Track when loading has been stable (false) for 200ms
    useEffect(() => {
        if (recipeMessageIsLoading) {
            setCanProcess(false);
            return;
        }

        const timer = setTimeout(() => {
            setCanProcess(true);
        }, 200);

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

        const newUniqueBrokers = extractUniqueBrokersFromRecords(processedMessages);
        setLastUniqueBrokers(newUniqueBrokers);
        return newUniqueBrokers;
    }, [processedMessages, canProcess]);

    useEffect(() => {
        if (uniqueBrokers.length > 0) {
            dispatch(
                brokerActions.getOrFetchSelectedRecords({
                    matrxRecordIds: uniqueBrokers,
                    fetchMode: 'fkIfk',
                })
            );
        }
    }, [dispatch, brokerActions, uniqueBrokers]);

    const { handleDragDrop } = useMessageReordering(processedMessages, () => setNeedsReprocess(true));

    const addMessage = useCallback(
        async (newMessage: MessageTemplateDataOptional) => {
            const nextOrder = processedMessages.length;
            await createMessage(
                {
                    child: newMessage,
                    joining: { order: nextOrder },
                },
                {
                    onSuccess: () => {
                        console.log('Successfully created relationship');
                    },
                    onError: (error) => {
                        console.error('Failed to create relationship:', error);
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
        recipeMessageIsLoading, // Return the original loading state
        recipeMessageLoadingState,
        deleteMessage,
        handleDragDrop,
        addMessage,
    };
}

export type UseRecipeMessagesHook = ReturnType<typeof useRecipeMessages>;
