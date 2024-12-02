// lib/redux/entity/sagas.ts

import {call, put, takeLatest, delay, all, select, fork, takeEvery} from "redux-saga/effects";
import {PayloadAction} from "@reduxjs/toolkit";
import {createEntitySlice} from "@/lib/redux/entity/slice";
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {MatrxRecordId,} from "@/lib/redux/entity/types/stateTypes";
import {UnifiedQueryOptions,} from "@/lib/redux/schema/globalCacheSelectors";
import EntityLogger from "@/lib/redux/entity/utils/entityLogger";
import {createRecordKey, parseRecordKey} from "@/lib/redux/entity/utils/stateHelpUtils";
import {
    handleFetchOne,
    handleFetchPaginated,
    handleCreate,
    handleUpdate,
    handleFetchAll,
    handleFetchQuickReference,
    handleDelete,
    handleBatchOperation,
    handleExecuteCustomQuery,
    handleSubscriptionEvents,
    handleRefreshData,
    handleFilterChange,
    handleHistoryUpdate,
    handleCacheInvalidation,
    handleFetchMetrics,
    handleGetOrFetchSelectedRecords,
    handleFetchSelectedRecords
} from "@/lib/redux/entity/sagas/sagaHandlers";
import {DeleteRecordPayload} from "../actions";
import {withConversion, withFullConversion, withFullRelationConversion} from "@/lib/redux/entity/sagas/sagaHelpers";
import { getEntitySlice } from "../entitySlice";


const trace = "SAGAS";
const sagaLogger = EntityLogger.createLoggerWithDefaults(trace, 'NoEntity');

type SagaAction<P = any> = PayloadAction<P> & { type: string };

