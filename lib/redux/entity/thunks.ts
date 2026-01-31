import { createAsyncThunk } from '@reduxjs/toolkit';
import { EntityKeys, AnyEntityDatabaseTable } from '@/types/entityTypes';
import { createEntitySlice } from './slice';
import { FetchOneWithFkIfkPayload, GetOrFetchSelectedRecordsPayload } from './actions';
import { QueryOptions } from './types/stateTypes';
import { AppDispatch, createEntitySelectors, RootState } from '..';
import { selectEntityDatabaseName } from '@/lib/redux/schema/globalCacheSelectors';
import EntityLogger from './utils/entityLogger';


export interface RecordResult<T> {
    recordId: string;
    data?: T;
}

export const getOrFetchSelectedRecordsThunk = createAsyncThunk<
    RecordResult<any>[],
    {
        entityKey: EntityKeys;
        actions: ReturnType<typeof createEntitySlice<any>>['actions'];
        payload: GetOrFetchSelectedRecordsPayload;
    },
    {
        dispatch: AppDispatch;
        state: RootState;
    }
>('entities/getOrFetchSelectedRecordsThunk', async ({ entityKey, actions, payload }, { dispatch, getState }) => {
    if (payload.matrxRecordIds.length === 0 || payload.matrxRecordIds.every((id) => id === null)) {
        return [];
    }
    const entityLogger = EntityLogger.createLoggerWithDefaults(`GET OR FETCH THUNK`, entityKey, 'THUNKS');

    const entitySelectors = createEntitySelectors(entityKey);
    if (!entitySelectors) {
        throw new Error('Entity selectors not found');
    }

    const results: RecordResult<any>[] = [];

    entityLogger.log('info', 'Thunk Fetching Records with payload', payload);
    
    try {
        const { existingRecords, recordIdsNotInState, primaryKeysToFetch } = entitySelectors.selectRecordsForFetching(payload.matrxRecordIds)(getState());

        for (const recordId of existingRecords) {
            dispatch(actions.addToSelection(recordId));
            const record = entitySelectors.selectRecordByKey(getState(), recordId);
            results.push({ recordId, data: record });
        }

        if (primaryKeysToFetch.length > 0) {
            const tableName = selectEntityDatabaseName(getState(), entityKey) as AnyEntityDatabaseTable;
            const queryOptions: QueryOptions<typeof entityKey> = {
                tableName,
                filters: primaryKeysToFetch.reduce((acc, primaryKey) => {
                    Object.assign(acc, primaryKey);
                    return acc;
                }, {} as Record<string, string>),
            };

            if (payload.fetchMode === 'fkIfk') {
                for (const recordId of recordIdsNotInState) {
                    try {
                        const fkIfkPayload: FetchOneWithFkIfkPayload = {
                            matrxRecordId: recordId,
                        };
                        await dispatch(actions.fetchOneWithFkIfk(fkIfkPayload));
                        const fetchedRecord = entitySelectors.selectRecordByKey(getState(), recordId);
                        results.push({ recordId, data: fetchedRecord });
                    } catch {
                        results.push({ recordId });
                    }
                }
            } else {
                try {
                    await dispatch(actions.fetchSelectedRecords(queryOptions));
                    for (const recordId of recordIdsNotInState) {
                        const fetchedRecord = entitySelectors.selectRecordByKey(getState(), recordId);
                        results.push({ recordId, data: fetchedRecord });
                    }
                } catch {
                    recordIdsNotInState.forEach((recordId) => {
                        results.push({ recordId });
                    });
                }
            }
        }

        return results;
    } catch (error: any) {
        throw error;
    }
});
