import * as React from 'react';
import { FetchMode, GetOrFetchSelectedRecordsPayload, getRecordIdByRecord, useEntityTools } from '@/lib/redux';
import { useAppSelector } from '@/lib/redux/hooks';
import { MatrxRecordId, SelectionMode } from '@/lib/redux/entity/types/stateTypes';
import { EntityKeys, EntityData } from '@/types/entityTypes';

const useAreArraysEqual = (a: MatrxRecordId[], b: MatrxRecordId[]) => {
    return React.useMemo(() => a.length === b.length && a.every((val, idx) => val === b[idx]), [a, b]);
};

const useHasOnlyNewRecords = (selectedRecordIds: MatrxRecordId[]) => {
    return React.useMemo(() => selectedRecordIds.every((recordId) => recordId.startsWith('new-record-')), [selectedRecordIds]);
};

export function useQuickRef<TEntity extends EntityKeys>(entityKey: TEntity) {
    const { store, actions, selectors, dispatch } = useEntityTools(entityKey);
    const [fetchMode, setFetchMode] = React.useState<FetchMode>('native');
    const [lastProcessedIds, setLastProcessedIds] = React.useState<MatrxRecordId[]>([]);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const selectSelectedRecordsWithKey = useAppSelector(selectors.selectSelectedRecordsWithKey);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const selectionMode = useAppSelector(selectors.selectSelectionMode);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const entityDisplayName = useAppSelector(selectors.selectEntityDisplayName);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);
    const flexFormField = useAppSelector(selectors.selectFlexFormField);
    const quickReferenceRecords = useAppSelector(selectors.selectQuickReference);
    const quickReferenceState = useAppSelector(selectors.selectQuickReferenceState);
    const errorState = useAppSelector(selectors.selectErrorState);
    const isValidated = useAppSelector(selectors.selectIsValidated);
    const summary = useAppSelector(selectors.selectSelectionSummary);
    const hasOnlyNewRecords = useHasOnlyNewRecords(selectedRecordIds);
    const isEqual = useAreArraysEqual(lastProcessedIds, selectedRecordIds);

    const payload: GetOrFetchSelectedRecordsPayload = React.useMemo(() => {
        return {
            matrxRecordIds: selectedRecordIds,
            fetchMode,
        };
    }, [selectedRecordIds, fetchMode]);

    React.useEffect(() => {
        if (selectedRecordIds.length === 0 || hasOnlyNewRecords || isEqual) {
            return;
        }
        dispatch(actions.getOrFetchSelectedRecords(payload));
        setLastProcessedIds(selectedRecordIds);
    }, [selectedRecordIds, hasOnlyNewRecords, isEqual, payload, dispatch, actions]);

    const isSelected = React.useCallback((recordKey: MatrxRecordId) => selectedRecordIds.includes(recordKey), [selectedRecordIds]);

    const isActive = React.useCallback((recordKey: MatrxRecordId) => activeRecordId === recordKey, [activeRecordId]);

    const handleAddToSelection = React.useCallback(
        (recordKey: MatrxRecordId) => {
            dispatch(actions.addToSelection(recordKey));
        },
        [dispatch, actions]
    );

    const getRecordId = React.useCallback(
        (record: EntityData<TEntity>) => {
            const entityState = useAppSelector(selectors.selectEntity);
            return getRecordIdByRecord(entityState, record);
        },
        [selectors]
    );

    const handleToggleSelection = React.useCallback(
        (recordKey: MatrxRecordId) => {
            if (isSelected(recordKey)) {
                dispatch(actions.removeFromSelection(recordKey));
            } else {
                dispatch(actions.addToSelection(recordKey));
            }
        },
        [dispatch, actions, isSelected]
    );

    const getDisplayValue = React.useCallback(
        (record: EntityData<TEntity>) => {
            const displayField = fieldInfo.find((field) => field.isDisplayField);
            return displayField ? record[displayField.name] || 'Unnamed Record' : 'Unnamed Record';
        },
        [fieldInfo]
    );

    const handleSingleSelection = React.useCallback((recordKey: MatrxRecordId) => dispatch(actions.setSwitchSelectedRecord(recordKey)), [dispatch, actions]);

    const setSelectionMode = React.useCallback((mode: SelectionMode) => dispatch(actions.setSelectionMode(mode)), [dispatch, actions]);

    const toggleSelectionMode = React.useCallback(() => dispatch(actions.setToggleSelectionMode()), [dispatch, actions]);

    const clearSelection = React.useCallback(() => dispatch(actions.clearSelection()), [dispatch, actions]);

    const handleRecordSelect = React.useCallback(
        (recordKey: MatrxRecordId) => {
            if (selectionMode === 'multiple') {
                handleToggleSelection(recordKey);
            } else {
                handleSingleSelection(recordKey);
            }
            dispatch(actions.setActiveRecord(recordKey));
        },
        [selectionMode, handleToggleSelection, handleSingleSelection, dispatch, actions]
    );

    const getCardClassName = React.useCallback(
        (recordKey: MatrxRecordId) => {
            const baseClasses = 'cursor-pointer transition-colors hover:bg-accent/50';
            const isMultiple = selectionMode === 'multiple';
            return `${baseClasses} ${isSelected(recordKey) ? `border-primary ${isMultiple ? 'bg-accent' : 'border-2 bg-accent'}` : 'border-transparent'}`;
        },
        [isSelected, selectionMode]
    );

    return React.useMemo(
        () => ({
            entityDisplayName,
            fieldInfo,
            quickReferenceRecords,
            quickReferenceState,
            selectedRecordIds,
            selectedRecords,
            activeRecordId,
            activeRecord,
            selectionMode,
            clearSelection,
            setSelectionMode,
            toggleSelectionMode,
            summary,
            handleAddToSelection,
            isSelected,
            isActive,
            handleSingleSelection,
            fetchMode,
            setFetchMode,
            loadingState,
            errorState,
            isValidated,
            getRecordIdByRecord,
            getDisplayValue,
            handleRecordSelect,
            flexFormField,
            getCardClassName,
            handleToggleSelection,
            getRecordId,
            selectSelectedRecordsWithKey,
        }),
        [
            entityDisplayName,
            fieldInfo,
            quickReferenceRecords,
            quickReferenceState,
            selectedRecordIds,
            selectedRecords,
            activeRecordId,
            activeRecord,
            selectionMode,
            setSelectionMode,
            clearSelection,
            toggleSelectionMode,
            summary,
            handleAddToSelection,
            isSelected,
            isActive,
            handleSingleSelection,
            fetchMode,
            loadingState,
            errorState,
            isValidated,
            getRecordIdByRecord,
            getDisplayValue,
            handleRecordSelect,
            flexFormField,
            getCardClassName,
            handleToggleSelection,
            getRecordId,
            selectSelectedRecordsWithKey,
        ]
    );
}

export type useQuickRefReturn = ReturnType<typeof useQuickRef>;
