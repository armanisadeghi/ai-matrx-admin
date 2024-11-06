// lib/redux/entity/sagas.ts

import {call, put, takeLatest, delay, all, select, fork, takeEvery} from "redux-saga/effects";
import {PayloadAction} from "@reduxjs/toolkit";
import {supabase} from "@/utils/supabase/client";
import {createEntitySlice} from "@/lib/redux/entity/slice";
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {
    BatchOperationPayload,
    FilterPayload,
    HistoryEntry,
    MatrxRecordId,
    PrimaryKeyMetadata,
} from "@/lib/redux/entity/types";
import {
    selectEntityDatabaseName,
    UnifiedQueryOptions,
    selectFrontendConversion,
    selectPayloadOptionsDatabaseConversion,
} from "@/lib/redux/schema/globalCacheSelectors";
import {Draft} from "immer";
import EntityLogger from "@/lib/redux/entity/entityLogger";


const DEBOUNCE_MS = 300;
const CACHE_DURATION = 5 * 60 * 1000;

// Type Definitions
export interface SagaHandler<TEntity extends EntityKeys> {
    (
        entityKey: TEntity,
        actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
        api: any,
        action: PayloadAction<any>,
        tableName: string,
        dbQueryOptions: QueryOptions<TEntity>
    ): Generator;
}

export interface WithConversionParams<TEntity extends EntityKeys> {
    sagaHandler: SagaHandler<TEntity>;
    entityKey: TEntity;
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"];
    action: PayloadAction<any>;
}


export interface QueryOptions<TEntity extends EntityKeys> {
    tableName: string;
    filters?: Partial<Record<string, any>>;
    sorts?: Array<{
        column: string;
        ascending?: boolean;
    }>;
    limit?: number;
    offset?: number;
    columns?: Array<string>;
    primaryKeyMetadata?: PrimaryKeyMetadata;
}


function* initializeDatabaseApi(tableName: string) {
    return supabase.from(tableName);
}


export function* withConversion<TEntity extends EntityKeys>(
    sagaHandler: (
        entityKey: TEntity,
        actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
        api: any,
        action: PayloadAction<any>,
        tableName: string,
        dbQueryOptions: QueryOptions<TEntity>
    ) => any,
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    action: PayloadAction<any>
) {
    try {
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        EntityLogger.log('debug', 'Resolved table name', entityKey, {tableName});

        const api = yield call(initializeDatabaseApi, tableName);
        EntityLogger.log('debug', 'Database API initialized', entityKey);

        const dbQueryOptions = yield select(selectPayloadOptionsDatabaseConversion, {
            entityName: entityKey,
            options: action.payload?.options || {},
        });
        EntityLogger.log('debug', 'Query options', entityKey, dbQueryOptions);

        yield call(
            sagaHandler,
            entityKey,
            actions,
            api,
            action,
            tableName,
            dbQueryOptions
        );
    } catch (error: any) {
        EntityLogger.log('error', 'Error in conversion', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during database operation",
            code: error.code,
            details: error
        }));
        throw error;
    }
}

/*
function* handleSubscription<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"]
) {
    try {
        const subscriptionConfig = yield select(selectEntitySubscriptionConfig, entityKey);
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);

        if (subscriptionConfig.enabled) {
            const channel = supabase
                .channel(`${tableName}_changes`)
                .on('postgres_changes',
                    {event: '*', schema: 'public', table: tableName},
                    (payload) => handleSubscriptionEvents(entityKey, actions, payload)
                )
                .subscribe();

            // Store subscription reference if needed
            yield put(actions.setSubscription({channel}));
        }
    } catch (error: any) {
        console.error(`Subscription Error (${entityKey}):`, error);
    }
}
*/

// Main saga watcher
type SagaAction<P = any> = PayloadAction<P> & { type: string };

