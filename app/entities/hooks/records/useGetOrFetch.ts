import { FetchMode, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { toMatrxIdFromValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types';
import { useEffect, useMemo } from 'react';

export function useGetorFetchRecords(entityName: EntityKeys, matrxRecordIds: MatrxRecordId[], shouldProcess = true, fetchMode: FetchMode = 'fkIfk') {
    const dispatch = useAppDispatch();
    const { selectors, actions } = useEntityTools(entityName);
    const recordsWithKeys = useAppSelector((state) => selectors.selectRecordsWithKeys(state, matrxRecordIds)) as EntityDataWithKey<EntityKeys>[];

    useEffect(() => {
        if (matrxRecordIds && shouldProcess) {
            dispatch(
                actions.getOrFetchSelectedRecords({
                    matrxRecordIds,
                    fetchMode: fetchMode,
                })
            );
        }
    }, [dispatch, actions, entityName, matrxRecordIds, shouldProcess]);

    return recordsWithKeys;
}

type UseGetOrFetchRecordProps = {
    entityName: EntityKeys;
    matrxRecordId?: MatrxRecordId;
    simpleId?: string | number;
    shouldProcess?: boolean;
    fetchMode?: FetchMode;
};

export function useGetOrFetchRecord({ entityName, matrxRecordId, simpleId, shouldProcess = true, fetchMode = 'fkIfk' }: UseGetOrFetchRecordProps) {
    const dispatch = useAppDispatch();
    const { selectors, actions } = useEntityTools(entityName);

    const recordId = useMemo(() => matrxRecordId || toMatrxIdFromValue(entityName, simpleId!), [entityName, matrxRecordId, simpleId]);
    const recordWithKey = useAppSelector((state) => selectors.selectRecordWithKey(state, recordId)) as EntityDataWithKey<EntityKeys> | null;

    useEffect(() => {
        if (recordId && shouldProcess) {
            dispatch(
                actions.getOrFetchSelectedRecords({
                    matrxRecordIds: [recordId],
                    fetchMode: fetchMode,
                })
            );
        }
    }, [dispatch, actions, entityName, recordId, shouldProcess]);

    return recordWithKey;
}

type UseGetorFetchByKeysProps = {
    entityName: EntityKeys;
    matrxRecordIds?: Set<MatrxRecordId>;
    simpleIds?: Set<string | number>;
    shouldProcess?: boolean;
    fetchMode?: FetchMode;
};



export function useGetorFetchByKeys({entityName, matrxRecordIds, simpleIds, shouldProcess = true, fetchMode = 'fkIfk'}: UseGetorFetchByKeysProps) {
    const matrxRecordIdsArray = Array.from(matrxRecordIds);
    const simpleIdsArray = Array.from(simpleIds);
    const dispatch = useAppDispatch();
    const { selectors, actions } = useEntityTools(entityName);
    const recordsWithKeys = useAppSelector((state) => selectors.selectRecordsWithKeys(state, matrxRecordIdsArray)) as EntityDataWithKey<EntityKeys>[];

    useEffect(() => {
        if (matrxRecordIds && shouldProcess) {
            dispatch(
                actions.getOrFetchSelectedRecords({
                    matrxRecordIds: matrxRecordIdsArray,
                    fetchMode: fetchMode,
                })
            );
        }
    }, [dispatch, actions, entityName, matrxRecordIds, shouldProcess]);

    return recordsWithKeys;
}

type UseGetorFetchByIdsProps = {
    entityName: EntityKeys;
    simpleIds?: Set<string | number>;
    shouldProcess?: boolean;
    fetchMode?: FetchMode;
};



export function useGetorFetchByIds({entityName, simpleIds, shouldProcess = true, fetchMode = 'fkIfk'}: UseGetorFetchByIdsProps) {
    const matrxRecordIds = useMemo(() => Array.from(simpleIds).map(id => toMatrxIdFromValue(entityName, id)) || [], [entityName, simpleIds]);
    const dispatch = useAppDispatch();
    const { selectors, actions } = useEntityTools(entityName);
    const recordsWithKeys = useAppSelector((state) => selectors.selectRecordsWithKeys(state, matrxRecordIds)) as EntityDataWithKey<EntityKeys>[];

    useEffect(() => {
        if (matrxRecordIds && shouldProcess) {
            dispatch(
                actions.getOrFetchSelectedRecords({
                    matrxRecordIds: matrxRecordIds,
                    fetchMode: fetchMode,
                })
            );
        }
    }, [dispatch, actions, entityName, matrxRecordIds, shouldProcess]);

    return recordsWithKeys;
}
