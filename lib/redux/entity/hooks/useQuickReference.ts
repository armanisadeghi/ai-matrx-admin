import * as React from 'react';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {useAppDispatch, useAppSelector, useAppStore} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
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
import {Callback, callbackManager} from "@/utils/callbackManager";
import { getEntitySlice } from '../entitySlice';

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
    toggleSelectionMode: () => void;
    clearSelection: () => void;

    // Record Operations
    createRecord: (
        data: Partial<EntityData<TEntity>>,
        callbacks?: Callback,
    ) => void;

    updateRecord: (
        matrxRecordId: MatrxRecordId,
        data: Partial<EntityData<TEntity>>,
        callbacks?: Callback,
    ) => void;

    deleteRecord: (
        matrxRecordId: MatrxRecordId,
        callbacks?: Callback,
    ) => void;

    // UI States
    loadingState: LoadingState | null;
    errorState: EntityError | null;
    isValidated: boolean;
    getRecordIdByRecord: (record: EntityData<TEntity>) => MatrxRecordId | null;
    getDisplayValue: (record: EntityData<TEntity>) => string;

    handleSingleSelection: (recordKey: MatrxRecordId) => void;
    handleRecordSelect: (recordKey: MatrxRecordId) => void;

    flexFormField: any;
    getCardClassName: (recordKey: MatrxRecordId) => string;

}

export function useQuickReference<TEntity extends EntityKeys>(
    entityKey: TEntity
): UseQuickReferenceReturn<TEntity> {
    const dispatch = useAppDispatch();
    const store = useAppStore();

    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);

    const selection = useEntitySelection(entityKey);

    // State Selectors
    const entityDisplayName = useAppSelector(selectors.selectEntityDisplayName);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);
    const flexFormField = useAppSelector(selectors.selectFlexFormField);
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

    const createRecord = React.useCallback((data: Partial<EntityData<TEntity>>, callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;

        dispatch(
            actions.createRecord({
                data,
                callbackId,
            })
        );
    }, [actions, dispatch]);

    const updateRecord = React.useCallback((matrxRecordId: MatrxRecordId, data: Partial<EntityData<TEntity>>, callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;

        dispatch(
            actions.updateRecord({
                matrxRecordId,
                data,
                callbackId,
            })
        );
    }, [actions, dispatch]);

    const deleteRecord = React.useCallback((matrxRecordId: MatrxRecordId, callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;

        dispatch(
            actions.deleteRecord({
                matrxRecordId,
                callbackId,
            })
        );
    }, [actions, dispatch]);

    const handleSelection = React.useCallback((recordKey: MatrxRecordId) => {
        selection.handleSelection(recordKey);
    }, [selection]);

    const getDisplayValue = React.useCallback((record: EntityData<TEntity>) => {
        const displayField = fieldInfo.find(field => field.isDisplayField);
        if (!displayField) return 'Unnamed Record';
        return record[displayField.name] || 'Unnamed Record';
    }, [fieldInfo]);

    React.useEffect(() => {
        const handleModifierKey = (e: KeyboardEvent) => {
            const isModifierPressed = e.ctrlKey || e.metaKey;
            if (isModifierPressed && selection.selectionMode !== 'multiple') {
                selection.toggleSelectionMode();
            }
        };

        window.addEventListener('keydown', handleModifierKey);
        return () => window.removeEventListener('keydown', handleModifierKey);
    }, [selection]);

    const handleRecordSelect = React.useCallback((recordKey: MatrxRecordId) => {
        dispatch(actions.setActiveRecord(recordKey));
        if (selection.selectionMode === 'multiple') {
            selection.handleToggleSelection(recordKey);
        } else {
            selection.handleSingleSelection(recordKey);
        }
    }, [selection.selectionMode, actions, dispatch]);

    const getCardClassName = React.useCallback((recordKey: MatrxRecordId) => {
        const baseClasses = "cursor-pointer transition-colors hover:bg-accent/50";
        const isMultiple = selection.selectionMode === 'multiple';
        return `${baseClasses} ${
            selection.isSelected(recordKey)
            ? `border-primary ${isMultiple ? 'bg-accent' : 'border-2 bg-accent'}`
            : 'border-transparent'
        }`;
    }, [selection]);


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
        handleRecordSelect,

        flexFormField,
        getCardClassName,

    };
}
