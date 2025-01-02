import * as React from 'react';
import {FetchMode, GetOrFetchSelectedRecordsPayload, getRecordIdByRecord, useEntityTools} from '@/lib/redux';
import {useAppSelector} from '@/lib/redux/hooks';
import {MatrxRecordId, SelectionMode} from '@/lib/redux/entity/types/stateTypes';
import {EntityKeys, EntityData} from '@/types/entityTypes';

export function useQuickRefModes<TEntity extends EntityKeys>(entityKey: TEntity) {
    const { actions, selectors, dispatch } = useEntityTools(entityKey);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectionMode = useAppSelector(selectors.selectSelectionMode);

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
    }), [
        selectionMode,
        handleRecordSelect,
        toggleSelectionMode,
    ]);
}

export type useQuickRefReturn = ReturnType<typeof useQuickRefModes>;