export function watchEntitySagas<TEntity extends EntityKeys>(entityKey: TEntity) {
    const {actions} = createEntitySlice(entityKey, {} as any);

    EntityLogger.log('info', `Initializing entity saga watcher`, entityKey);

    return function* saga() {
        try {
            EntityLogger.log('debug', 'Setting up saga watchers', entityKey);

            yield all([
                takeLatest(
                    actions.fetchRecords.type,
                    function* (action: SagaAction<{ page: number; pageSize: number }>) {
                        EntityLogger.log('debug', 'Handling fetchRecords', entityKey, action.payload);
                        yield call(withConversion, handleFetchPaginated, entityKey, actions, action);
                    }
                ),
                takeLatest(
                    actions.fetchOne.type,
                    function* (action: SagaAction<{ primaryKeyValues: Record<string, MatrxRecordId> }>) {
                        EntityLogger.log('debug', 'Handling fetchOne', entityKey, action.payload);
                        yield call(withConversion, handleFetchOne, entityKey, actions, action);
                    }
                ),
                takeLatest(
                    actions.fetchAll.type,
                    function* (action: SagaAction) {
                        EntityLogger.log('debug', 'Handling fetchAll', entityKey);
                        yield call(withConversion, handleFetchAll, entityKey, actions, action);
                    }
                ),
                takeLatest(
                    actions.fetchQuickReference.type,
                    function* (action: SagaAction) {
                        EntityLogger.log('debug', 'Handling fetchQuickReference', entityKey);
                        yield call(withConversion, handleFetchQuickReference, entityKey, actions, action);
                    }
                ),
                takeLatest(
                    actions.createRecord.type,
                    function* (action: SagaAction<EntityData<TEntity>>) {
                        EntityLogger.log('debug', 'Handling createRecord', entityKey, action.payload);
                        yield call(withConversion, handleCreate, entityKey, actions, action);
                    }
                ),
                takeLatest(
                    actions.updateRecord.type,
                    function* (action: SagaAction<{
                        primaryKeyValues: Record<string, MatrxRecordId>;
                        data: Partial<EntityData<TEntity>>;
                    }>) {
                        EntityLogger.log('debug', 'Handling updateRecord', entityKey, action.payload);
                        yield call(withConversion, handleUpdate, entityKey, actions, action);
                    }
                ),
                takeLatest(
                    actions.deleteRecord.type,
                    function* (action: SagaAction<{ primaryKeyValues: Record<string, MatrxRecordId> }>) {
                        EntityLogger.log('debug', 'Handling deleteRecord', entityKey, action.payload);
                        yield call(withConversion, handleDelete, entityKey, actions, action);
                    }
                ),
                takeLatest(
                    actions.executeCustomQuery.type,
                    function* (action: SagaAction<UnifiedQueryOptions<TEntity>>) {
                        EntityLogger.log('debug', 'Handling executeCustomQuery', entityKey, action.payload);
                        yield call(withConversion, handleExecuteCustomQuery, entityKey, actions, action);
                    }
                ),
                takeLatest(
                    actions.fetchMetrics.type,
                    function* (action: SagaAction<UnifiedQueryOptions<TEntity>>) {
                        EntityLogger.log('debug', 'Handling executeCustomQuery', entityKey, action.payload);
                        yield call(withConversion, handleFetchMetrics, entityKey, actions, action);
                    }
                ),

                // Handle socket events handleFetchMetrics
                takeEvery('SOCKET_ENTITY_EVENT', function* (action: any) {
                    if (action.payload.entityKey === entityKey) {
                        const {eventType, data} = action.payload;

                        EntityLogger.log('debug', `Handling socket event ${eventType}`, entityKey, data);

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
                        //         EntityLogger.log('warn', `Unhandled socket event type: ${eventType}`, entityKey);
                        // }
                    }
                }),
            ]);
        } catch (error: any) {
            EntityLogger.log('error', `Error in saga watcher: ${error.message}`, entityKey, error);
        }
    };
}


function* handleFetchOne<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<{ primaryKeyValues: Record<string, MatrxRecordId> }>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        EntityLogger.log('debug', 'Starting fetchOne', entityKey, action.payload);

        let query = api.select("*");

        Object.entries(action.payload.primaryKeyValues).forEach(([key, value]) => {
            query = query.eq(key, value);
        });

        const {data, error} = yield query.single();
        if (error) throw error;

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.fetchOneSuccess(frontendResponse));
    } catch (error: any) {
        EntityLogger.log('error', 'Error in fetchOne', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during fetch one.",
            code: error.code,
        }));
        throw error;
    }
}

