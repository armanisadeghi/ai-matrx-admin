import * as React from 'react';
import {AppDispatch} from '@/lib/redux';
import {LoadingState} from '@/lib/redux/entity/types/stateTypes';
import {entityDefaultSettings} from "@/lib/redux/entity/constants/defaults";
import {EntityKeys} from '@/types/entityTypes';

export const useQuickReferenceFetch = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    loadingState: LoadingState,
    isComplete: boolean,
    dispatch: AppDispatch,
    actions
) => {
    const lastFetchTime = React.useRef(Date.now());
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const DEBOUNCE_TIME = 2000; // 2 seconds

    React.useEffect(() => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Only proceed if we should fetch
        if (loadingState.loading || isComplete) {
            return;
        }

        // Check if enough time has passed since last fetch
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTime.current;

        if (timeSinceLastFetch < DEBOUNCE_TIME) {
            // If we're trying to fetch too soon, schedule for later
            timeoutRef.current = setTimeout(() => {
                lastFetchTime.current = Date.now();
                dispatch(actions.fetchQuickReference({
                    maxRecords: entityDefaultSettings.maxQuickReferenceRecords
                }));
            }, DEBOUNCE_TIME - timeSinceLastFetch);
        } else {
            // If enough time has passed, fetch immediately
            lastFetchTime.current = now;
            dispatch(actions.fetchQuickReference({
                maxRecords: entityDefaultSettings.maxQuickReferenceRecords
            }));
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [loadingState.loading, isComplete, dispatch, actions]);
};