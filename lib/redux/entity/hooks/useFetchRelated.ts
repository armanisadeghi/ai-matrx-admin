import {useCallback, useState} from 'react';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {getEntitySlice} from '@/lib/redux/entity/entitySlice';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {AllEntityNameVariations, EntityData, EntityKeys} from '@/types/entityTypes';
import {EntityStateField, MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {Callback, callbackManager} from '@/utils/callbackManager';
import * as React from "react";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import {makeSelectEntityNameByFormat} from "@/lib/redux/schema/globalCacheSelectors";

interface UseFetchRelatedParams {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    formData: EntityData<EntityKeys>;
    activeEntityKey?: EntityKeys;
}

export type ViewModeOption = 'view' | 'edit' | 'create';

export interface EntityBaseFieldProps {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    value: any;
    onChange: (value: any) => void;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful' |  'feedback' | 'error';
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    variant?: MatrxVariant;
    labelPosition?: 'default' | 'left' | 'right' | 'top' | 'bottom';
    disabled?: boolean;
    floatingLabel?: boolean;
    className?: string;
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
    const selectEntityName = makeSelectEntityNameByFormat(entityKey, "pretty");
    const entityPrettyName = useAppSelector(selectEntityName);

    const [viewMode, setViewMode] = useState<ViewModeOption>('view');

    console.log("useFetchRelated: ", entityKey, dynamicFieldInfo, formData, activeEntityKey);

    const fieldValue = React.useMemo(() => {
        if (!formData || !dynamicFieldInfo?.entityName) {
            return null;
        }
        return formData[dynamicFieldInfo.entityName];
    }, [formData, dynamicFieldInfo]);

    console.log("useFetchRelated: fieldValue: ", fieldValue);

    const matrxRecordId: MatrxRecordId = useAppSelector(state =>
        fieldValue ? selectors.selectMatrxRecordIdFromValue(state, fieldValue) : null
    );

    console.log("useFetchRelated: matrxRecordId: ", matrxRecordId);

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

    const {records, fieldInfo: individualFieldInfo, displayField} = useAppSelector(selectors.selectCombinedRecordsWithFieldInfo);

    console.log("useFetchRelated: records: ", records);
    console.log("useFetchRelated: individualFieldInfo: ", individualFieldInfo);
    console.log("useFetchRelated: displayField: ", displayField);
    console.log("useFetchRelated: entityPrettyName: ", entityPrettyName);

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
    };
}
