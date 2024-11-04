/*
// lib/redux/entity/useEntity.ts

import {useCallback, useEffect, useMemo} from 'react';
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {QueryOptions} from "@/utils/supabase/api-wrapper";
import {useAppDispatch, useAppSelector} from '../hooks';
import {createEntitySelectors} from "@/lib/redux/entity/entitySelectors";
import {createEntityActions} from "@/lib/redux/entity/entityActionCreator";

// Placeholder selectors to prevent null and keep hooks consistent
const defaultSelectors = {
    getData: () => null,
    getLoading: () => false,
    getError: () => null,
    getTotalCount: () => 0,
    getInitialized: () => false,
    getSelectedItem: () => null,
    getSchema: () => null,
    getStaleTime: () => 0,
    getLastFetched: () => ({}),
};

export function useEntity(
    {
        entityKey,
        queryOptions,
        page = 1,
        pageSize = 10
    }: {
        entityKey: EntityKeys | null;
        queryOptions?: QueryOptions<EntityKeys>;
        page?: number;
        pageSize?: number;
    }) {
    const dispatch = useAppDispatch();

    // Initialize selectors based on entityKey
    const selectors = useMemo(
        () => entityKey ? createEntitySelectors(entityKey) : defaultSelectors,
        [entityKey]
    );

    // Initialize actions based on entityKey
    const actions = useMemo(
        () => entityKey ? createEntityActions(entityKey) : null,
        [entityKey]
    );

    // Select data from state consistently, with defaults if `entityKey` is null
    const data = useAppSelector(state => selectors.getData(state));
    const loading = useAppSelector(state => selectors.getLoading(state));
    const error = useAppSelector(state => selectors.getError(state));
    const totalCount = useAppSelector(state => selectors.getTotalCount(state));
    const initialized = useAppSelector(state => selectors.getInitialized(state));
    const selectedItem = useAppSelector(state => selectors.getSelectedItem(state));
    const schema = useAppSelector(state => selectors.getSchema(state));
    const staleTime = useAppSelector(state => selectors.getStaleTime(state));
    const lastFetched = useAppSelector(state => selectors.getLastFetched(state));

    // Helper to check if data is stale
    const isDataStale = useCallback(() => {
        const now = Date.now();
        return !lastFetched['all'] || (now - (lastFetched['all']?.getTime() ?? 0) > staleTime);
    }, [lastFetched, staleTime]);

    // Set selected item action
    const setSelectedItem = useCallback((item: EntityData<EntityKeys>) => {
        if (actions) {
            dispatch(actions.setSelectedItem(item));
        }
    }, [dispatch, actions]);

    // Refetch data action
    const refetch = useCallback(() => {
        if (actions) {
            dispatch(actions.fetchPaginatedRequest(page, pageSize, queryOptions));
        }
    }, [dispatch, actions, page, pageSize, queryOptions]);

    // Trigger initial fetch or refetch on mount or when data is stale
    useEffect(() => {
        if (entityKey && (!initialized || isDataStale())) {
            refetch();
        }
    }, [entityKey, initialized, isDataStale, refetch]);

    return {
        data,
        loading,
        error,
        totalCount,
        initialized,
        selectedItem,
        schema,
        isDataStale: isDataStale(),
        setSelectedItem,
        refetch,
    };
}
*/
