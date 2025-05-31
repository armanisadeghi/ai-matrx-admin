// lib/redux/entity/hooks/coreHooks.ts
'use client';

import { AllEntityFieldKeys, EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { createEntitySelectors, createRecordKey, getEntitySlice, parseRecordKey, RootState, useAppDispatch, useAppSelector, useAppStore } from '@/lib/redux';
import { useCallback, useMemo } from 'react';
import { getEntityMetadata } from '../utils/direct-schema';
import { EntityState } from '../types/stateTypes';

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

export const useEntityState = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    return useAppSelector((state: RootState) => state.entities[entityKey] as EntityState<TEntity>);
  };
    

export const useEntityTools = (entityKey: EntityKeys) => {
    const store = useAppStore();
    const metadata = getEntityMetadata(entityKey);
    if (!metadata) { return null; }
    const fields = metadata.entityFields;
    const pkMeta = metadata?.primaryKeyMetadata;
    const pkType = pkMeta?.type;
    const pkFields = pkMeta?.fields || [];
    const FetchStrategy = metadata?.defaultFetchStrategy;

    const firstPkField = useMemo(() => pkFields[0], [pkFields]);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const actions = useMemo(() => getEntitySlice(entityKey).actions, [entityKey]);

    const pkValueToMatrxId = useCallback(
        (pkValue: string) => {
            if (pkType === 'composite') {
                console.error('This Entity has a composite primary key. Use pkValuesToMatrxId instead.');
            }
            return createRecordKey(pkMeta, { [firstPkField]: pkValue });
        },
        [pkMeta, pkType, firstPkField]
    );

    const pkValuesToMatrxId = useCallback((pkValues: Record<string, unknown>) => createRecordKey(pkMeta, pkValues), [pkMeta]);

    const matrxIdToPks = useCallback((recordId: MatrxRecordId) => parseRecordKey(recordId) as Record<AllEntityFieldKeys, unknown>, []);

    return {
        selectors,
        actions,
        store,
        fields,
        pkType,
        pkFields,
        firstPkField,
        pkValueToMatrxId,
        matrxIdToPks,
        pkValuesToMatrxId,
        FetchStrategy,
    };
};

export const useEntityData = (entityKey: EntityKeys) => {
    const store = useAppStore();
    const metadata = getEntityMetadata(entityKey);
    const pkMeta = metadata?.primaryKeyMetadata;
    const fields = metadata?.entityFields;
    const pkType = pkMeta?.type;
    const pkFields = pkMeta?.fields || [];
    const FetchStrategy = metadata?.defaultFetchStrategy;
    const firstPkField = useMemo(() => pkFields[0], [pkFields]);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const actions = useMemo(() => getEntitySlice(entityKey).actions, [entityKey]);

    const pkValueToMatrxId = useCallback(
        (pkValue: string) => {
            if (pkType === 'composite') {
                console.error('This Entity has a composite primary key. Use pkValuesToMatrxId instead.');
            }
            return createRecordKey(pkMeta, { [firstPkField]: pkValue });
        },
        [pkMeta, pkType, firstPkField]
    );

    const pkValuesToMatrxId = useCallback((pkValues: Record<string, unknown>) => createRecordKey(pkMeta, pkValues), [pkMeta]);

    const matrxIdToPks = useCallback((recordId: MatrxRecordId) => parseRecordKey(recordId) as Record<AllEntityFieldKeys, unknown>, []);

    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecordsWithKey);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const effectiveRecords = useAppSelector(selectors.selectAllEffectiveRecordsWithKeys);


    return {
        selectors,
        actions,
        store,
        pkType,
        pkFields,
        fields,
        firstPkField,
        pkValueToMatrxId,
        matrxIdToPks,
        pkValuesToMatrxId,
        FetchStrategy,
        activeRecordId,
        activeRecord,
        selectedRecords,
        selectedRecordIds,
        effectiveRecords,
    };
};

export const useEntityAllData = (entityKey: EntityKeys) => {
    const store = useAppStore();
    const metadata = getEntityMetadata(entityKey);
    const pkMeta = metadata?.primaryKeyMetadata;
    const fields = metadata?.entityFields;
    const pkType = pkMeta?.type;
    const pkFields = pkMeta?.fields || [];
    const FetchStrategy = metadata?.defaultFetchStrategy;
    const firstPkField = useMemo(() => pkFields[0], [pkFields]);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const actions = useMemo(() => getEntitySlice(entityKey).actions, [entityKey]);

    const pkValueToMatrxId = useCallback(
        (pkValue: string) => {
            if (pkType === 'composite') {
                console.error('This Entity has a composite primary key. Use pkValuesToMatrxId instead.');
            }
            return createRecordKey(pkMeta, { [firstPkField]: pkValue });
        },
        [pkMeta, pkType, firstPkField]
    );

    const pkValuesToMatrxId = useCallback((pkValues: Record<string, unknown>) => createRecordKey(pkMeta, pkValues), [pkMeta]);

    const matrxIdToPks = useCallback((recordId: MatrxRecordId) => parseRecordKey(recordId) as Record<AllEntityFieldKeys, unknown>, []);

    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const allRecords = useAppSelector(selectors.selectAllRecords);
    const allRecordsWithKeys = useAppSelector((state) => selectors.selectAllEffectiveRecordsWithKeys(state));

    console.log('allRecords', allRecordsWithKeys);

    const selectedRecords = useAppSelector(selectors.selectSelectedRecordsWithKey);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const effectiveRecords = useAppSelector(selectors.selectAllEffectiveRecordsWithKeys);
    const isLoading = useAppSelector(selectors.selectLoadingState).loading;
    const error = useAppSelector(selectors.selectErrorState);


    return {
        selectors,
        actions,
        store,
        pkType,
        pkFields,
        fields,
        firstPkField,
        pkValueToMatrxId,
        matrxIdToPks,
        pkValuesToMatrxId,
        FetchStrategy,
        activeRecordId,
        activeRecord,
        allRecords,
        allRecordsWithKeys,
        selectedRecords,
        selectedRecordIds,
        effectiveRecords,
        isLoading,
        error,
    };
};
