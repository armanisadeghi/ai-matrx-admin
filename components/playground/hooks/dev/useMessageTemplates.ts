import React, { useCallback } from 'react';
import { DataBrokerDataRequired, MessageBrokerDataRequired, MessageTemplateDataOptional } from '@/types';
import { GetOrFetchSelectedRecordsPayload, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { useRecipe } from './useRecipe';

export function useMessageTemplates() {
    const dispatch = useAppDispatch();

    const messageBrokerEntity = useEntityTools('messageBroker');
    const dataBrokerEntity = useEntityTools('dataBroker');
    const messageTemplateEntity = useEntityTools('messageTemplate');
    const recipeMessageEntity = useEntityTools('recipeMessage');

    const { recipeMessageRecords, matchingMessages, matchingMessageIds, aiAgentRecords, activeRecipeFieldId } = useRecipe();

    const orderedMessages = React.useMemo(() => {
        if (!recipeMessageRecords?.length || !matchingMessages?.length) {
            return [];
        }

        return recipeMessageRecords
            .sort((a, b) => a.order - b.order)
            .map((recipeMessage) => {
                const message = matchingMessages.find((m) => m.id === recipeMessage.messageId);
                if (!message) return null;

                return {
                    id: message.id,
                    role: message.role,
                    type: message.type,
                    content: message.content,
                };
            })
            .filter(Boolean) as MessageTemplateDataOptional[];
    }, [recipeMessageRecords, matchingMessages]);

    // Message Brokers and Data Brokers
    const messageBrokers = useAppSelector((state) => messageBrokerEntity.selectors.selectRecordsByFieldValueHelper(state,'messageId', matchingMessageIds)) as MessageBrokerDataRequired[];

    const matchingBrokerIds = React.useMemo(
        () => messageBrokers.filter((broker) => broker?.brokerId != null).map((broker) => broker.brokerId),
        [messageBrokers]
    );
    const brokerMatrxIds = useAppSelector((state) => dataBrokerEntity.selectors.selectMatrxRecordIdsBySimpleKeys(state, matchingBrokerIds));
    const matchingBrokers = useAppSelector((state) => dataBrokerEntity.selectors.selectRecordsByKeys(state, brokerMatrxIds)) as DataBrokerDataRequired[];

    const fetchBrokersPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: brokerMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [brokerMatrxIds]
    );

    const fetchDependentRecords = useCallback(() => {
        if (brokerMatrxIds.length > 0) {
            dispatch(dataBrokerEntity.actions.getOrFetchSelectedRecords(fetchBrokersPayload));
        }
    }, [dispatch, dataBrokerEntity.actions, brokerMatrxIds, fetchBrokersPayload]);


    return {
        messages: orderedMessages,
        brokers: matchingBrokers,
        fetchDependentRecords,
        activeRecipeFieldId,
    };
}
