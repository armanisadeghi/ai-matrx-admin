// lib/redux/entity/hooks/coreHooks.ts
import { EntityKeys } from '@/types/entityTypes';
import { createEntitySelectors, getEntitySlice, useAppDispatch, useAppStore } from '@/lib/redux';

export const useEntityActions = (entityKey: EntityKeys) => {
    const dispatch = useAppDispatch();
    return {
        actions: getEntitySlice(entityKey).actions,
        dispatch,
    };
};

export const useEntityTools = (entityKey: EntityKeys) => {
    const dispatch = useAppDispatch();
    const store = useAppStore();
    const entityState = store.getState()[entityKey];

    return {
        actions: getEntitySlice(entityKey).actions,
        selectors: createEntitySelectors(entityKey),
        entityState,
        dispatch,
        store,
    };
};