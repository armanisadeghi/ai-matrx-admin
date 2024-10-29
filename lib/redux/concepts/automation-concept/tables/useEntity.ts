/*
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { EntityData, EntityKeys } from "@/types/entityTypes";
import { QueryOptions } from "@/utils/supabase/api-wrapper";
import { createEntitySelectors } from './dynamicSelectors';
import { actions } from './entitySliceCreator';
import { RootState } from '../store';

interface UseEntityProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    queryOptions?: QueryOptions<TEntity>;
    page?: number;
    pageSize?: number;
}

export function useEntity<TEntity extends EntityKeys>({ entityKey, queryOptions, page = 1, pageSize = 10 }: UseEntityProps<TEntity>) {
    const dispatch = useDispatch();

    // Initialize selectors for the specified entity key
    const selectors = createEntitySelectors(entityKey);

    // Gather state data from selectors
    const state = {
        data: useSelector((state: RootState) => selectors.getData(state)),
        loading: useSelector((state: RootState) => selectors.getLoading(state)),
        error: useSelector((state: RootState) => selectors.getError(state)),
        totalCount: useSelector((state: RootState) => selectors.getTotalCount(state)),
        initialized: useSelector((state: RootState) => selectors.getInitialized(state)),
        selectedItem: useSelector((state: RootState) => selectors.getSelectedItem(state)),
        schema: useSelector((state: RootState) => selectors.getSchema(state)),
        staleTime: useSelector((state: RootState) => selectors.getStaleTime(state)),
        lastFetched: useSelector((state: RootState) => selectors.getLastFetched(state)),
    };


    const isDataStale = () => {
        const now = Date.now();
        return !state.lastFetched['all'] || (now - (state.lastFetched['all']?.getTime() ?? 0) > state.staleTime);
    };


    const setSelectedItem = (item: EntityData<TEntity>) => {
        dispatch(actions.setSelectedItem(item));
    };

    const refetch = () => {
        dispatch(actions.fetchPaginated({
            options: queryOptions,
            page,
            pageSize,
        }));
    };

    useEffect(() => {
        if (!state.initialized || isDataStale()) {
            refetch();
        }
    }, [state.initialized, state.lastFetched, state.staleTime, page, pageSize, queryOptions, dispatch, entityKey]);


    return {
        ...state,
        isDataStale: isDataStale(),
        setSelectedItem,
        refetch,
    };
}
*/
