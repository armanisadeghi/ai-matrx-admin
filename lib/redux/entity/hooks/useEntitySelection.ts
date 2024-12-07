import * as React from 'react';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {SelectionMode, MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {getEntitySlice} from "@/lib/redux/entity/entitySlice";
import {getRecordIdByRecord} from "@/lib/redux/entity/utils/stateHelpUtils";
import {FetchMode, getOrFetchSelectedRecordsPayload} from "@/lib/redux/entity/actions";

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
    handleAddToSelection: (recordKey: MatrxRecordId) => void;
    handleToggleSelection: (recordKey: MatrxRecordId) => void;
    handleToggleSelectionWithRelation?: (recordKey: MatrxRecordId) => void;

    // Selection Checks
    isSelected: (recordKey: MatrxRecordId) => boolean;
    isActive: (recordKey: MatrxRecordId) => boolean;

    // Mode Management
    setSelectionMode: (mode: SelectionMode) => void;
    toggleSelectionMode: () => void;

    // Additional Operations
    clearSelection: () => void;
    handleSingleSelection: (recordKey: MatrxRecordId) => void;

    getRecordId: (record: EntityData<TEntity>) => MatrxRecordId;
    fetchMode: FetchMode;
    setFetchMode: React.Dispatch<React.SetStateAction<FetchMode>>;
}

export const useEntitySelection = <TEntity extends EntityKeys>(
    entityKey: TEntity
): UseEntitySelectionReturn<TEntity> => {
    const dispatch = useAppDispatch();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);

    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const selectionMode = useAppSelector(selectors.selectSelectionMode);
    const summary = useAppSelector(selectors.selectSelectionSummary);


    const [fetchMode, setFetchMode] = React.useState(<FetchMode>"native");

    const isSelected = React.useCallback((recordKey: MatrxRecordId) =>
        selectedRecordIds.includes(recordKey), [selectedRecordIds]);

    const isActive = React.useCallback((recordKey: MatrxRecordId) =>
        activeRecordId === recordKey, [activeRecordId]);

    const handleAddToSelection = React.useCallback((recordKey: MatrxRecordId) => {
        dispatch(actions.addToSelection(recordKey));
    }, [dispatch, actions]);

    const getRecordId = React.useCallback(
        (record: EntityData<TEntity>) => {
            const entityState = useAppSelector(selectors.selectEntity);
            return getRecordIdByRecord(entityState, record);
        },
        [selectors]
    );

    const handleToggleSelection = React.useCallback((recordKey: MatrxRecordId) => {
        if (isSelected(recordKey)) {
            dispatch(actions.removeFromSelection(recordKey));
        } else {
            dispatch(actions.addToSelection(recordKey));
        }
    }, [dispatch, actions, isSelected]);


    const setSelectionMode = React.useCallback((mode: SelectionMode) => {
        dispatch(actions.setSelectionMode(mode));
    }, [dispatch, actions]);

    const toggleSelectionMode = React.useCallback(() => {
        dispatch(actions.setToggleSelectionMode());
    }, [dispatch, actions]);


    const clearSelection = React.useCallback(() => {
        dispatch(actions.clearSelection());
    }, [dispatch, actions]);

    const handleSingleSelection = React.useCallback((recordKey: MatrxRecordId) => {
        console.log('Single Selection Handler Triggered with: ', recordKey);
        dispatch(actions.setSwitchSelectedRecord(recordKey));
    }, [dispatch, actions]);


    const [lastProcessedIds, setLastProcessedIds] = React.useState<MatrxRecordId[]>([]);

    //getOrFetchSelectedRecordsPayload

    React.useEffect(() => {
        const onlyNewRecords = selectedRecordIds.every(recordId => recordId.startsWith('new-record-'));
        if (onlyNewRecords) {
            return;
        }
        if (
            selectedRecordIds.length > 0 &&
            !areArraysEqual(lastProcessedIds, selectedRecordIds)
        ) {
            setLastProcessedIds(selectedRecordIds);

            const payload: getOrFetchSelectedRecordsPayload = {
                matrxRecordIds: selectedRecordIds,
                fetchMode,
            };

            dispatch(actions.getOrFetchSelectedRecords(payload));
        }
    }, [selectedRecordIds, lastProcessedIds, fetchMode, dispatch, actions]);


    const areArraysEqual = (a: MatrxRecordId[], b: MatrxRecordId[]) =>
        a.length === b.length && a.every((val, idx) => val === b[idx]);


    return {
        // State
        selectedRecordIds,
        selectedRecords,
        activeRecordId,
        activeRecord,
        selectionMode,
        summary,

        // Core Operations
        handleAddToSelection,
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

        getRecordId,
        fetchMode,
        setFetchMode,
    };
};
