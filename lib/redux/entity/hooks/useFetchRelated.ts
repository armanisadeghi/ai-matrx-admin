import {useCallback, useEffect, useMemo, useState} from 'react';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {getEntitySlice} from '@/lib/redux/entity/entitySlice';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {EntityData, EntityKeys} from '@/types/entityTypes';
import {EntityStateField, MatrxRecordId} from '@/lib/redux/entity/types';
import {Callback, callbackManager} from '@/utils/callbackManager';
import * as React from "react";

interface UseFetchRelatedParams {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    formData: EntityData<EntityKeys>;
    activeEntityKey?: EntityKeys;
}

interface UseFetchRelatedReturn {
    records: Record<string, any>;
    fieldInfo: any[];
    displayField: string;
    expandedFields: Record<string, boolean>;
    hoveredItem: string | null;
    toggleFieldExpansion: (fieldId: string) => void;
    setHoveredItem: (itemId: string | null) => void;
    truncateText: (text: string, maxLength?: number) => string;
}

export function useFetchRelated(
    {
        entityKey,
        dynamicFieldInfo,
        formData,
        activeEntityKey,
    }: UseFetchRelatedParams): UseFetchRelatedReturn {
    const quickReference = useQuickReference(entityKey);
    const dispatch = useAppDispatch();
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);

    const fieldValue = React.useMemo(() => {
        if (!formData || !dynamicFieldInfo?.entityName) {
            return null;
        }
        return formData[dynamicFieldInfo.entityName];
    }, [formData, dynamicFieldInfo]);

    const matrxRecordId = useAppSelector(state =>
        fieldValue ? selectors.selectMatrxRecordIdFromValue(state, fieldValue) : null
    );

    const fetchOne = useCallback((recordId: MatrxRecordId, callback?: Callback) => {
        if (callback) {
            const callbackId = callbackManager.register(callback);
            dispatch(
                actions.fetchOne({
                    matrxRecordId: recordId,
                    callbackId,
                })
            );
        } else {
            dispatch(
                actions.fetchOne({
                    matrxRecordId: recordId
                })
            );
        }
    }, [dispatch, actions]);

    const {records, fieldInfo, displayField} = useAppSelector(selectors.selectCombinedRecordsWithFieldInfo);

    React.useEffect(() => {
        if (matrxRecordId) {
            const existingRecord = records[matrxRecordId];
            if (!existingRecord) {
                fetchOne(matrxRecordId);
                console.log(" useEffect Fetching One using matrxRecordId: ", matrxRecordId);
            }
        }
    }, [entityKey, matrxRecordId, fetchOne, records]);

    const [expandedFields, setExpandedFields] = React.useState<Record<string, boolean>>({});
    const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);

    const toggleFieldExpansion = (fieldId: string) => {
        setExpandedFields(prev => ({
            ...prev,
            [fieldId]: !prev[fieldId]
        }));
    };

    const truncateText = (text: string, maxLength: number = 100) => {
        if (!text || text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    return {
        records,
        fieldInfo,
        displayField,
        expandedFields,
        hoveredItem,
        toggleFieldExpansion,
        setHoveredItem,
        truncateText,
    };
}
