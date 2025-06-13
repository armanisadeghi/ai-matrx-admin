// app\entities\hooks\useFetchQuickRef.ts
"use client";

import * as React from "react";
import { getRecordIdByRecord, useEntityTools } from "@/lib/redux";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { entityDefaultSettings } from "@/lib/redux/entity/constants/defaults";
import { EntityKeys } from "@/types/entityTypes";

export function useFetchQuickRef<TEntity extends EntityKeys>(entityKey: TEntity) {
    const dispatch = useAppDispatch();
    const { actions, selectors } = useEntityTools(entityKey);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const isQuickReferenceFetchComplete = useAppSelector(selectors.selectIsQuickReferenceFetchComplete);

    React.useEffect(() => {
        if (!loadingState.loading && !isQuickReferenceFetchComplete) {
            dispatch(
                actions.fetchQuickReference({
                    maxRecords: entityDefaultSettings.maxQuickReferenceRecords,
                })
            );
        }
    }, [dispatch, actions, loadingState.loading, isQuickReferenceFetchComplete]);

    const quickReferenceRecords = useAppSelector(selectors.selectQuickReference);
    const quickReferenceKeyDisplayPairs = useAppSelector(selectors.selectQuickReferenceKeyDisplayPairs);
    const quickReferenceSelectOptions = useAppSelector(selectors.selectQuickReferenceSelectOptions);

    return React.useMemo(
        () => ({ quickReferenceRecords, quickReferenceKeyDisplayPairs, quickReferenceSelectOptions, loadingState, getRecordIdByRecord }),
        [quickReferenceRecords, quickReferenceKeyDisplayPairs, quickReferenceSelectOptions, loadingState, getRecordIdByRecord]
    );
}

export type useQuickRefReturn = ReturnType<typeof useFetchQuickRef>;
