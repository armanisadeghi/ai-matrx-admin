import * as React from 'react';
import { FetchMode, GetOrFetchSelectedRecordsPayload, getRecordIdByRecord, useEntityTools } from '@/lib/redux';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { entityDefaultSettings } from '@/lib/redux/entity/constants/defaults';
import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';

export function useFetchQuickRefSingleMode<TEntity extends EntityKeys>(entityKey: TEntity) {
    const dispatch = useAppDispatch();
    const { store, actions, selectors } = useEntityTools(entityKey);
    const [fetchMode, setFetchMode] = React.useState<FetchMode>('native');

    const loadingState = useAppSelector(selectors.selectLoadingState);
    const isQuickReferenceFetchComplete = useAppSelector(selectors.selectIsQuickReferenceFetchComplete);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);

    const fetchPayload: GetOrFetchSelectedRecordsPayload = React.useMemo(() => ({
        matrxRecordIds: [activeRecordId],
        fetchMode,
    }), [activeRecordId, fetchMode]);

    // Initial fetch and mode setup
    React.useEffect(() => {
        if (!loadingState.loading && !isQuickReferenceFetchComplete) {
            dispatch(actions.setSelectionMode('single'));
            dispatch(
                actions.fetchQuickReference({
                    maxRecords: entityDefaultSettings.maxQuickReferenceRecords,
                })
            );
        }
    }, [dispatch, actions, loadingState.loading, isQuickReferenceFetchComplete]);

    // Fetch selected records when active record changes
    React.useEffect(() => {
        if (activeRecordId) {
            dispatch(actions.getOrFetchSelectedRecords(fetchPayload));
        }
    }, [dispatch, actions, fetchPayload]);

    const setActiveByRecordKey = React.useCallback((recordKey: MatrxRecordId) => {
        dispatch(actions.setActiveRecord(recordKey));
    }, [dispatch, actions]);

    const setActiveBySimpleKey = React.useCallback((simpleKey: string) => {
        const recordKey = useAppSelector(state => selectors.selectMatrxRecordIdBySimpleKey(state, simpleKey));
        dispatch(actions.setActiveRecord(recordKey));
    }, [dispatch, actions, selectors]);

    const quickReferenceRecords = useAppSelector(selectors.selectQuickReference);

    return React.useMemo(() => ({ 
        quickReferenceRecords, 
        loadingState, 
        activeRecord,
        activeRecordId,
        setActiveByRecordKey,
        setActiveBySimpleKey,
        fetchMode,
        setFetchMode,
        getRecordIdByRecord 
    }), [
        quickReferenceRecords, 
        loadingState, 
        activeRecord,
        activeRecordId,
        setActiveByRecordKey,
        setActiveBySimpleKey,
        fetchMode,
        getRecordIdByRecord
    ]);
}

export type useFetchQuickRefSingleModeReturn = ReturnType<typeof useFetchQuickRefSingleMode>;