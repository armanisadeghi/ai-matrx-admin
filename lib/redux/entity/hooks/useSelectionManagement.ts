import * as React from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {SelectionMode, MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {getEntitySlice} from "@/lib/redux/entity/entitySlice";

export const useEntitySelection = <TEntity extends EntityKeys>(
    entityKey: TEntity
) => {
    const dispatch = useAppDispatch();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const selectSelectedRecordsWithKey = useAppSelector(selectors.selectSelectedRecordsWithKey);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const selectionMode = useAppSelector(selectors.selectSelectionMode);

    const isSelected = React.useCallback((recordKey: MatrxRecordId) =>
        selectedRecordIds.includes(recordKey), [selectedRecordIds]);
    
    const isActive = React.useCallback((recordKey: MatrxRecordId) =>
        activeRecordId === recordKey, [activeRecordId]);
    
    const addToSelection = React.useCallback((recordKey: MatrxRecordId) => {
        dispatch(actions.addToSelection(recordKey));
    }, [dispatch, actions]);
    
    const toggleRecordSelection = React.useCallback((recordKey: MatrxRecordId) => {
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
    
    const setActiveRecord = React.useCallback((recordKey: MatrxRecordId) => {
        dispatch(actions.setActiveRecord(recordKey));
    }, [dispatch, actions]);
    
    const clearAndSetSelections = React.useCallback((recordKeys: MatrxRecordId[]) => {
        dispatch(actions.clearSelection());
        recordKeys.forEach(recordKey => {
            dispatch(actions.addToSelection(recordKey));
        });
    }, [dispatch, actions]);

    return {
        selectedRecordIds,
        selectedRecords,
        activeRecordId,
        selectSelectedRecordsWithKey,
        activeRecord,
        selectionMode,
        setSelectionMode,
        toggleSelectionMode,
        clearSelection,
        setActiveRecord,
        addToSelection,
        toggleRecordSelection,
        clearAndSetSelections,
        isSelected,
        isActive,
    };
};