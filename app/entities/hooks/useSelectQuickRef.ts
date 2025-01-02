import * as React from 'react';
import {FetchMode, GetOrFetchSelectedRecordsPayload, getRecordIdByRecord, useEntityTools} from '@/lib/redux';
import {useAppSelector} from '@/lib/redux/hooks';
import {MatrxRecordId, SelectionMode} from '@/lib/redux/entity/types/stateTypes';
import {EntityKeys, EntityData} from '@/types/entityTypes';

const useAreArraysEqual = (a: MatrxRecordId[], b: MatrxRecordId[]) => {
    return React.useMemo(
        () => a.length === b.length && a.every((val, idx) => val === b[idx]),
        [a, b]
    );
};

const useHasOnlyNewRecords = (selectedRecordIds: MatrxRecordId[]) => {
    return React.useMemo(
        () => selectedRecordIds.every(recordId => recordId.startsWith('new-record-')),
        [selectedRecordIds]
    );
};

export function useSelectQuickRef<TEntity extends EntityKeys>(entityKey: TEntity) {
    const { actions, selectors, dispatch } = useEntityTools(entityKey);
    const [fetchMode, setFetchMode] = React.useState<FetchMode>("native");
    const [lastProcessedIds, setLastProcessedIds] = React.useState<MatrxRecordId[]>([]);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectionMode = useAppSelector(selectors.selectSelectionMode);
    const hasOnlyNewRecords = useHasOnlyNewRecords(selectedRecordIds);
    const isEqual = useAreArraysEqual(lastProcessedIds, selectedRecordIds);
    const quickReferenceRecords = useAppSelector(selectors.selectQuickReference);

    const payload: GetOrFetchSelectedRecordsPayload = React.useMemo(
        () => {
            return {
                matrxRecordIds: selectedRecordIds,
                fetchMode,
            };
        },
        [selectedRecordIds, fetchMode]
    );

    React.useEffect(() => {
        if (
            selectedRecordIds.length === 0 ||
            hasOnlyNewRecords ||
            isEqual
        ) {
            return;
        }
        dispatch(actions.getOrFetchSelectedRecords(payload));
        setLastProcessedIds(selectedRecordIds);

    }, [
        selectedRecordIds,
        hasOnlyNewRecords,
        isEqual,
        payload,
        dispatch,
        actions
    ]);

    const isSelected = React.useCallback((recordKey: MatrxRecordId) =>
        selectedRecordIds.includes(recordKey), [selectedRecordIds]);

    const handleToggleSelection = React.useCallback((recordKey: MatrxRecordId) => {
        if (isSelected(recordKey)) {
            dispatch(actions.removeFromSelection(recordKey));
        } else {
            dispatch(actions.addToSelection(recordKey));
        }
    }, [dispatch, actions, isSelected]);


    const handleSingleSelection = React.useCallback(
        (recordKey: MatrxRecordId) => dispatch(actions.setSwitchSelectedRecord(recordKey)),
        [dispatch, actions]
    );

    const toggleSelectionMode = React.useCallback(
        () => dispatch(actions.setToggleSelectionMode()),
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


    return React.useMemo(() => ({
        selectionMode,
        handleRecordSelect,
        toggleSelectionMode,
        setFetchMode,
        quickReferenceRecords
    }), [
        selectionMode,
        handleRecordSelect,
        toggleSelectionMode,
        setFetchMode,
        quickReferenceRecords
    ]);
}

export type useQuickRefReturn = ReturnType<typeof useSelectQuickRef>;