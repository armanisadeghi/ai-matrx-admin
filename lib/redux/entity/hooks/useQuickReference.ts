import * as React from 'react';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {useAppDispatch, useAppSelector, useAppStore} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {createEntitySlice} from '@/lib/redux/entity/slice';
import {
    useEntitySelection,
} from '@/lib/redux/entity/hooks/useEntitySelection';
import {
    LoadingState,
    EntityError,
    QuickReferenceRecord,
    QuickReferenceState,
    MatrxRecordId,
    EntityStateField,
    SelectionSummary,
    SelectionMode,
} from '@/lib/redux/entity/types';
import {entityDefaultSettings} from "@/lib/redux/entity/defaults";
import {OperationCallbacks} from "@/lib/redux/entity/actions";

export interface UseQuickReferenceReturn<TEntity extends EntityKeys> {
    // Metadata
    entityDisplayName: string;
    fieldInfo: EntityStateField[];

    // Quick Reference Data
    quickReferenceRecords: QuickReferenceRecord[];
    quickReferenceState: QuickReferenceState;

    // Selection Management
    selectedRecordIds: MatrxRecordId[];
    selectedRecords: EntityData<TEntity>[];
    activeRecord: EntityData<TEntity> | null;
    selectionMode: SelectionMode;
    summary: SelectionSummary;

    // Selection Utilities
    isSelected: (recordKey: MatrxRecordId) => boolean;
    isActive: (recordKey: MatrxRecordId) => boolean;
    handleSelection: (recordKey: MatrxRecordId) => void;
    handleMultiSelection: (recordKey: MatrxRecordId) => void;
    toggleSelectionMode: () => void;
    clearSelection: () => void;

    // Record Operations
    createRecord: (
        data: Partial<EntityData<TEntity>>,
        callbacks?: OperationCallbacks<EntityData<TEntity>>
    ) => void;

    updateRecord: (
        matrxRecordId: MatrxRecordId,
        data: Partial<EntityData<TEntity>>,
        callbacks?: OperationCallbacks<EntityData<TEntity>>
    ) => void;

    deleteRecord: (
        matrxRecordId: MatrxRecordId,
        callbacks?: OperationCallbacks
    ) => void;

    // UI States
    loadingState: LoadingState | null;
    errorState: EntityError | null;
    isValidated: boolean;
    getRecordIdByRecord: (record: EntityData<TEntity>) => MatrxRecordId | null;
    getDisplayValue: (record: EntityData<TEntity>) => string;

    handleSingleSelection: (recordKey: MatrxRecordId) => void;
}

export function useQuickReference<TEntity extends EntityKeys>(
    entityKey: TEntity
): UseQuickReferenceReturn<TEntity> {
    const dispatch = useAppDispatch();
    const store = useAppStore();

    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => createEntitySlice(entityKey, {} as any), [entityKey]);

    const selection = useEntitySelection(entityKey);

    // State Selectors
    const entityDisplayName = useAppSelector(selectors.selectEntityDisplayName);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);
    const quickReferenceRecords = useAppSelector(selectors.selectQuickReference);

    const quickReferenceState = useAppSelector(selectors.selectQuickReferenceState);
    const isQuickReferenceFetchComplete = useAppSelector(selectors.selectIsQuickReferenceFetchComplete);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const errorState = useAppSelector(selectors.selectErrorState);
    const isValidated = useAppSelector(selectors.selectIsValidated);


    const getRecordIdByRecord = React.useCallback(
        (record: EntityData<TEntity>): MatrxRecordId | null => {
            const state = store.getState();
            return selectors.selectRecordIdByRecord(state, record);
        },
        [selectors, store]
    );

    React.useEffect(() => {
        if (!isQuickReferenceFetchComplete) {
            dispatch(actions.fetchQuickReference({
                maxRecords: entityDefaultSettings.maxQuickReferenceRecords
            }));
        }
    }, [entityKey]);

    const createRecord = React.useCallback((
        data: Partial<EntityData<TEntity>>,
        callbacks?: OperationCallbacks<EntityData<TEntity>>
    ) => {
        dispatch(actions.createRecord({ data, ...callbacks }));
    }, [dispatch, actions]);

    const updateRecord = React.useCallback((
        matrxRecordId: MatrxRecordId,
        data: Partial<EntityData<TEntity>>,
        callbacks?: OperationCallbacks<EntityData<TEntity>>
    ) => {
        dispatch(actions.updateRecord({ matrxRecordId, data, ...callbacks }));
    }, [dispatch, actions]);

    const deleteRecord = React.useCallback((
        matrxRecordId: MatrxRecordId,
        callbacks?: OperationCallbacks
    ) => {
        dispatch(actions.deleteRecord({
            matrxRecordId,
            ...callbacks
        }));
    }, [dispatch, actions]);

    const handleSelection = React.useCallback((recordKey: MatrxRecordId) => {
        selection.handleSelection(recordKey);
    }, [selection]);

    const handleMultiSelection = React.useCallback((recordKey: MatrxRecordId) => {
        selection.handleToggleSelection(recordKey);
    }, [selection]);

    const getDisplayValue = React.useCallback((record: EntityData<TEntity>) => {
        const displayField = fieldInfo.find(field => field.isDisplayField);
        if (!displayField) return 'Unnamed Record';
        return record[displayField.name] || 'Unnamed Record';
    }, [fieldInfo]);

    return {
        // Metadata
        entityDisplayName,
        fieldInfo,

        // Quick Reference Data
        quickReferenceRecords,
        quickReferenceState,

        // Selection Management (from useEntitySelection)
        selectedRecordIds: selection.selectedRecordIds,
        selectedRecords: selection.selectedRecords,
        activeRecord: selection.activeRecord,
        selectionMode: selection.selectionMode,
        summary: selection.summary,

        // Selection Utilities
        isSelected: selection.isSelected,
        isActive: selection.isActive,
        handleSelection,
        handleMultiSelection,
        toggleSelectionMode: selection.toggleSelectionMode,
        clearSelection: selection.clearSelection,
        handleSingleSelection: selection.handleSingleSelection,

        // Record Operations
        createRecord,
        updateRecord,
        deleteRecord,

        // UI States
        loadingState,
        errorState,
        isValidated,
        getRecordIdByRecord,
        getDisplayValue,
    };
}
