import React, { useCallback, useState } from 'react';
import { MessageTemplateDataOptional } from '@/types';
import { processJoinedData } from '@/app/entities/hooks/relationships/utils';
import { ProcessedRecipeMessages } from '../panel-manager/types';
import { useMessageReordering } from './messages/useMessageReordering';
import { RelationshipHook } from '@/app/entities/hooks/relationships/useRelationships';
import { recipeMessageDef } from '@/app/entities/hooks/relationships/definitionConversionUtil';


export function useRecipeMessages(recipeMessageHook: RelationshipHook) {
    const [needsReprocess, setNeedsReprocess] = useState(false);
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

    // Process messages with joining data (keep existing)
    const processedMessages = React.useMemo(() => {
        return processJoinedData({
            childRecords: coreMessages,
            joiningRecords: recipeMessages,
            relationshipDefinition: recipeMessageDef,
            parentMatrxId: recipeMatrxId,
        }) as ProcessedRecipeMessages[];
    }, [coreMessages, recipeMessages, needsReprocess]);

    console.log('Processed messages:', processedMessages);

    const { handleDragDrop } = useMessageReordering(processedMessages, () => setNeedsReprocess(true));

    // Add new message management methods
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
        recipeMessageIsLoading,
        recipeMessageLoadingState,
        deleteMessage,
        handleDragDrop,
        addMessage,
    };
}

export type UseRecipeMessagesHook = ReturnType<typeof useRecipeMessages>;