function* handleFetchAll<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<void>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        EntityLogger.log('debug', 'Starting fetchAll', entityKey);

        let query = api.select("*");

        if (dbQueryOptions.filters) {
            Object.entries(dbQueryOptions.filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        const {data, error} = yield query;
        if (error) throw error;

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.fetchAllSuccess(frontendResponse));
    } catch (error: any) {
        EntityLogger.log('error', 'Error in fetchAll', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during fetch all.",
            code: error.code,
        }));
        throw error;
    }
}

function* handleFetchQuickReference<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<{
        primaryKeyFields: string[];
        displayField: string;
    }>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        EntityLogger.log('debug', 'Starting fetchQuickReference', entityKey, action.payload);

        const {primaryKeyFields, displayField} = action.payload;

        let query = api.select(`${primaryKeyFields.join(',')},${displayField}`);

        const {data, error} = yield query;
        if (error) throw error;

        const quickReferenceRecords = data.map(record => ({
            primaryKeyValues: primaryKeyFields.reduce((acc, field) => ({
                ...acc,
                [field]: record[field]
            }), {}),
            displayValue: record[displayField]
        }));

        yield put(actions.setQuickReference(quickReferenceRecords));
    } catch (error: any) {
        EntityLogger.log('error', 'Error in fetchQuickReference', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during quick reference fetch.",
            code: error.code,
        }));
        throw error;
    }
}

function* handleExecuteCustomQuery<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<QueryOptions<TEntity>>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
 ) {
    try {
        yield delay(DEBOUNCE_MS);

        let query = api.select(dbQueryOptions.columns?.join(',') || '*');

        if (dbQueryOptions.filters) {
            Object.entries(dbQueryOptions.filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        if (dbQueryOptions.sorts) {
            dbQueryOptions.sorts.forEach(sort => {
                query = query.order(sort.column, {ascending: sort.ascending});
            });
        }

        if (dbQueryOptions.limit) {
            query = query.limit(dbQueryOptions.limit);
        }

        if (dbQueryOptions.offset) {
            query = query.range(dbQueryOptions.offset, dbQueryOptions.offset + (dbQueryOptions.limit || 10) - 1);
        }

        const {data, error} = yield query;
        if (error) throw error;

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.executeCustomQuerySuccess(frontendResponse));
    } catch (error: any) {
        yield put(actions.setError({
            message: error.message || "An error occurred during custom query execution.",
            code: error.code,
        }));
        throw error;
    }
}


function* handleDelete<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<{ primaryKeyValues: Record<string, MatrxRecordId> }>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        let query = api.delete();

        Object.entries(action.payload.primaryKeyValues).forEach(([key, value]) => {
            query = query.eq(key, value);
        });

        const {error} = yield query;
        if (error) throw error;

        const recordToRemove = {
            ...action.payload.primaryKeyValues,
        } as Draft<EntityData<TEntity>>;

        yield put(actions.removeRecords([recordToRemove]));
    } catch (error: any) {
        yield put(actions.setError({
            message: error.message || "An error occurred during delete.",
            code: error.code,
        }));
        throw error;
    }
}

// Updated BatchOperation with proper typing
function* handleBatchOperation<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<BatchOperationPayload<TEntity>>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        const {operation, records, primaryKeyMetadata, options} = action.payload;
        const batchSize = options?.batchSize || 100;
        const results: EntityData<TEntity>[] = [];

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            let result;

            switch (operation) {
                case 'create':
                    const {data: insertData, error: insertError} = yield api
                        .insert(batch)
                        .select();
                    if (insertError) throw insertError;
                    if (insertData) results.push(...insertData);
                    break;

                case 'update':
                    for (const record of batch) {
                        let updateQuery = api.update(record);
                        primaryKeyMetadata.fields.forEach(field => {
                            updateQuery = updateQuery.eq(field, record[field]);
                        });
                        const {data: updateData, error: updateError} = yield updateQuery.select().single();
                        if (updateError) throw updateError;
                        if (updateData) results.push(updateData);
                    }
                    break;

                case 'delete':
                    for (const record of batch) {
                        let deleteQuery = api.delete();
                        primaryKeyMetadata.fields.forEach(field => {
                            deleteQuery = deleteQuery.eq(field, record[field]);
                        });
                        const {error: deleteError} = yield deleteQuery;
                        if (deleteError) throw deleteError;
                    }
                    break;
            }

            if (options?.onProgress) {
                options.onProgress((i + batch.length) / records.length * 100);
            }
        }

        const payload = {entityName: entityKey, data: results};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        switch (operation) {
            case 'create':
            case 'update':
                yield put(actions.upsertRecords(frontendResponse as Draft<EntityData<TEntity>>[]));
                break;
            case 'delete':
                yield put(actions.removeRecords(records as Draft<EntityData<TEntity>>[]));
                break;
        }
    } catch (error: any) {
        yield put(actions.setError({
            message: error.message || "An error occurred during batch operation.",
            code: error.code,
        }));
        throw error;
    }
}


