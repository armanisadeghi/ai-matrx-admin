import { useCallback } from 'react';
import { DataBrokerData, MatrxRecordId } from '@/types';
import { RelationshipProcessingHook, useRelFetchProcessing } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import { getStandardRelationship } from '@/app/entities/hooks/relationships/definitionConversionUtil';
import { ChipData } from '@/features/rich-text-editor/types/editor.types';

export interface AddBrokerPayload {
    id: string;
    name: string;
    defaultValue: string;
    dataType: DataBrokerData['dataType'];
}

export function useMessageBrokers(messageBrokerHook: RelationshipProcessingHook) {
    const {
        mapper: messageMapper,
        JoiningEntityRecords: messageBrokers,
        joiningMatrxIds: messageBrokerMatrxIds,
        childIds: dataBrokerIds,
        childMatrxIds: dataBrokerMatrxIds,
        childRecords: coreDataBrokers,
        processedChildRecords: processedDataBrokers,
        parentId: messagePkId,
        parentMatrxid: messageMatrxId,
        deleteChildAndJoin: deleteDataBroker,
        createRelatedRecords,
        isLoading: messageBrokerIsLoading,
        loadingState: messageBrokerLoadingState,
    } = messageBrokerHook;

    const addBroker = useCallback(
        async (newBrokerId: string, chipData: ChipData) => {
            const newBroker = {
                id: newBrokerId,
                name: chipData.label || 'New Broker',
                defaultValue: chipData.stringValue || '',
                dataType: 'str' as const,
            };

            const defaultValue = newBroker.defaultValue || '';
            
            return createRelatedRecords(
                {
                    child: newBroker,
                    joining: { defaultValue: defaultValue },
                }
            );
        },
        [createRelatedRecords]
    );

    return {
        messageMapper,
        messageBrokers,
        messageBrokerMatrxIds,
        dataBrokerIds,
        dataBrokerMatrxIds,
        coreDataBrokers,
        processedDataBrokers,
        messagePkId,
        messageMatrxId,
        deleteDataBroker,
        addBroker,
        messageBrokerIsLoading,
        messageBrokerLoadingState,
    };
}

export type UseMessageBrokersHook = ReturnType<typeof useMessageBrokers>;

export function useRelatedDataBrokers(messageMatrxId: MatrxRecordId) {
    const relDef = getStandardRelationship('messageBroker');
    const relationshipHook = useRelFetchProcessing(relDef, messageMatrxId);
    return useMessageBrokers(relationshipHook);
}
