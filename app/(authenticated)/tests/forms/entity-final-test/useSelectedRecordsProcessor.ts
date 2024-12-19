import * as React from 'react';
import {AppDispatch, FetchMode} from '@/lib/redux';
import {useAppDispatch, useAppSelector, useAppStore} from '@/lib/redux/hooks';
import {LoadingState, MatrxRecordId, SelectionMode} from '@/lib/redux/entity/types/stateTypes';
import {EntityKeys} from '@/types/entityTypes';

// useSelectedRecordsProcessor.ts
export const useSelectedRecordsProcessor = <TEntity extends EntityKeys>(
    selectedRecordIds: MatrxRecordId[],
    loadingState: LoadingState,
    dispatch: AppDispatch,
    actions,
    fetchMode: FetchMode
) => {
    const [lastProcessedIds, setLastProcessedIds] = React.useState<MatrxRecordId[]>([]);
    const isProcessing = React.useRef(false);
    const lastProcessTime = React.useRef(Date.now());

    const hasOnlyNewRecords = React.useMemo(
        () => selectedRecordIds.every(recordId => recordId.startsWith('new-record-')),
        [selectedRecordIds]
    );

    const isEqual = React.useMemo(
        () => lastProcessedIds.length === selectedRecordIds.length &&
            lastProcessedIds.every((val, idx) => val === selectedRecordIds[idx]),
        [lastProcessedIds, selectedRecordIds]
    );

    React.useEffect(() => {
        if (
            loadingState.loading ||
            selectedRecordIds.length === 0 ||
            hasOnlyNewRecords ||
            isEqual ||
            isProcessing.current ||
            Date.now() - lastProcessTime.current < 1000
        ) {
            return;
        }

        isProcessing.current = true;
        lastProcessTime.current = Date.now();
        setLastProcessedIds(selectedRecordIds);

        const timeoutId = setTimeout(() => {
            dispatch(actions.getOrFetchSelectedRecords({
                matrxRecordIds: selectedRecordIds,
                fetchMode
            }));
            isProcessing.current = false;
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [
        loadingState.loading,
        selectedRecordIds,
        hasOnlyNewRecords,
        isEqual,
        dispatch,
        actions,
        fetchMode
    ]);
};