function* handleSubscriptionEvents<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: any;
        old: any;
    }
) {
    try {
        EntityLogger.log('debug', 'Handling subscription event', entityKey, payload);

        const conversionPayload = {
            entityName: entityKey,
            data: payload.new || payload.old
        };
        const frontendData = yield select(selectFrontendConversion, conversionPayload);

        switch (payload.eventType) {
            case 'INSERT':
                yield put(actions.upsertRecords([frontendData]));
                break;
            case 'UPDATE':
                yield put(actions.upsertRecords([frontendData]));
                break;
            case 'DELETE':
                yield put(actions.removeRecords([frontendData]));
                break;
        }

        // Update quick reference if needed
        const metadata = yield select(state => state.entities[entityKey].entityMetadata);
        if (metadata) {
            yield call(handleQuickReferenceUpdate, entityKey, actions, frontendData, {
                primaryKeyFields: metadata.primaryKeyMetadata.fields,
                displayField: metadata.fields.find(f => f.isDisplayField)?.name || metadata.primaryKeyMetadata.fields[0]
            });
        }
    } catch (error: any) {
        EntityLogger.log('error', 'Subscription event handling error', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during subscription handling.",
            code: error.code,
            details: error
        }));
    }
}

function* handleQuickReferenceUpdate<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    record: EntityData<TEntity>,
    metadata: {
        primaryKeyFields: string[];
        displayField: string;
    }
) {
    try {
        EntityLogger.log('debug', 'Updating quick reference', entityKey, {record, metadata});

        if (metadata.displayField && record[metadata.displayField]) {
            const quickReferenceRecord = {
                primaryKeyValues: metadata.primaryKeyFields.reduce((acc, field) => ({
                    ...acc,
                    [field]: record[field]
                }), {}),
                displayValue: record[metadata.displayField]
            };

            yield put(actions.setQuickReference([quickReferenceRecord]));
        }
    } catch (error: any) {
        EntityLogger.log('error', 'Quick reference update error', entityKey, error);
    }
}

function* handleRefreshData<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<void>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        EntityLogger.log('debug', 'Starting data refresh', entityKey);

        const currentState = yield select(state => state.entities[entityKey]);
        const {page, pageSize} = currentState.pagination;

        // Create a new action for fetch paginated
        const fetchAction = createPayloadAction(actions.fetchRecords.type, {
            page,
            pageSize
        });

        // Use put instead of call for saga actions
        yield put(actions.fetchRecords({page, pageSize}));

        // Refresh quick reference if needed
        if (currentState.quickReference.fetchComplete) {
            const metadata = currentState.entityMetadata;
            const quickRefAction = createPayloadAction(actions.fetchQuickReference.type, {
                primaryKeyFields: metadata.primaryKeyMetadata.fields,
                displayField: metadata.fields.find(f => f.isDisplayField)?.name
                    || metadata.primaryKeyMetadata.fields[0]
            });

            yield put(actions.fetchQuickReference());
        }

        yield put(actions.setFlags({needsRefresh: false}));
        EntityLogger.log('debug', 'Data refresh completed', entityKey);
    } catch (error: any) {
        EntityLogger.log('error', 'Refresh data error', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during refresh.",
            code: error.code,
            details: error
        }));
    }
}

