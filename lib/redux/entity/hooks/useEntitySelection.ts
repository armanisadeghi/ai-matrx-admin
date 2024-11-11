import {useCallback, useMemo, useRef} from 'react';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { createEntitySlice } from '@/lib/redux/entity/slice';
import { SelectionState, MatrxRecordId, EntityError } from '@/lib/redux/entity/types';

export interface OperationCallbacks<T = void> {
    onSuccess?: (result: T) => void;
    onError?: (error: EntityError) => void;
}

export interface UseEntitySelectionReturn<TEntity extends EntityKeys> {
    selectedRecords: MatrxRecordId[];
    activeRecord: EntityData<TEntity> | null;
    selectionMode: 'single' | 'multiple' | 'none';
    lastSelected?: string;
    selectionSummary: {
        count: number;
        hasSelection: boolean;
        hasSingleSelection: boolean;
        hasMultipleSelection: boolean;
        mode: 'single' | 'multiple' | 'none';
    };

    // Actions
    setSelectionMode: (mode: 'single' | 'multiple' | 'none') => void;
    selectRecord: (record: EntityData<TEntity>) => void;
    deselectRecord: (record: EntityData<TEntity>) => void;
    toggleRecordSelection: (record: EntityData<TEntity>) => void;
    selectRecords: (records: EntityData<TEntity>[]) => void;
    deselectRecords: (records: EntityData<TEntity>[]) => void;
    toggleRecords: (records: EntityData<TEntity>[]) => void;
    clearSelection: () => void;

    // Helpers
    isSelected: (record: EntityData<TEntity>) => boolean;
    isActive: (record: EntityData<TEntity>) => boolean;

    // Operation Callbacks
    setOperationCallbacks: <T = void>(callbacks?: OperationCallbacks<T>) => void;
    getOperationCallbacks: <T = void>() => OperationCallbacks<T> | undefined;
    clearOperationCallbacks: () => void;
}

export const useEntitySelection = <TEntity extends EntityKeys>(
    entityKey: TEntity
): UseEntitySelectionReturn<TEntity> => {
    const dispatch = useAppDispatch();

    // Initialize selectors and actions
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const { actions } = useMemo(() => createEntitySlice(entityKey, {} as any), [entityKey]);

    // Operation callbacks ref
    const operationCallbacksRef = useRef<OperationCallbacks<any>>();

    // Use selectors for all state access
    const selectionState = useAppSelector(state => selectors.selectEntity(state).selection);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const selectionSummary = useAppSelector(selectors.selectSelectionSummary);

    // Callback Management
    const setOperationCallbacks = useCallback(<T = void>(callbacks?: OperationCallbacks<T>) => {
        operationCallbacksRef.current = callbacks;
    }, []);

    const getOperationCallbacks = useCallback(<T = void>() => {
        return operationCallbacksRef.current as OperationCallbacks<T> | undefined;
    }, []);

    const clearOperationCallbacks = useCallback(() => {
        operationCallbacksRef.current = undefined;
    }, []);

    // Selection Mode Management
    const setSelectionMode = useCallback(
        (mode: SelectionState<TEntity>['selectionMode']) => {
            dispatch(actions.setSelection({
                records: mode === 'none' ? [] : selectedRecords,
                mode,
            }));
        },
        [dispatch, actions, selectedRecords]
    );

    // Single Record Operations
    const selectRecord = useCallback(
        (record: EntityData<TEntity>) => {
            if (selectionState.selectionMode === 'single') {
                dispatch(actions.setSelection({ records: [record], mode: 'single' }));
            } else if (selectionState.selectionMode === 'multiple') {
                dispatch(actions.addToSelection(record));
            }
        },
        [dispatch, actions, selectionState.selectionMode]
    );

    const deselectRecord = useCallback(
        (record: EntityData<TEntity>) => {
            dispatch(actions.removeFromSelection(record));
        },
        [dispatch, actions]
    );

    const toggleRecordSelection = useCallback(
        (record: EntityData<TEntity>) => {
            if (selectionState.selectionMode === 'single') {
                dispatch(actions.setSelection({
                    records: selectionState.selectedRecords.length === 0 ? [record] : [],
                    mode: 'single'
                }));
            } else if (selectionState.selectionMode === 'multiple') {
                dispatch(actions.toggleSelection(record));
            }
        },
        [dispatch, actions, selectionState]
    );

    // Batch Operations
    const selectRecords = useCallback(
        (recordsToSelect: EntityData<TEntity>[]) => {
            if (selectionState.selectionMode === 'multiple') {
                dispatch(actions.batchSelection({ operation: 'add', records: recordsToSelect }));
            }
        },
        [dispatch, actions, selectionState.selectionMode]
    );

    const deselectRecords = useCallback(
        (recordsToDeselect: EntityData<TEntity>[]) => {
            dispatch(actions.batchSelection({
                operation: 'remove',
                records: recordsToDeselect
            }));
        },
        [dispatch, actions]
    );

    const toggleRecords = useCallback(
        (recordsToToggle: EntityData<TEntity>[]) => {
            if (selectionState.selectionMode === 'multiple') {
                dispatch(actions.batchSelection({
                    operation: 'toggle',
                    records: recordsToToggle
                }));
            }
        },
        [dispatch, actions, selectionState.selectionMode]
    );

    const clearSelection = useCallback(() => {
        dispatch(actions.clearSelection());
    }, [dispatch, actions]);

    // Helpers using selectors
    const isSelected = useCallback(
        (record: EntityData<TEntity>) => useAppSelector(state =>
            selectors.selectIsRecordSelected(state, record)
        ),
        [selectors]
    );

    const isActive = useCallback(
        (record: EntityData<TEntity>) => useAppSelector(state =>
            selectors.selectIsRecordActive(state, record)
        ),
        [selectors]
    );

    return {
        selectedRecords: selectionState.selectedRecords,
        activeRecord: selectionState.activeRecord,
        selectionMode: selectionState.selectionMode,
        lastSelected: selectionState.lastSelected,
        selectionSummary,
        setSelectionMode,
        selectRecord,
        deselectRecord,
        toggleRecordSelection,
        selectRecords,
        deselectRecords,
        toggleRecords,
        clearSelection,
        isSelected,
        isActive,
        // Add callback management
        setOperationCallbacks,
        getOperationCallbacks,
        clearOperationCallbacks
    };
};
