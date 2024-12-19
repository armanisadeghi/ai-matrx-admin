import * as React from 'react';
import {FetchMode, getEntitySlice, getOrFetchSelectedRecordsPayload} from '@/lib/redux';
import {useAppDispatch, useAppSelector, useAppStore} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {MatrxRecordId, SelectionMode} from '@/lib/redux/entity/types/stateTypes';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import { useQuickReferenceFetch } from './useQuickReferenceFetch';
import { useSelectedRecordsProcessor } from './useSelectedRecordsProcessor';

export function useQuickRef<TEntity extends EntityKeys>(entityKey: TEntity) {
    const dispatch = useAppDispatch();
    const store = useAppStore();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const [fetchMode, setFetchMode] = React.useState<FetchMode>("native");
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const selectionMode = useAppSelector(selectors.selectSelectionMode);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const entityDisplayName = useAppSelector(selectors.selectEntityDisplayName);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);
    const flexFormField = useAppSelector(selectors.selectFlexFormField);
    const quickReferenceRecords = useAppSelector(selectors.selectQuickReference);
    const quickReferenceState = useAppSelector(selectors.selectQuickReferenceState);
    const isQuickReferenceFetchComplete = useAppSelector(selectors.selectIsQuickReferenceFetchComplete);
    const errorState = useAppSelector(selectors.selectErrorState);
    const isValidated = useAppSelector(selectors.selectIsValidated);
    const summary = useAppSelector(selectors.selectSelectionSummary);

    useQuickReferenceFetch(
        entityKey,
        loadingState,
        isQuickReferenceFetchComplete,
        dispatch,
        actions
    );

    useSelectedRecordsProcessor(
        selectedRecordIds,
        loadingState,
        dispatch,
        actions,
        fetchMode
    );

    // Rest of your existing callbacks...
    const isSelected = React.useCallback(
        (recordId: MatrxRecordId) => selectors.selectIsRecordSelected(store.getState(), recordId),
        [selectors, store]
    );

    const isActive = React.useCallback(
        (recordId: MatrxRecordId) => selectors.selectIsRecordActive(store.getState(), recordId),
        [selectors, store]
    );

    const getRecordIdByRecord = React.useCallback(
        (record: EntityData<TEntity>): MatrxRecordId | null =>
            selectors.selectRecordIdByRecord(store.getState(), record),
        [selectors, store]
    );

    const getDisplayValue = React.useCallback((record: EntityData<TEntity>) => {
        const displayField = fieldInfo.find(field => field.isDisplayField);
        return displayField ? (record[displayField.name] || 'Unnamed Record') : 'Unnamed Record';
    }, [fieldInfo]);

    // Action dispatchers
    const handleAddToSelection = React.useCallback(
        (recordKey: MatrxRecordId) => dispatch(actions.addToSelection(recordKey)),
        [dispatch, actions]
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

    const handleSingleSelection = React.useCallback(
        (recordKey: MatrxRecordId) => dispatch(actions.setSwitchSelectedRecord(recordKey)),
        [dispatch, actions]
    );

    const setSelectionMode = React.useCallback(
        (mode: SelectionMode) => dispatch(actions.setSelectionMode(mode)),
        [dispatch, actions]
    );

    const toggleSelectionMode = React.useCallback(
        () => dispatch(actions.setToggleSelectionMode()),
        [dispatch, actions]
    );

    const clearSelection = React.useCallback(
        () => dispatch(actions.clearSelection()),
        [dispatch, actions]
    );

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
            const baseClasses = "cursor-pointer transition-colors hover:bg-accent/50";
            const isMultiple = selectionMode === 'multiple';
            return `${baseClasses} ${
                isSelected(recordKey)
                    ? `border-primary ${isMultiple ? 'bg-accent' : 'border-2 bg-accent'}`
                    : 'border-transparent'
            }`;
        },
        [isSelected, selectionMode]
    );

    // Memoized return object
    return React.useMemo(() => ({
        entityDisplayName,
        fieldInfo,
        quickReferenceRecords,
        quickReferenceState,
        activeRecordId,
        selectedRecordIds,
        selectedRecords,
        activeRecord,
        selectionMode,
        setSelectionMode,
        handleToggleSelection,
        toggleSelectionMode,
        clearSelection,
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
    }), [
        entityDisplayName,
        fieldInfo,
        quickReferenceRecords,
        quickReferenceState,
        activeRecordId,
        selectedRecordIds,
        selectedRecords,
        activeRecord,
        selectionMode,
        setSelectionMode,
        handleToggleSelection,
        toggleSelectionMode,
        clearSelection,
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
    ]);
}

export type useQuickRefReturn = ReturnType<typeof useQuickRef>;