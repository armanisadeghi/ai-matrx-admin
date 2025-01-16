// lib/redux/entity/sagas.ts

import { call, put, takeLatest, delay, all, takeEvery } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { EntityData, EntityKeys } from '@/types/entityTypes';
import { MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { UnifiedQueryOptions } from '@/lib/redux/schema/globalCacheSelectors';
import EntityLogger from '@/lib/redux/entity/utils/entityLogger';
import {
    handleFetchOne,
    handleFetchPaginated,
    handleCreate,
    handleUpdate,
    handleFetchAll,
    handleFetchQuickReference,
    handleDelete,
    handleExecuteCustomQuery,
    handleFetchMetrics,
    handleGetOrFetchSelectedRecords,
    handleFetchSelectedRecords,
    handleDirectUpdate,
} from '@/lib/redux/entity/sagas/sagaHandlers';
import { CreateRecordPayload, DeleteRecordPayload, DirectUpdateRecordPayload, FetchOneWithFkIfkPayload, GetOrFetchSelectedRecordsPayload } from '../actions';
import { withConversion, withFullConversion, withFullRelationConversion } from '@/lib/redux/entity/sagas/sagaHelpers';
import { getEntitySlice } from '@/lib/redux';

type SagaAction<P = any> = PayloadAction<P> & { type: string };

export function watchEntitySagas<TEntity extends EntityKeys>(entityKey: TEntity) {
    const { actions } = getEntitySlice(entityKey);
    const sagaLogger = EntityLogger.createLoggerWithDefaults('SAGA WATCHER', entityKey);

    // Simplified cache that just stores timestamps for each unique request
    const requestCache = new Map<string, number>();
    const CACHE_WINDOW = 1000; // 1 second window to catch duplicate requests in a render cycle

    function shouldSkip(actionType: string, payload: any): boolean {
        const cacheKey = `${actionType}-${JSON.stringify(payload)}`;
        const currentTime = Date.now();
        const lastRequestTime = requestCache.get(cacheKey);

        // Only block if we've seen this exact request within our cache window
        if (lastRequestTime && currentTime - lastRequestTime < CACHE_WINDOW) {
            sagaLogger.log('warn', `Skipping duplicate request for ${cacheKey} within ${CACHE_WINDOW}ms window`);
            return true;
        }
        return false;
    }

    function setCache(actionType: string, payload: any) {
        const cacheKey = `${actionType}-${JSON.stringify(payload)}`;
        requestCache.set(cacheKey, Date.now());

        // Optional: Clean up old cache entries
        // This prevents the cache from growing indefinitely
        for (const [key, timestamp] of requestCache.entries()) {
            if (Date.now() - timestamp > CACHE_WINDOW) {
                requestCache.delete(key);
            }
        }
    }

    // handleFetchAllFkIfk
    return function* saga() {
        try {
            yield all([
                takeEvery(actions.fetchOneWithFkIfk.type, function* (action: SagaAction<{ matrxRecordId: MatrxRecordId }>) {
                    if (shouldSkip(actions.fetchOne.type, action.payload)) return;
                    yield call(withFullRelationConversion, entityKey, actions, action, actions.fetchOneWithFkIfkSuccess);
                    setCache(actions.fetchOneWithFkIfk.type, action.payload);
                    yield delay(250);
                    yield put(actions.resetFetchOneWithFkIfkStatus());
                }),
                takeEvery(actions.fetchOne.type, function* (action: SagaAction<FetchOneWithFkIfkPayload>) {
                    if (shouldSkip(actions.fetchOne.type, action.payload)) return;
                    yield call(withFullConversion, handleFetchOne, entityKey, actions, action, actions.fetchOneSuccess);
                    setCache(actions.fetchOne.type, action.payload);
                    yield delay(250); // TODO: Consider reducing this to avoid issues when there are additional requests. But it might not be a problem, since the next request will will reset the status anyways.
                    yield put(actions.resetFetchOneStatus());
                }),
                takeEvery(actions.fetchRecords.type, function* (action: SagaAction<{ page: number; pageSize: number }>) {
                    sagaLogger.log('debug', 'Handling fetchRecords', action.payload);
                    if (shouldSkip(actions.fetchRecords.type, action.payload)) return;
                    yield call(withConversion, handleFetchPaginated, entityKey, actions, action);
                    setCache(actions.fetchRecords.type, action.payload);
                }),
                takeLatest(actions.fetchAll.type, function* (action: SagaAction) {
                    sagaLogger.log('debug', 'Handling fetchAll', action.payload);
                    if (shouldSkip(actions.fetchAll.type, action.payload)) return;
                    yield call(withConversion, handleFetchAll, entityKey, actions, action);
                    setCache(actions.fetchAll.type, action.payload);
                }),
                takeLatest(actions.fetchQuickReference.type, function* (action: SagaAction) {
                    sagaLogger.log('debug', 'Handling fetchQuickReference', action.payload);
                    if (shouldSkip(actions.fetchQuickReference.type, action.payload)) return;
                    yield call(withConversion, handleFetchQuickReference, entityKey, actions, action);
                    setCache(actions.fetchQuickReference.type, action.payload);
                }),
                takeEvery(actions.createRecord.type, function* (action: SagaAction<CreateRecordPayload>) {
                    sagaLogger.log('debug', 'Handling createRecord', action.payload);
                    if (shouldSkip(actions.createRecord.type, action.payload)) return;
                    yield call(withFullConversion, handleCreate, entityKey, actions, action);
                    setCache(actions.createRecord.type, action.payload);
                }),
                takeEvery(
                    actions.updateRecord.type,
                    function* (
                        action: SagaAction<{
                            primaryKeyValues: Record<string, MatrxRecordId>;
                            data: Partial<EntityData<TEntity>>;
                        }>
                    ) {
                        sagaLogger.log('debug', 'Handling updateRecord', action.payload);
                        if (shouldSkip(actions.updateRecord.type, action.payload)) return;
                        yield call(withFullConversion, handleUpdate, entityKey, actions, action);
                        setCache(actions.updateRecord.type, action.payload);
                    }
                ),
                takeEvery(actions.directUpdateRecord.type, function* (action: SagaAction<DirectUpdateRecordPayload>) {
                    sagaLogger.log('info', 'Handling directUpdateRecord', action.payload);
                    if (shouldSkip(actions.directUpdateRecord.type, action.payload)) return;
                    yield call(withFullConversion, handleDirectUpdate, entityKey, actions, action);
                    setCache(actions.directUpdateRecord.type, action.payload);
                }),
                takeEvery(actions.deleteRecord.type, function* (action: PayloadAction<DeleteRecordPayload>) {
                    sagaLogger.log('debug', 'Handling deleteRecord', action.payload);
                    if (shouldSkip(actions.deleteRecord.type, action.payload)) return;
                    yield call(withFullConversion, handleDelete, entityKey, actions, action);
                    setCache(actions.deleteRecord.type, action.payload);
                }),
                takeLatest(actions.executeCustomQuery.type, function* (action: SagaAction<UnifiedQueryOptions<TEntity>>) {
                    sagaLogger.log('debug', 'Handling executeCustomQuery', action.payload);
                    if (shouldSkip(actions.executeCustomQuery.type, action.payload)) return;
                    yield call(withConversion, handleExecuteCustomQuery, entityKey, actions, action);
                    setCache(actions.executeCustomQuery.type, action.payload);
                }),
                takeLatest(actions.fetchMetrics.type, function* (action: SagaAction<UnifiedQueryOptions<TEntity>>) {
                    sagaLogger.log('debug', 'Handling fetchMetrics', action.payload);
                    if (shouldSkip(actions.fetchMetrics.type, action.payload)) return;
                    yield call(withConversion, handleFetchMetrics, entityKey, actions, action);
                    setCache(actions.fetchMetrics.type, action.payload);
                }),
                takeEvery(actions.getOrFetchSelectedRecords.type, function* (action: SagaAction<GetOrFetchSelectedRecordsPayload>) {
                    sagaLogger.log('debug', 'Handling getOrFetchSelectedRecords', action.payload);
                    if (shouldSkip(actions.getOrFetchSelectedRecords.type, action.payload)) return;
                    yield call(handleGetOrFetchSelectedRecords, entityKey, actions, action);
                    setCache(actions.getOrFetchSelectedRecords.type, action.payload);
                }),
                takeEvery(actions.fetchSelectedRecords.type, function* (action: SagaAction) {
                    sagaLogger.log('debug', 'Handling fetchSelectedRecords', action.payload);
                    if (shouldSkip(actions.fetchSelectedRecords.type, action.payload)) return;
                    yield call(withConversion, handleFetchSelectedRecords, entityKey, actions, action);
                    setCache(actions.fetchSelectedRecords.type, action.payload);
                }),
                takeEvery('SOCKET_ENTITY_EVENT', function* (action: any) {
                    if (action.payload.entityKey === entityKey) {
                        const { eventType, data } = action.payload;
                        sagaLogger.log('debug', `Handling socket event ${eventType}`, action.payload);
                    }
                }),
            ]);
        } catch (error: any) {
            sagaLogger.log('error', `Error in saga watcher: ${error.message}`, error);
        }
    };
}

/*
// Handle socket events handleFetchMetrics
takeEvery('SOCKET_ENTITY_EVENT', function* (action: any) {
    if (action.payload.entityKey === entityKey) {
        const {eventType, data} = action.payload;
        sagaLogger.log('debug', 'Handling socket event ${eventType}', action.payload);

        // switch (eventType) {
        //     case 'created':
        //         yield call(handleCreateFromSocket, entityKey, actions, data);
        //         break;
        //     case 'updated':
        //         yield call(handleUpdateFromSocket, entityKey, actions, data);
        //         break;
        //     case 'deleted':
        //         yield call(handleDeleteFromSocket, entityKey, actions, data);
        //         break;
        //     default:
        //         sagaLogger.log('warn', `Unhandled socket event type: ${eventType}`, entityKey);
        // }
    }
}),
*/