// Cache Management
function* handleCacheInvalidation<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"]
) {
    try {
        EntityLogger.log('debug', 'Checking cache invalidation', entityKey);

        const currentState = yield select(state => state.entities[entityKey]);
        const now = new Date().getTime();
        const cacheKey = currentState.entityMetadata.primaryKeyMetadata.database_fields.join('::');
        const lastFetched = new Date(currentState.cache.lastFetched[cacheKey] || 0).getTime();

        if (now - lastFetched > currentState.cache.staleTime) {
            EntityLogger.log('debug', 'Cache invalidated', entityKey, {
                lastFetched: new Date(lastFetched).toISOString(),
                staleTime: currentState.cache.staleTime
            });

            yield put(actions.invalidateCache());
            yield put(actions.refreshData());
        }
    } catch (error: any) {
        EntityLogger.log('error', 'Cache invalidation error', entityKey, error);
    }
}

function* handleHistoryUpdate<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    operation: 'create' | 'update' | 'delete' | 'bulk',
    newData: EntityData<TEntity> | EntityData<TEntity>[],
    previousData?: EntityData<TEntity> | EntityData<TEntity>[],
    metadata?: {
        user?: string;
        reason?: string;
        batchId?: string;
    }
) {
    try {
        EntityLogger.log('debug', 'Updating history', entityKey, {
            operation,
            metadata
        });

        const historyEntry: Draft<HistoryEntry<TEntity>> = {
            timestamp: new Date().toISOString(),
            operation,
            data: newData as Draft<EntityData<TEntity>> | Draft<EntityData<TEntity>>[],
            previousData: previousData as Draft<EntityData<TEntity>> | Draft<EntityData<TEntity>>[],
            metadata: {
                ...metadata,
                user: metadata?.user || 'system'
            }
        };

        yield put(actions.pushToHistory(historyEntry));
        EntityLogger.log('debug', 'History updated successfully', entityKey);
    } catch (error: any) {
        EntityLogger.log('error', 'History update error', entityKey, error);
    }
}


// Filter Management
function* handleFilterChange<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<FilterPayload>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        EntityLogger.log('debug', 'Handling filter change', entityKey, action.payload);

        yield delay(DEBOUNCE_MS);

        const currentState = yield select(state => state.entities[entityKey]);
        yield put(actions.setPage(1));

        let query = api.select("*", {count: "exact"});

        // Apply filters
        if (action.payload.conditions.length > 0) {
            action.payload.conditions.forEach(condition => {
                if (condition.operator === 'eq') {
                    query = query.eq(condition.field, condition.value);
                }
                // Add other operators as needed
            });
        }

        const {data, error, count} = yield query;
        if (error) throw error;

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.fetchRecordsSuccess({
            data: frontendResponse,
            page: 1,
            pageSize: currentState.pagination.pageSize,
            totalCount: count || 0
        }));

        EntityLogger.log('debug', 'Filter change applied successfully', entityKey);
    } catch (error: any) {
        EntityLogger.log('error', 'Filter change error', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during filter update.",
            code: error.code,
            details: error
        }));
    }
}


function* handleFetchPaginated<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<{
        page: number;
        pageSize: number;
        options?: QueryOptions<TEntity>;
        maxCount?: number;
    }>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        EntityLogger.log('debug', 'Starting fetchPaginated', entityKey, action.payload);

        const from = (action.payload.page - 1) * action.payload.pageSize;
        const to = action.payload.page * action.payload.pageSize - 1;

        EntityLogger.log('debug', 'Executing query', entityKey, {from, to});

        const {data, error, count} = yield api
            .select("*", {count: "exact"})
            .range(from, to);

        if (error) {
            EntityLogger.log('error', 'Query error', entityKey, error);
            throw error;
        }

        EntityLogger.log('debug', 'Query successful', entityKey, {
            dataCount: data?.length,
            totalCount: count
        });

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.fetchRecordsSuccess({
            data: frontendResponse,
            page: action.payload.page,
            pageSize: action.payload.pageSize,
            totalCount: count || 0
        }));

    } catch (error: any) {
        EntityLogger.log('error', 'Error in fetchPaginated', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during fetch paginated.",
            code: error.code,
            details: error
        }));
        throw error;
    }
}

