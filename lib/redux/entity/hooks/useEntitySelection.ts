import * as React from 'react';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {createEntitySlice} from '@/lib/redux/entity/slice';
import {SelectionMode, MatrxRecordId} from '@/lib/redux/entity/types';

export interface UseEntitySelectionReturn<TEntity extends EntityKeys> {
    // Current Selection State
    selectedRecordIds: MatrxRecordId[];
    selectedRecords: EntityData<TEntity>[];
    activeRecordId: MatrxRecordId | null;
    activeRecord: EntityData<TEntity> | null;
    selectionMode: SelectionMode;

    // Selection Status
    summary: {
        count: number;
        hasSelection: boolean;
        hasSingleSelection: boolean;
        hasMultipleSelection: boolean;
        mode: SelectionMode;
        activeRecord: MatrxRecordId | null;
    };

    // Core Selection Operations
    handleSelection: (recordKey: MatrxRecordId) => void;
    handleToggleSelection: (recordKey: MatrxRecordId) => void;

    // Selection Checks
    isSelected: (recordKey: MatrxRecordId) => boolean;
    isActive: (recordKey: MatrxRecordId) => boolean;

    // Mode Management
    setSelectionMode: (mode: SelectionMode) => void;
    toggleSelectionMode: () => void;

    // Additional Operations
    clearSelection: () => void;
    handleSingleSelection: (recordKey: MatrxRecordId) => void;
}

export const useEntitySelection = <TEntity extends EntityKeys>(
    entityKey: TEntity
): UseEntitySelectionReturn<TEntity> => {
    const dispatch = useAppDispatch();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const { actions } = React.useMemo(() => createEntitySlice(entityKey, {} as any), [entityKey]);

    // Core Selection State
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const selectionMode = useAppSelector(selectors.selectSelectionMode);
    const summary = useAppSelector(selectors.selectSelectionSummary);

    // Selection Checks
    const isSelected = React.useCallback((recordKey: MatrxRecordId) =>
        selectedRecordIds.includes(recordKey), [selectedRecordIds]);

    const isActive = React.useCallback((recordKey: MatrxRecordId) =>
        activeRecordId === recordKey, [activeRecordId]);

    // Core Selection Operations
    const handleSelection = React.useCallback((recordKey: MatrxRecordId) => {
        dispatch(actions.addToSelection(recordKey));
    }, [dispatch, actions]);

    const handleToggleSelection = React.useCallback((recordKey: MatrxRecordId) => {
        if (isSelected(recordKey)) {
            dispatch(actions.removeFromSelection(recordKey));
        } else {
            dispatch(actions.addToSelection(recordKey));
        }
    }, [dispatch, actions, isSelected]);

    // Mode Management
    const setSelectionMode = React.useCallback((mode: SelectionMode) => {
        dispatch(actions.setSelectionMode(mode));
    }, [dispatch, actions]);

    const toggleSelectionMode = React.useCallback(() => {
        dispatch(actions.setToggleSelectionMode());
    }, [dispatch, actions]);

    // Additional Operations
    const clearSelection = React.useCallback(() => {
        dispatch(actions.clearSelection());
    }, [dispatch, actions]);

    const handleSingleSelection = React.useCallback((recordKey: MatrxRecordId) => {
        dispatch(actions.setSwitchSelectedRecord(recordKey));
    }, [dispatch, actions]);


    React.useEffect(() => {
        if (selectedRecordIds.length > 0) {
            dispatch(actions.getOrFetchSelectedRecords(selectedRecordIds));
        }
        console.log('Use Effect in useEntitySelection Triggered with: ', selectedRecordIds);

    }, [selectedRecordIds]);

    return {
        // State
        selectedRecordIds,
        selectedRecords,
        activeRecordId,
        activeRecord,
        selectionMode,
        summary,

        // Core Operations
        handleSelection,
        handleToggleSelection,

        // Checks
        isSelected,
        isActive,

        // Mode Management
        setSelectionMode,
        toggleSelectionMode,

        // Additional Operations
        clearSelection,
        handleSingleSelection,
    };
};