export function watchEntitySagas<TEntity extends EntityKeys>(entityKey: TEntity) {
    const { actions } = getEntitySlice(entityKey);
    const sagaLogger = EntityLogger.createLoggerWithDefaults('SAGA WATCHER', entityKey);

    const requestCache = new Map<string, { timestamp: number; count: number }>();
    const CACHE_EXPIRATION_TIME = 5000;
    const ALLOWED_DUPLICATE_REQUESTS = 2;

    function shouldSkip(actionType: string, payload: any): boolean {
        const cacheKey = `${actionType}-${JSON.stringify(payload)}`;
        const currentTime = Date.now();
        const cacheEntry = requestCache.get(cacheKey);

        if (cacheEntry && currentTime - cacheEntry.timestamp < CACHE_EXPIRATION_TIME) {
            if (cacheEntry.count >= ALLOWED_DUPLICATE_REQUESTS) {
                sagaLogger.log('warn', `Skipping fetch after ${ALLOWED_DUPLICATE_REQUESTS} duplicate requests for cacheKey: ${cacheKey}`);
                return true;
            }
        }
        return false;
    }

    function setCache(actionType: string, payload: any) {
        const cacheKey = `${actionType}-${JSON.stringify(payload)}`;
        const currentTime = Date.now();

        const cacheEntry = requestCache.get(cacheKey);
        if (cacheEntry) {
            cacheEntry.count += 1;
            cacheEntry.timestamp = currentTime;
        } else {
            requestCache.set(cacheKey, {timestamp: currentTime, count: 1});
        }
    }
    // handleFetchAllFkIfk
    return function* saga() {
        try {
            yield all([

                takeLatest(
                    actions.fetchOneWithFkIfk.type,
                    function* (action: SagaAction<{ matrxRecordId: MatrxRecordId }>) {
                        if (shouldSkip(actions.fetchOne.type, action.payload)) return;
                        yield call(withFullRelationConversion, entityKey, actions, action, actions.fetchOneWithFkIfkSuccess);
                        setCache(actions.fetchOneWithFkIfk.type, action.payload);
                        yield delay(250);
                        yield put(actions.resetFetchOneWithFkIfkStatus());
                    }
                ),


                takeLatest(
                    actions.fetchOne.type,
                    function* (action: SagaAction<{ matrxRecordId: MatrxRecordId }>) {
                        if (shouldSkip(actions.fetchOne.type, action.payload)) return;
                        yield call(withFullConversion, handleFetchOne, entityKey, actions, action, actions.fetchOneSuccess);
                        setCache(actions.fetchOne.type, action.payload);
                        yield delay(250);  // TODO: Consider reducing this to avoid issues when there are additional requests. But it might not be a problem, since the next request will will reset the status anyways.
                        yield put(actions.resetFetchOneStatus());
                    }
                ),
                takeLatest(
                    actions.fetchRecords.type,
                    function* (action: SagaAction<{ page: number; pageSize: number }>) {
                        sagaLogger.log('info', 'Handling fetchRecords', action.payload);
                        if (shouldSkip(actions.fetchRecords.type, action.payload)) return;
                        yield call(withConversion, handleFetchPaginated, entityKey, actions, action);
                        setCache(actions.fetchRecords.type, action.payload);
                    }
                ),
                takeLatest(
                    actions.fetchAll.type,
                    function* (action: SagaAction) {
                        sagaLogger.log('debug', 'Handling fetchAll', action.payload);
                        if (shouldSkip(actions.fetchAll.type, action.payload)) return;
                        yield call(withConversion, handleFetchAll, entityKey, actions, action);
                        setCache(actions.fetchAll.type, action.payload);
                    }
                ),
                takeLatest(
                    actions.fetchQuickReference.type,
                    function* (action: SagaAction) {
                        sagaLogger.log('debug', 'Handling fetchQuickReference', action.payload);
                        if (shouldSkip(actions.fetchQuickReference.type, action.payload)) return;
                        yield call(withConversion, handleFetchQuickReference, entityKey, actions, action);
                        setCache(actions.fetchQuickReference.type, action.payload);
                    }
                ),
                takeLatest(
                    actions.createRecord.type,
                    function* (action: SagaAction<EntityData<TEntity>>) {
                        sagaLogger.log('debug', 'Handling createRecord', action.payload);
                        if (shouldSkip(actions.createRecord.type, action.payload)) return;
                        yield call(withFullConversion, handleCreate, entityKey, actions, action);
                        setCache(actions.createRecord.type, action.payload);
                    }
                ),
                takeLatest(
                    actions.updateRecord.type,
                    function* (action: SagaAction<{
                        primaryKeyValues: Record<string, MatrxRecordId>;
                        data: Partial<EntityData<TEntity>>;
                    }>) {
                        sagaLogger.log('debug', 'Handling updateRecord', action.payload);
                        if (shouldSkip(actions.updateRecord.type, action.payload)) return;
                        yield call(withFullConversion, handleUpdate, entityKey, actions, action);
                        setCache(actions.updateRecord.type, action.payload);
                    }
                ),
                takeLatest(
                    actions.deleteRecord.type,
                    function* (action: PayloadAction<DeleteRecordPayload>) {
                        sagaLogger.log('debug', 'Handling deleteRecord', action.payload);
                        if (shouldSkip(actions.deleteRecord.type, action.payload)) return;
                        yield call(withFullConversion, handleDelete, entityKey, actions, action);
                        setCache(actions.deleteRecord.type, action.payload);
                    }
                ),
                takeLatest(
                    actions.executeCustomQuery.type,
                    function* (action: SagaAction<UnifiedQueryOptions<TEntity>>) {
                        sagaLogger.log('debug', 'Handling executeCustomQuery', action.payload);
                        if (shouldSkip(actions.executeCustomQuery.type, action.payload)) return;
                        yield call(withConversion, handleExecuteCustomQuery, entityKey, actions, action);
                        setCache(actions.executeCustomQuery.type, action.payload);
                    }
                ),
                takeLatest(
                    actions.fetchMetrics.type,
                    function* (action: SagaAction<UnifiedQueryOptions<TEntity>>) {
                        sagaLogger.log('debug', 'Handling fetchMetrics', action.payload);
                        if (shouldSkip(actions.fetchMetrics.type, action.payload)) return;
                        yield call(withConversion, handleFetchMetrics, entityKey, actions, action);
                        setCache(actions.fetchMetrics.type, action.payload);
                    }
                ),
                takeLatest(
                    actions.getOrFetchSelectedRecords.type,
                    function* (action: SagaAction<MatrxRecordId[]>) {
                        sagaLogger.log('debug', 'Handling getOrFetchSelectedRecords', action.payload);
                        if (shouldSkip(actions.getOrFetchSelectedRecords.type, action.payload)) return;
                        yield call(handleGetOrFetchSelectedRecords, entityKey, actions, action);
                        setCache(actions.getOrFetchSelectedRecords.type, action.payload);
                    }
                ),
                takeLatest(
                    actions.fetchSelectedRecords.type,
                    function* (action: SagaAction) {
                        sagaLogger.log('debug', 'Handling fetchSelectedRecords', action.payload);
                        if (shouldSkip(actions.fetchSelectedRecords.type, action.payload)) return;
                        yield call(withConversion, handleFetchSelectedRecords, entityKey, actions, action);
                        setCache(actions.fetchSelectedRecords.type, action.payload);
                    }
                ),
                takeEvery('SOCKET_ENTITY_EVENT', function* (action: any) {
                    if (action.payload.entityKey === entityKey) {
                        const {eventType, data} = action.payload;
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

