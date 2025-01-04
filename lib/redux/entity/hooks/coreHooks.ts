// lib/redux/entity/hooks/coreHooks.ts
import {useMemo} from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {createEntitySelectors, getEntitySlice, useAppDispatch} from '@/lib/redux';


export const useEntityActions = (entityKey: EntityKeys) => {
    const dispatch = useAppDispatch();
    return useMemo(() => ({
        actions: getEntitySlice(entityKey).actions,
        dispatch
    }), [entityKey]);
};

export const useEntityTools = (entityKey: EntityKeys) => {
    const dispatch = useAppDispatch();

    return useMemo(() => ({
        actions: getEntitySlice(entityKey).actions,
        selectors: createEntitySelectors(entityKey),
        dispatch
    }), [entityKey]);
};
