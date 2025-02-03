import { useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { toMatrxIdFromValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types';
import { useThrottle } from '@uidotdev/usehooks';
import { useEffect } from 'react';

export function useGetorFetchRecords(entityName: EntityKeys, matrxRecordIds: MatrxRecordId[], shouldProcess = true) {
    const dispatch = useAppDispatch();
    const { selectors, actions } = useEntityTools(entityName);
    const recordsWithKeys = useAppSelector((state) => selectors.selectRecordsWithKeys(state, matrxRecordIds)) as EntityDataWithKey<EntityKeys>[];

    useEffect(() => {
        if (matrxRecordIds && shouldProcess) {
            dispatch(
                actions.getOrFetchSelectedRecords({
                    matrxRecordIds,
                    fetchMode: 'fkIfk',
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
};

export function useGetOrFetchRecord({ entityName, matrxRecordId, simpleId, shouldProcess = true }: UseGetOrFetchRecordProps) {
    const dispatch = useAppDispatch();
    const { selectors, actions } = useEntityTools(entityName);

    const recordId = useThrottle(matrxRecordId || toMatrxIdFromValue(entityName, simpleId!), 1000);
    const recordWithKey = useAppSelector((state) => selectors.selectRecordWithKey(state, recordId)) as EntityDataWithKey<EntityKeys> | null;

    useEffect(() => {
        if (recordId && shouldProcess) {
            console.log('useGetOrFetchRecord calling getOrFetchSelectedRecords', recordId);
            dispatch(
                actions.getOrFetchSelectedRecords({
                    matrxRecordIds: [recordId],
                    fetchMode: 'fkIfk',
                })
            );
        }
    }, [dispatch, actions, entityName, recordId, shouldProcess]);

    return recordWithKey;
}
