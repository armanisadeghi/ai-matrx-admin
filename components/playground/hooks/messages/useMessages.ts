import React, { useCallback } from 'react';
import { DataBrokerDataRequired, MessageBrokerDataRequired, MessageTemplateDataOptional } from '@/types';
import { GetOrFetchSelectedRecordsPayload, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { processJoinedData, RelationshipDefinition } from '@/app/entities/hooks/relationships/utils';
import { useActiveJoinedRecords } from '@/app/entities/hooks/relationships/useActiveJoinedRecords';
import { useJoinedRecordsActiveParent } from '@/app/entities/hooks/relationships/useJoinedRecords';

const messageRelationshipDefinition: RelationshipDefinition = {
    parentEntity: {
        entityKey: 'recipe',
        referenceField: 'id',
    },
    childEntity: {
        entityKey: 'messageTemplate',
        referenceField: 'id',
    },
    joiningEntity: {
        entityKey: 'recipeMessage',
        parentField: 'recipeId',
        childField: 'messageId',
        orderPositionField: 'order',
    },
};

const brokerRelationshipDefinition: RelationshipDefinition = {
    parentEntity: {
        entityKey: 'messageTemplate',
        referenceField: 'id',
    },
    childEntity: {
        entityKey: 'dataBroker',
        referenceField: 'id',
    },
    joiningEntity: {
        entityKey: 'messageBroker',
        parentField: 'messageId',
        childField: 'brokerId',
        defaultValueField: 'defaultValue',
    },
};



export function useMessageTemplates() {
    // First relationship: Recipe -> MessageTemplate
    const {
        matchingChildRecords: messages,
        JoiningEntityRecords: recipeMessages,
        deletePkWithChild: deleteMessageById,
        deleteMatrxIdWithChild: deleteMessageByMatrxId,
    } = useJoinedRecordsActiveParent(messageRelationshipDefinition);

    // Process messages with joining data
    const processedMessages = React.useMemo(() => {
        return processJoinedData({
            childRecords: messages,
            joiningRecords: recipeMessages,
            relationshipDefinition: messageRelationshipDefinition
        });
    }, [messages, recipeMessages]) as MessageTemplateDataOptional[];

    // Second relationship: MessageTemplate -> DataBroker
    const {
        matchingChildRecords: brokers,
        JoiningEntityRecords: messageBrokers,
        childMatrxIds: brokerMatrxIds,
        childActions: brokerActions,
    } = useActiveJoinedRecords(brokerRelationshipDefinition);

    // Process brokers with joining data
    const processedBrokers = React.useMemo(() => {
        return processJoinedData({
            childRecords: brokers,
            joiningRecords: messageBrokers,
            relationshipDefinition: brokerRelationshipDefinition
        });
    }, [brokers, messageBrokers]) as DataBrokerDataRequired[];

    const dispatch = useAppDispatch();

    const fetchBrokersPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: brokerMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [brokerMatrxIds]
    );

    const fetchDependentRecords = useCallback(() => {
        if (brokerMatrxIds.length > 0) {
            dispatch(brokerActions.getOrFetchSelectedRecords(fetchBrokersPayload));
        }
    }, [dispatch, brokerActions, brokerMatrxIds, fetchBrokersPayload]);

    return {
        messages: processedMessages,  // Will include order and all other recipeMessage fields
        brokers: processedBrokers,    // Will include all messageBroker fields
        fetchDependentRecords,
        deleteMessageById,
        deleteMessageByMatrxId,
    };
}