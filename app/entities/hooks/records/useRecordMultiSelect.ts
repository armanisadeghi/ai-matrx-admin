import * as React from 'react';
import { EntityKeys } from '@/types/entityTypes';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { SelectionMode, MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { getEntitySlice } from '@/lib/redux/entity/entitySlice';
import { FetchMode, GetOrFetchSelectedRecordsPayload } from '@/lib/redux/entity/actions';

export const useRecordMultiSelect = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const [fetchMode, setFetchMode] = React.useState(<FetchMode>'native');

    const dispatch = useAppDispatch();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const { actions } = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);

    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const selectSelectedRecordsWithKey = useAppSelector(selectors.selectSelectedRecordsWithKey);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);


    const setSelectionMode = React.useCallback(
        (mode: SelectionMode) => {
            dispatch(actions.setSelectionMode(mode));
        },
        [dispatch, actions]
    );

    const summary = useAppSelector(selectors.selectSelectionSummary);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const loading = loadingState.loading;

    const isSelected = React.useCallback((recordKey: MatrxRecordId) => selectedRecordIds.includes(recordKey), [selectedRecordIds]);

    const isActive = React.useCallback((recordKey: MatrxRecordId) => activeRecordId === recordKey, [activeRecordId]);

    const handleAddToSelection = React.useCallback(
        (recordKey: MatrxRecordId) => {
            dispatch(actions.addToSelection(recordKey));
        },
        [dispatch, actions]
    );

    const handleRemoveFromSelection = React.useCallback(
        (recordKey: MatrxRecordId) => {
            dispatch(actions.removeFromSelection(recordKey));
        },
        [dispatch, actions]
    );

    const clearSelection = React.useCallback(() => {
        dispatch(actions.clearSelection());
    }, [dispatch, actions]);

    const [lastProcessedIds, setLastProcessedIds] = React.useState<MatrxRecordId[]>([]);

    React.useEffect(() => {
        if (
            loading ||
            selectedRecordIds.length === 0 ||
            selectedRecordIds.every((recordId) => recordId.startsWith('new-record-')) ||
            areArraysEqual(lastProcessedIds, selectedRecordIds)
        ) {
            return;
        }

        const payload: GetOrFetchSelectedRecordsPayload = {
            matrxRecordIds: selectedRecordIds,
            fetchMode,
        };

        setLastProcessedIds(selectedRecordIds);

        const timeoutId = setTimeout(() => {
            dispatch(actions.getOrFetchSelectedRecords(payload));
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [selectedRecordIds, fetchMode]);

    const areArraysEqual = (a: MatrxRecordId[], b: MatrxRecordId[]) => a.length === b.length && a.every((val, idx) => val === b[idx]);

    return {
        // State
        selectedRecordIds,
        selectedRecords,
        activeRecordId,
        selectSelectedRecordsWithKey,
        activeRecord,
        summary,

        // Core Operations
        handleAddToSelection,
        handleRemoveFromSelection,

        // Checks
        isSelected,
        isActive,

        // Mode Management
        setSelectionMode,

        // Additional Operations
        clearSelection,
        fetchMode,
        setFetchMode,
    };
};
