// lib/redux/entity/hooks/coreHooks.ts
import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { createEntitySelectors, createRecordKey, getEntitySlice, parseRecordKey, useAppDispatch, useAppStore } from '@/lib/redux';
import { useMemo, useCallback } from 'react';
import { string } from 'zod';

export const useEntityActions = (entityKey: EntityKeys) => {
    const dispatch = useAppDispatch();
    return {
        actions: getEntitySlice(entityKey).actions,
        dispatch,
    };
};

export const useEntityCore = (entityKey: EntityKeys) => {
    const dispatch = useAppDispatch();
    const store = useAppStore();
    return {
        actions: getEntitySlice(entityKey).actions,
        selectors: createEntitySelectors(entityKey),
        dispatch,
        store,
    };
};

export const useEntityTools = (entityKey: EntityKeys) => {
    const dispatch = useAppDispatch();
    const store = useAppStore();
    const selectors = createEntitySelectors(entityKey);
    const actions = getEntitySlice(entityKey).actions;
    const metadata = selectors.selectPrimaryKeyMetadata(store.getState());

    const getRecordIdFromPkValue = useCallback(
        (pkValue: string) => {
            const pkValues = { [metadata.fields[0]]: pkValue };
            return createRecordKey(metadata, pkValues);
        },
        [metadata]
    );

    const getPrimaryKeyValue = useCallback((recordId: MatrxRecordId) => {
        return parseRecordKey(recordId);
    }, []);

    const getRecordIdFromPkValues = useCallback(
        (pkValues: Record<string, unknown>) => {
            return createRecordKey(metadata, pkValues);
        },
        [metadata]
    );

    const getPrimaryKeyValues = useCallback((recordId: MatrxRecordId) => {
        return parseRecordKey(recordId);
    }, []);

    return {
        // Core entity tools
        selectors,
        actions,
        dispatch,
        store,

        // Key transformation utilities
        getRecordIdFromPkValue,
        getPrimaryKeyValue,
        getRecordIdFromPkValues,
        getPrimaryKeyValues,
    };
};

