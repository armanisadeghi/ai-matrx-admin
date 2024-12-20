// lib/redux/entity/hooks/coreHooks.ts
import {useMemo} from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {getEntitySelectors, getEntitySlice, useAppDispatch} from '@/lib/redux';

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
        selectors: getEntitySelectors(entityKey),
        dispatch
    }), [entityKey]);
};
