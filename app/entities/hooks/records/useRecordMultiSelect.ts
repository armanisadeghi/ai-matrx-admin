import * as React from 'react';
import { EntityKeys } from '@/types/entityTypes';
import { useAppSelector } from '@/lib/redux/hooks';
import { MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { FetchMode, GetOrFetchSelectedRecordsPayload } from '@/lib/redux/entity/actions';
import { useEntityTools } from '@/lib/redux';

export const useRecordMultiSelect = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const { actions, selectors, dispatch } = useEntityTools(entityKey);
    const [fetchMode, setFetchMode] = React.useState(<FetchMode>'fkIfk');
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const selectSelectedRecordsWithKey = useAppSelector(selectors.selectSelectedRecordsWithKey);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const loading = loadingState.loading;

    React.useEffect(() => {
        dispatch(actions.setSelectionMode('multiple'));
    }, [dispatch, actions]);

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

    const updateField = React.useCallback(
        (recordId: MatrxRecordId, field: string, value: any) => {
            dispatch(actions.updateUnsavedField({ recordId, field, value }));
        },
        [dispatch, actions]
    );

    return {
        // State
        selectedRecordIds,
        selectedRecords,
        activeRecordId,
        selectSelectedRecordsWithKey,
        activeRecord,

        // Core Operations
        handleAddToSelection,
        handleRemoveFromSelection,

        // Checks
        isSelected,
        isActive,

        // Additional Operations
        clearSelection,
        fetchMode,
        setFetchMode,
    };
};
