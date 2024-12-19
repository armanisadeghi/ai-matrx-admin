import {useCallback} from 'react';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {getEntitySlice} from '@/lib/redux/entity/entitySlice';
import {AllEntityNameVariations, EntityKeys} from '@/types/entityTypes';
import {EntityStateField, MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {Callback, callbackManager} from '@/utils/callbackManager';
import * as React from "react";
import {makeSelectEntityNameByFormat} from "@/lib/redux/schema/globalCacheSelectors";

interface useFetchRelatedFinalParams {
    entityKey: EntityKeys;
    activeEntityRecordId?: MatrxRecordId;
    activeEntityKey?: EntityKeys;
    fieldValue?: any;
}


interface UseFetchRelatedReturn {
    records: Record<MatrxRecordId, any>;
    displayField: string;
    expandedFields: Record<string, boolean>;
    hoveredItem: string | null;
    toggleFieldExpansion: (fieldId: string) => void;
    setHoveredItem: (itemId: string | null) => void;
    truncateText: (text: string, maxLength?: number) => string;
    matrxRecordId: MatrxRecordId | null;
    individualFieldInfo: EntityStateField[] | null;
    entityPrettyName: AllEntityNameVariations;
    hasRecords: boolean;
    recordCount: number; // New field
}

export function useFetchRelatedFinal(
    {
        entityKey,
        activeEntityRecordId,
        activeEntityKey,
        fieldValue,
    }: useFetchRelatedFinalParams): UseFetchRelatedReturn {
    const dispatch = useAppDispatch();
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const selectEntityName = makeSelectEntityNameByFormat(entityKey, "pretty");
    const entityPrettyName = useAppSelector(selectEntityName);

    const matrxRecordId: MatrxRecordId = useAppSelector(state =>
        fieldValue ? selectors.selectMatrxRecordIdFromValue(state, fieldValue) : null
    );
    // console.log("------useFetchRelatedFinal with Field Value: ", fieldValue);
    //
    // console.log("matrxRecordId: ", matrxRecordId);
    // console.log("Entity Name: ", entityKey);

    const fetchOne = useCallback((recordId: MatrxRecordId, callback?: Callback) => {
        // console.log("fetchOne entity and id: ", entityKey, recordId);


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

    const {records, fieldInfo: individualFieldInfo, displayField} = useAppSelector(selectors.selectCombinedRecordsWithFieldInfo);

    // Compute both hasRecords and recordCount in a single memo
    const {hasRecords, recordCount} = React.useMemo(() => {
        const count = Object.keys(records).length;
        return {
            hasRecords: count > 0,
            recordCount: count
        };
    }, [records]);

    React.useEffect(() => {
        if (matrxRecordId) {
            const existingRecord = records[matrxRecordId];
            if (!existingRecord) {
                fetchOne(matrxRecordId);
                console.log(" useEffect Fetching One using matrxRecordId: ", matrxRecordId);
            }
        }
    }, [entityKey, matrxRecordId, fetchOne, records]);

    const [expandedFields, setExpandedFields] = React.useState<Record<MatrxRecordId, boolean>>({});
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

    // TODO: This hook needs to check for all of the relationship rules and maintain them.
    // For example, if it's one to one, it can't allow create operations.
    // Regardless, if there are any create operations, it needs to maintain the relationship.

    return {
        records,
        displayField,
        expandedFields,
        hoveredItem,
        toggleFieldExpansion,
        setHoveredItem,
        truncateText,
        matrxRecordId,
        individualFieldInfo,
        entityPrettyName,
        hasRecords,
        recordCount,
    };
}
