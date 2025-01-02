// app\entities\hooks\useFetchQuickRef.ts

import * as React from 'react';
import {getRecordIdByRecord, useEntityTools} from '@/lib/redux';
import {useAppSelector} from '@/lib/redux/hooks';
import {entityDefaultSettings} from "@/lib/redux/entity/constants/defaults";
import {EntityKeys} from '@/types/entityTypes';

export function useFetchQuickRef<TEntity extends EntityKeys>(entityKey: TEntity) {
    const {actions, selectors, dispatch} = useEntityTools(entityKey);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const isQuickReferenceFetchComplete = useAppSelector(selectors.selectIsQuickReferenceFetchComplete);

    React.useEffect(() => {
        if (!loadingState.loading && !isQuickReferenceFetchComplete) {
            dispatch(actions.fetchQuickReference({
                maxRecords: entityDefaultSettings.maxQuickReferenceRecords
            }));
        }
    }, [dispatch, actions, loadingState.loading, isQuickReferenceFetchComplete]);

    const quickReferenceRecords = useAppSelector(selectors.selectQuickReference);

    return React.useMemo(() => ({quickReferenceRecords, loadingState, getRecordIdByRecord,}),
        [
            quickReferenceRecords,
            loadingState,
            getRecordIdByRecord,
        ]);
}

export type useQuickRefReturn = ReturnType<typeof useFetchQuickRef>;