import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect } from 'react';
import { EntityData, EntityKeys } from "@/types/entityTypes";
import { QueryOptions } from "@/utils/supabase/api-wrapper";
import { RootState } from '../store';
import { createEntitySelectors } from "@/lib/redux/entity/entitySelectors";
import { createEntityActions } from "@/lib/redux/entity/entityActionCreator";

interface UseEntityProps<TEntity extends EntityKeys> {
    entityKey?: TEntity; // Make entityKey optional
    queryOptions?: QueryOptions<TEntity>;
    page?: number;
    pageSize?: number;
}

export function useEntity<TEntity extends EntityKeys>({ entityKey, queryOptions, page = 1, pageSize = 10 }: UseEntityProps<TEntity>) {
    const dispatch = useDispatch();

    // Conditionally initialize actions and selectors only if entityKey is defined
    const actions = entityKey ? createEntityActions(entityKey) : null;
    const selectors = entityKey ? createEntitySelectors(entityKey) : null;

    // Initialize state with default values if entityKey is not defined
    const state = entityKey && selectors ? {
        data: useSelector((state: RootState) => selectors.getData(state)),
        loading: useSelector((state: RootState) => selectors.getLoading(state)),
        error: useSelector((state: RootState) => selectors.getError(state)),
        totalCount: useSelector((state: RootState) => selectors.getTotalCount(state)),
        initialized: useSelector((state: RootState) => selectors.getInitialized(state)),
        selectedItem: useSelector((state: RootState) => selectors.getSelectedItem(state)),
        schema: useSelector((state: RootState) => selectors.getSchema(state)),
        staleTime: useSelector((state: RootState) => selectors.getStaleTime(state)),
        lastFetched: useSelector((state: RootState) => selectors.getLastFetched(state)),
    } : {
        data: null,
        loading: false,
        error: null,
        totalCount: 0,
        initialized: false,
        selectedItem: null,
        schema: null,
        staleTime: 0,
        lastFetched: {}
    };

    // Check if data is stale
    const isDataStale = () => {
        const now = Date.now();
        return !state.lastFetched['all'] || (now - (state.lastFetched['all']?.getTime() ?? 0) > state.staleTime);
    };

    // Update selected item
    const setSelectedItem = (item: EntityData<TEntity>) => {
        if (actions) dispatch(actions.setSelectedItem(item));
    };

    // Refetch function
    const refetch = useCallback(() => {
        if (actions) {
            dispatch(actions.fetchPaginatedRequest(page, pageSize, queryOptions));
        }
    }, [dispatch, actions, page, pageSize, queryOptions]);

    // Initial fetch when entityKey becomes available
    useEffect(() => {
        if (actions && !state.initialized) {
            dispatch(actions.fetchPaginatedRequest(page, pageSize, queryOptions));
        }
    }, [state.initialized, dispatch, actions, page, pageSize, queryOptions]);

    // Re-fetch if data becomes stale
    useEffect(() => {
        if (actions && state.initialized && isDataStale()) {
            refetch();
        }
    }, [state.initialized, state.lastFetched, state.staleTime, refetch, actions]);

    return {
        ...state,
        isDataStale: isDataStale(),
        setSelectedItem,
        refetch,
    };
}