function createPayloadAction<T>(type: string, payload: T): PayloadAction<T> {
    return {type, payload};
}

function* handleCreate<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<EntityData<TEntity>>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        EntityLogger.log('debug', 'Starting create operation', entityKey, action.payload);

        const {data, error} = yield api
            .insert(action.payload)
            .select()
            .single();

        if (error) throw error;

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.createRecordSuccess(frontendResponse));

        // Update history using put instead of call
        yield put(actions.pushToHistory({
            timestamp: new Date().toISOString(),
            operation: 'create',
            data: frontendResponse
        }));

        // Invalidate cache
        yield put(actions.invalidateCache());

        // Update quick reference
        if (frontendResponse) {
            const metadata = yield select(state => state.entities[entityKey].entityMetadata);
            const displayField = metadata.fields.find(f => f.isDisplayField)?.name
                || metadata.primaryKeyMetadata.fields[0];

            yield put(actions.setQuickReference([{
                primaryKeyValues: metadata.primaryKeyMetadata.fields.reduce((acc, field) => ({
                    ...acc,
                    [field]: frontendResponse[field]
                }), {}),
                displayValue: frontendResponse[displayField]
            }]));
        }

    } catch (error: any) {
        EntityLogger.log('error', 'Create operation error', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during create.",
            code: error.code,
        }));
        throw error;
    }
}

function* handleUpdate<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<{
        primaryKeyValues: Record<string, MatrxRecordId>;
        data: Partial<EntityData<TEntity>>;
    }>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        EntityLogger.log('debug', 'Starting update operation', entityKey, action.payload);

        // Get previous state
        const previousData = yield select(state => {
            const recordKey = Object.entries(action.payload.primaryKeyValues)
                .map(([key, value]) => `${key}:${value}`)
                .join('::');
            return state.entities[entityKey].records[recordKey];
        });

        // Optimistic update
        if (previousData) {
            const optimisticData = {...previousData, ...action.payload.data};
            yield put(actions.upsertRecords([optimisticData]));
        }

        let query = api.update(action.payload.data);

        // Apply primary key conditions
        Object.entries(action.payload.primaryKeyValues).forEach(([key, value]) => {
            query = query.eq(key, value);
        });

        const {data, error} = yield query.select().single();

        if (error) throw error;

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.updateRecordSuccess(frontendResponse));

        // Update history
        yield put(actions.pushToHistory({
            timestamp: new Date().toISOString(),
            operation: 'update',
            data: frontendResponse,
            previousData
        }));

        // Invalidate cache
        yield put(actions.invalidateCache());

        // Update quick reference
        if (frontendResponse) {
            const metadata = yield select(state => state.entities[entityKey].entityMetadata);
            const displayField = metadata.fields.find(f => f.isDisplayField)?.name
                || metadata.primaryKeyMetadata.fields[0];

            yield put(actions.setQuickReference([{
                primaryKeyValues: metadata.primaryKeyMetadata.fields.reduce((acc, field) => ({
                    ...acc,
                    [field]: frontendResponse[field]
                }), {}),
                displayValue: frontendResponse[displayField]
            }]));
        }

    } catch (error: any) {
        EntityLogger.log('error', 'Update operation error', entityKey, error);

        // Revert optimistic update if needed TODO: Needs implementation
        // if (previousData) {
        //     yield put(actions.upsertRecords([previousData]));
        // }

        yield put(actions.setError({
            message: error.message || "An error occurred during update.",
            code: error.code,
        }));
        throw error;
    }
}

