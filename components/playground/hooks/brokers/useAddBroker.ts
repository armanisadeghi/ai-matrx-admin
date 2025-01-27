'use client';

import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';
import { useRelationshipCreate, useRelationshipCreateManualId } from '@/app/entities/hooks/unsaved-records/useDirectCreate';
import { useAppStore, useEntityTools } from '@/lib/redux';
import { toMatrxIdFromValue, toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { DataInputComponentData, MatrxRecordId, MessageTemplateData } from '@/types';
import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';

type DataBrokerDataType = 'float' | 'str' | 'bool' | 'dict' | 'int' | 'list' | 'url';

type MessageBrokerData = {
    id: string;
    messageId: string;
    brokerId: string;
} & {
    dataInputComponentReference?: DataInputComponentData[];
    defaultValue?: string;
    defaultComponent?: string;
    dataBrokerReference?: DataBrokerData[];
    messageTemplateReference?: MessageTemplateData[];
};

type DataBrokerData = {
    id: string;
    name: string;
} & {
    dataType?: DataBrokerDataType;
    dataInputComponentReference?: DataInputComponentData[];
    defaultValue?: string;
    defaultComponent?: string;
    messageBrokerInverse?: MessageBrokerData[];
};

export interface AddBrokerPayload {
    id: string;
    name: string;
    defaultValue: string;
    dataType: DataBrokerDataType;
}

export function useAddBroker(parentRecordId: MatrxRecordId) {
    const store = useAppStore();
    const parentEntity = 'messageTemplate';
    const joiningEntity = 'messageBroker';
    const childEntity = 'dataBroker';
    const ChildEntityTwo = 'dataInputComponent';
    const { selectors: parentSelectors } = useEntityTools(parentEntity);
    const parentId = useMemo(() => toPkValue(parentRecordId), [parentRecordId]);

    const createRelationship = useRelationshipCreateManualId(joiningEntity, childEntity, parentId);

    const addBroker = useCallback(
        (payload: AddBrokerPayload) => {
            const rawPayload = {
                joining: { defaultValue: payload.defaultValue },
                child: { id: payload.id, name: payload.name, defaultValue: payload.defaultValue, dataType: payload.dataType },
            };

            console.log('useAddBroker with payload:', rawPayload);

            return createRelationship(rawPayload);
        },
        [createRelationship]
    );

    return { addBroker };
}

export function useUpdateBroker() {
    const dispatch = useAppDispatch();
    const { store, actions, selectors } = useEntityTools("dataBroker");
    const { updateRecord } = useUpdateRecord('dataBroker');

    const getRecordId = useMemo(() => (id: string) => toMatrxIdFromValue('dataBroker', id), []);

    const updateBrokerFields = useCallback(
        (id: string, fields: Partial<Omit<DataBrokerData, 'id'>>) => {
            Object.entries(fields).forEach(([field, value]) => {
                dispatch(
                    actions.updateUnsavedField({
                        recordId: getRecordId(id),
                        field,
                        value,
                    })
                );
            });
        },
        [actions, dispatch, getRecordId]
    );

    const updateBrokerName = useCallback(
        (id: string, name: string) => {
            updateBrokerFields(id, { name });
        },
        [updateBrokerFields]
    );

    const updateBrokerDefaultValue = useCallback(
        (id: string, defaultValue: string) => {
            updateBrokerFields(id, { defaultValue });
        },
        [updateBrokerFields]
    );

    const updateBrokerDataType = useCallback(
        (id: string, dataType: DataBrokerDataType) => {
            updateBrokerFields(id, { dataType });
        },
        [updateBrokerFields]
    );

    const saveBroker = useCallback(
        (id: string) => {
            updateRecord(getRecordId(id));
        },
        [updateRecord, getRecordId]
    );

    return {
        updateBrokerFields,
        updateBrokerName,
        updateBrokerDefaultValue,
        updateBrokerDataType,
        saveBroker,
    };
}
