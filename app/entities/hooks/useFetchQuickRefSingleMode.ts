import * as React from 'react';
import { FetchMode, getRecordIdByRecord, useEntityTools } from '@/lib/redux';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { entityDefaultSettings } from '@/lib/redux/entity/constants/defaults';
import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { SelectionMode } from '@/lib/redux/entity/types/stateTypes';
import { useGetOrFetchRecord } from './records/useGetOrFetch';
import { useDebounce } from '@uidotdev/usehooks';

export function useSelectActiveRecord(
    entityKey: EntityKeys,
    initialRecordKey: MatrxRecordId = '',
    initialFetchMode: FetchMode = 'native',
    initialSelectionmode: SelectionMode = 'single'
) {
    const dispatch = useAppDispatch();
    const { actions, selectors } = useEntityTools(entityKey);
    const [fetchMode, setFetchMode] = React.useState<FetchMode>(initialFetchMode);
    const [selectionMode, setSelectionMode] = React.useState<SelectionMode>(initialSelectionmode);
    const [selectedRecordKey, setSelectedRecordKey] = React.useState<MatrxRecordId>(initialRecordKey);
    
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const isQuickReferenceFetchComplete = useAppSelector(selectors.selectIsQuickReferenceFetchComplete);
    const quickReferenceRecords = useAppSelector(selectors.selectQuickReference);
    
    // Fetch quick reference data on mount
    React.useEffect(() => {
        if (!loadingState.loading && !isQuickReferenceFetchComplete) {
            dispatch(actions.setSelectionMode(selectionMode));
            dispatch(
                actions.fetchQuickReference({
                    maxRecords: entityDefaultSettings.maxQuickReferenceRecords,
                })
            );
        }
    }, [dispatch, actions, loadingState.loading, isQuickReferenceFetchComplete, selectionMode]);

    const selectedRecordWithkey = useGetOrFetchRecord({
        entityName: entityKey,
        matrxRecordId: selectedRecordKey,
        shouldProcess: Boolean(selectedRecordKey),
    });

    const activeRecordkey = useDebounce(selectedRecordKey, 1000);

    React.useEffect(() => {
        console.log("useEffect recordkey", activeRecordkey);
        if (activeRecordkey) {
            dispatch(actions.setActiveRecord(activeRecordkey));
        }
    }, [dispatch, actions, activeRecordkey]);


    return React.useMemo(
        () => ({
            quickReferenceRecords,
            activeRecordkey,
            loadingState,
            fetchMode,
            setFetchMode,
            getRecordIdByRecord,
            setSelectionMode,
            setSelectedRecordKey,
        }),
        [
            quickReferenceRecords,
            activeRecordkey,
            loadingState,
            fetchMode,
            setSelectionMode,
            setSelectedRecordKey
        ]
    );
}

export type UseSelectActiveRecordHook = ReturnType<typeof useSelectActiveRecord>;