function* handleFetchMetrics<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<void>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        EntityLogger.log('debug', 'Fetching entity metrics', entityKey);

        // Fetch operation counts
        const operationCounts = yield all({
            creates: api.select('count(*)', { head: true })
                .eq('operation_type', 'create'),
            updates: api.select('count(*)', { head: true })
                .eq('operation_type', 'update'),
            deletes: api.select('count(*)', { head: true })
                .eq('operation_type', 'delete'),
        });

        // Fetch performance metrics
        const performanceMetrics = yield call(async () => {
            const response = await api.rpc('get_entity_performance_metrics', {
                entity_name: tableName
            });
            return response.data;
        });

        // Fetch cache statistics
        const cacheStats = yield call(async () => {
            const response = await api.rpc('get_entity_cache_stats', {
                entity_name: tableName
            });
            return response.data;
        });

        // Fetch error rates
        const errorRates = yield call(async () => {
            const response = await api.rpc('get_entity_error_rates', {
                entity_name: tableName,
                time_range: '24h'
            });
            return response.data;
        });

        yield put(actions.setMetrics({
            operationCounts,
            performanceMetrics,
            cacheStats,
            errorRates,
            lastUpdated: new Date().toISOString()
        }));

    } catch (error: any) {
        EntityLogger.log('error', 'Error fetching metrics', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred while fetching metrics.",
            code: error.code,
        }));
        throw error;
    }
}


/*
// Socket ==========================================================

function* handleCreateFromSocket<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'],
    data: EntityData<TEntity>
) {
    try {
        // Save data into the database
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        const api = yield call(initializeDatabaseApi, tableName);

        const { error } = yield api.insert(data);
        if (error) throw error;

        // Update state
        yield put(actions.upsertRecords([data]));

        EntityLogger.log('info', `Handled create from socket for ${entityKey}`, data);
    } catch (error: any) {
        EntityLogger.log('error', `Error handling socket create: ${error.message}`, entityKey, error);
    }
}

function* handleUpdateFromSocket<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'],
    data: EntityData<TEntity>
) {
    try {
        // Save data into the database
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        const api = yield call(initializeDatabaseApi, tableName);

        const primaryKeyValues = getPrimaryKeyValues(entityKey, data); // Implement this function based on your schema

        let query = api.update(data);
        Object.entries(primaryKeyValues).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        const { error } = yield query;
        if (error) throw error;

        // Update state
        yield put(actions.upsertRecords([data]));

        EntityLogger.log('info', `Handled update from socket for ${entityKey}`, data);
    } catch (error: any) {
        EntityLogger.log('error', `Error handling socket update: ${error.message}`, entityKey, error);
    }
}

function* handleDeleteFromSocket<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'],
    data: EntityData<TEntity>
) {
    try {
        // Delete data from the database
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        const api = yield call(initializeDatabaseApi, tableName);

        const primaryKeyValues = getPrimaryKeyValues(entityKey, data); // Implement this function

        let query = api.delete();
        Object.entries(primaryKeyValues).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        const { error } = yield query;
        if (error) throw error;

        // Update state
        yield put(actions.deleteRecordSuccess(primaryKeyValues));

        EntityLogger.log('info', `Handled delete from socket for ${entityKey}`, data);
    } catch (error: any) {
        EntityLogger.log('error', `Error handling socket delete: ${error.message}`, entityKey, error);
    }
}

*/


// =========== Socket Samples ================
/*
function* handleCreate<TEntity extends EntityKeys>(
    // ... existing parameters ...
) {
    try {
        // ... existing code ...

        // Emit socket event to notify backend and other clients
        const socketManager = SocketManager.getInstance();
        socketManager.emit(`entity/${entityKey}/created`, frontendResponse);

        // ... existing code ...
    } catch (error: any) {
        // ... existing error handling ...
    }
}

function* handleUpdate<TEntity extends EntityKeys>(
    // ... existing parameters ...
) {
    try {
        // ... existing code ...

        // Emit socket event to notify backend and other clients
        const socketManager = SocketManager.getInstance();
        socketManager.emit(`entity/${entityKey}/updated`, frontendResponse);

        // ... existing code ...
    } catch (error: any) {
        // ... existing error handling ...
    }
}

function* handleDelete<TEntity extends EntityKeys>(
    // ... existing parameters ...
) {
    try {
        // ... existing code ...

        // Emit socket event to notify backend and other clients
        const socketManager = SocketManager.getInstance();
        socketManager.emit(`entity/${entityKey}/deleted`, action.payload.primaryKeyValues);

        // ... existing code ...
    } catch (error: any) {
        // ... existing error handling ...
    }
}*/

//================================================================


export {
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
    handleCacheInvalidation
};
