// lib/redux/entity/entitySagas.ts

import {call, put, takeLatest, all, select} from "redux-saga/effects";
import {PayloadAction} from "@reduxjs/toolkit";
import {createEntitySlice} from "@/lib/redux/entity/entitySliceCreator";
import {
    AutomationEntities,
    EntityKeys,
    EntityData,
    createFormattedRecord,
    EntityRecord,
} from "@/types/entityTypes";
import {supabase} from "@/utils/supabase/client";
import {
    selectEntityDatabaseName,
    selectFrontendConversion, selectPayloadOptionsDatabaseConversion,
    selectQueryDatabaseConversion,
    selectUnifiedQueryDatabaseConversion, UnifiedQueryOptions
} from "@/lib/redux/schema/globalCacheSelectors";


function* initializeDatabaseApi(tableName: string) {
    return supabase.from(tableName);
}

export type QueryOptions<TEntity extends EntityKeys> = {
    tableName: string; // Table name as a plain string
    filters?: Partial<Record<string, any>>; // Filters use string for field names
    sorts?: Array<{
        column: string; // Column names are strings
        ascending?: boolean;
    }>;
    limit?: number;
    offset?: number;
    columns?: Array<string>; // Column names as strings
};

// Updated WithConversionParams with simplified string types
interface WithConversionParams<TEntity extends EntityKeys> {
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
        console.log("withConversion converted tableName:", tableName);
        console.log("withConversion has action:", action);
        console.log("withConversion has payload.options:", action.payload.options);

        const api = yield call(initializeDatabaseApi, tableName);

        const dbQueryOptions = yield select(selectPayloadOptionsDatabaseConversion, {
            entityName: entityKey,
            options: action.payload.options,
        });

        console.log("withConversion has Converted dbQueryOptions:", dbQueryOptions);

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
        yield put(actions.setError({
                message: error.message || "An error occurred in withConversion.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;

    }
}


function prepareQueryOptions<TEntity extends EntityKeys>(
    baseQuery: any,
    options: QueryOptions<TEntity>
): any {
    if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
            baseQuery = baseQuery.eq(key, value); // Directly apply the filter
        }
    }
    if (options.sorts) {
        for (const {column, ascending = true} of options.sorts) {
            baseQuery = baseQuery.order(column, {ascending}); // Apply sorting
        }
    }
    if (options.limit) {
        baseQuery = baseQuery.limit(options.limit);
    }
    if (options.offset) {
        baseQuery = baseQuery.range(
            options.offset,
            options.offset + (options.limit || 0) - 1
        );
    }
    if (options.columns?.length) {
        baseQuery = baseQuery.select(options.columns.join(","));
    }
    return baseQuery;
}

/**
 * Utility function to get primary key value from a record
 */

/*
function* getPrimaryKeyInfo<TEntity extends EntityKeys>(
    databaseApi: DatabaseApiWrapper<TEntity>,
    record: EntityRecord<TEntity, 'frontend'>
): Generator<any, { field: string; value: string | number }> {
    const primaryKeyField = yield call([databaseApi, databaseApi.getPrimaryKeyField]);
    const value = record[primaryKeyField];
    return {field: primaryKeyField, value};
}
*/

function* handleFetchByField<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<{
        field: keyof EntityRecord<TEntity, "frontend">;
        value: string | number;
        options?: QueryOptions<TEntity>;
    }>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        yield put(actions.setLoading(true));

        const { data, error } = yield api
            .select("*")
            .eq(action.payload.field as string, action.payload.value);

        if (error) {
            throw error;
        }

        const payload = { entityName: entityKey, data };
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.setTableData(frontendResponse));
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleFetchByField.",
                code: error.code
            })
        );
        console.error("handleFetchByField error:", error);
    } finally {
        yield put(actions.setLoading(false));
    }
}

// TODO: Not done
function* handleFetchPkAndDisplayFields<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"]
) {
    try {
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        console.log("handleFetchPkAndDisplayFields converted tableName:", tableName);
        const databaseApi = yield call(initializeDatabaseApi, tableName);

        const pkField = yield call([databaseApi, databaseApi.getPrimaryKeyField]);
        const displayField = yield call([databaseApi, databaseApi.getDisplayField]);

        const data: EntityRecord<TEntity, "frontend">[] = yield call(
            [databaseApi, databaseApi.fetchAll],
            {
                columns: [pkField, ...(displayField ? [displayField] : [])],
            }
        );

        const pkAndDisplayFields = data.map((record) => ({
            pk: record[pkField],
            display: displayField ? record[displayField] : undefined,
        }));

        yield put(actions.setAllPkAndDisplayFields(pkAndDisplayFields));
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleFetchPkAndDisplayFields.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;

    }
}

// TODO: Not done

function* handleCreateBackup<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"],
    action: PayloadAction<{ key: string }>
) {
    try {
        const currentData: EntityRecord<TEntity, "frontend">[] = yield select(
            (state) => state[entityKey].data
        );

        yield put(
            actions.setBackup({
                key: action.payload.key,
                data: currentData,
            })
        );
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleCreateBackup.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;

    }
}

// TODO: Not done
function* handleRestoreBackup<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"],
    action: PayloadAction<{ key: string }>
) {
    try {
        const backups: Record<string, EntityRecord<TEntity, "frontend">[]> =
            yield select((state) => state[entityKey].backups);

        const backupData = backups[action.payload.key];
        if (backupData) {
            yield put(actions.setTableData(backupData));
        }
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleRestoreBackup.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;

    }
}

// TODO: Not done
function* handleFetchSimple<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"],
    action: PayloadAction<{
        id: string | number;
        options?: QueryOptions<TEntity>;
    }>
) {
    try {
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        console.log("handleFetchSimple converted tableName:", tableName);
        const databaseApi = yield call(initializeDatabaseApi, tableName);

        yield put(actions.setLoading(true));

        const data: EntityRecord<TEntity, "frontend"> = yield call(
            [databaseApi, databaseApi.fetchSimple],
            action.payload.id,
            action.payload.options
        );

        if (data) {
            yield put(actions.setSelectedItem(data));
        }
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleFetchSimple.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;

    } finally {
        yield put(actions.setLoading(false));
    }
}

// TODO: Not done
function* handleSubscribeToChanges<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"],
    action: PayloadAction<{
        callback: (data: EntityRecord<TEntity, "frontend">[]) => void;
    }>
) {
    try {
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        console.log("handleSubscribeToChanges converted tableName:", tableName);
        const databaseApi = yield call(initializeDatabaseApi, tableName);

        yield call(
            [databaseApi, databaseApi.subscribeToChanges],
            action.payload.callback
        );
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleSubscribeToChanges.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;

    }
}

// TODO: Not done
function* handleUnsubscribeFromChanges<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"]
) {
    try {
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        console.log("handleUnsubscribeFromChanges converted tableName:", tableName);
        const databaseApi = yield call(initializeDatabaseApi, tableName);

        yield call([databaseApi, databaseApi.unsubscribeFromChanges]);
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleUnsubscribeFromChanges.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;

    }
}

/**
 * Handle paginated query for an entity
 */

// TODO: Not done
function* MakeQuery<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"],
    action: PayloadAction<{
        options?: QueryOptions<TEntity>;
        page?: number;
        pageSize?: number;
    }>
) {
    try {
        const state = yield select();
        const entityState = state[entityKey];
        const optionsKey = JSON.stringify(action.payload || {});
        const lastFetchedTime = entityState.lastFetched[optionsKey];
        const now = Date.now();
        const isStale =
            !lastFetchedTime || now - lastFetchedTime > entityState.staleTime;

        if (!isStale) return;

        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        console.log("MakeQuery converted tableName:", tableName);
        const databaseApi = yield call(initializeDatabaseApi, tableName);

        yield put(actions.setLoading(true));

        const result: {
            data: EntityRecord<TEntity, "frontend">[];
            page: number;
            pageSize: number;
            totalCount: number;
        } = yield call(
            [databaseApi, databaseApi.fetchPaginated],
            action.payload.options,
            action.payload.page,
            action.payload.pageSize
        );

        yield put(
            actions.setPaginatedData({
                data: result.data,
                page: result.page,
                pageSize: result.pageSize,
                totalCount: result.totalCount,
            })
        );
        yield put(actions.setLastFetched({key: optionsKey, time: now}));
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during MakeQuery.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;

    } finally {
        yield put(actions.setLoading(false));
    }
}

/**
 * Updated handlers using dynamic primary key
 */
function* handleFetchOne<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"],
    action: PayloadAction<{
        primaryKeyValue: string | number;
        options?: QueryOptions<TEntity>;
    }>
) {
    try {
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        console.log("handleFetchOne converted tableName:", tableName);
        const databaseApi = yield call(initializeDatabaseApi, tableName);

        const state = yield select();
        const entityState = state[entityKey];
        const primaryKeyField = yield call([
            databaseApi,
            databaseApi.getPrimaryKeyField,
        ]);

        const item = entityState.data.find(
            (item: EntityRecord<TEntity, "frontend">) =>
                item[primaryKeyField] === action.payload.primaryKeyValue
        );

        const lastFetchedTime =
            entityState.lastFetched[action.payload.primaryKeyValue];
        const now = Date.now();
        const isStale =
            !lastFetchedTime || now - lastFetchedTime > entityState.staleTime;

        if (item && !isStale) {
            yield put(actions.setSelectedItem(item));
            return;
        }

        yield put(actions.setLoading(true));

        const data: EntityRecord<TEntity, "frontend"> = yield call(
            [databaseApi, databaseApi.fetchByPrimaryKey],
            action.payload.primaryKeyValue,
            action.payload.options
        );

        if (data) {
            yield put(actions.setSelectedItem(data));
            yield put(
                actions.setLastFetched({
                    key: action.payload.primaryKeyValue.toString(),
                    time: now,
                })
            );
        }
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleFetchOne.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;

    } finally {
        yield put(actions.setLoading(false));
    }
}

/**
 * Handle creating a new record
 */
function* handleCreate<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    action: PayloadAction<Partial<EntityData<TEntity>>>
) {
    try {
        // Select table name and initialize database API
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        const databaseApi = yield call(initializeDatabaseApi, tableName);

        console.log("handleCreate starting with:", entityKey, action.payload);

        // Insert data into the database
        const { data, error } = yield call([databaseApi, databaseApi.insert], action.payload);

        if (error) {
            throw error;
        }

        // Convert database response for frontend compatibility
        const frontendResponse = yield select(selectFrontendConversion, data);

        // Dispatch success action with converted data
        yield put(actions.createSuccess(frontendResponse));
    } catch (error: any) {
        // Dispatch failure action if an error occurs
        yield put(
            actions.createFailure({
                message: error.message || "An error occurred during handleCreate.",
                code: error.code
            })
        );
        console.error("handleCreate error:", error);
    }
}

/**
 * Handle updating a record
 */
function* handleUpdate<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"],
    action: PayloadAction<{
        primaryKeyValue: string | number;
        data: Partial<EntityRecord<TEntity, "frontend">>;
    }>
) {
    try {
        yield put(actions.setLoading(true));

        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        const primaryKey: string = yield select((state) => state[entityKey].primaryKey);
        const databaseApi = yield call(initializeDatabaseApi, tableName);

        console.log("handleUpdate starting with:", entityKey, action.payload);

        const { data: updatedData, error } = yield call(
            [databaseApi, databaseApi.update],
            action.payload.primaryKeyValue,
            action.payload.data
        );

        if (error) {
            throw error;
        }

        if (updatedData) {
            const currentData: EntityRecord<TEntity, "frontend">[] = yield select(
                (state) => state[entityKey].data
            );

            const newData = currentData.map(item =>
                item[primaryKey] === action.payload.primaryKeyValue ? updatedData : item
            );

            yield put(actions.setTableData(newData));

            yield put(
                actions.setLastFetched({
                    key: action.payload.primaryKeyValue.toString(),
                    time: Date.now(),
                })
            );
        }
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleUpdate.",
                code: error.code
            })
        );
        console.error("handleUpdate error:", error);
    } finally {
        yield put(actions.setLoading(false));
    }
}

/**
 * Handle deleting a record
 */
function* handleDelete<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"],
    action: PayloadAction<string | number>
) {
    try {
        yield put(actions.setLoading(true));

        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        const databaseApi = yield call(initializeDatabaseApi, tableName);

        const primaryKey: string = yield select(
            (state) => state[entityKey].primaryKey || "id"
        );

        const success: boolean = yield call(
            [databaseApi, databaseApi.delete],
            action.payload
        );

        if (success) {
            const currentData: EntityRecord<TEntity, "frontend">[] = yield select(
                (state) => state[entityKey].data
            );

            const filteredData = currentData.filter(
                (item) => item[primaryKey] !== action.payload
            );

            yield put(actions.setTableData(filteredData));
            yield put(actions.removeLastFetchedKey(action.payload.toString()));
        }
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleDelete.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;
    } finally {
        yield put(actions.setLoading(false));
    }
}


function* handleFetchAll<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<{
        options?: QueryOptions<TEntity>;
    }>,
    tableName: string,
    dbQueryOptions: QueryOptions<TEntity>
) {
    try {
        yield put(actions.setLoading(true));

        const { data, error } = yield api.select("*");

        if (error) {
            throw error;
        }

        const payload = { entityName: entityKey, data };
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.setTableData(frontendResponse));

        yield put(
            actions.setLastFetched({
                key: "all",
                time: Date.now(),
            })
        );
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleFetchAll.",
                code: error.code
            })
        );
        console.error("handleFetchAll error:", error);
    } finally {
        yield put(actions.setLoading(false));
    }
}

function* handleFetchByPrimaryKey<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice>["actions"],
    action: PayloadAction<{
        primaryKeyValue: string | number;
        options?: QueryOptions<TEntity>;
    }>
) {
    try {
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        console.log("handleFetchByPrimaryKey converted tableName:", tableName);
        const databaseApi = yield call(initializeDatabaseApi, tableName);

        yield put(actions.setLoading(true));

        const data: EntityRecord<TEntity, "frontend"> = yield call(
            [databaseApi, databaseApi.fetchByPrimaryKey],
            action.payload.primaryKeyValue,
            action.payload.options
        );

        if (data) {
            yield put(actions.setSelectedItem(data));
        }
    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleFetchByPrimaryKey.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;

    } finally {
        yield put(actions.setLoading(false));
    }
}

/**
 * Handle custom query execution
 */
function* handleExecuteCustomQuery<TEntity extends EntityKeys>(
    actions: {
        executeQueryRequest: (payload: any) => any;
        executeQuerySuccess: (payload: any[]) => any;
        executeQueryFailure: (payload: { message: string; code?: number }) => any;
    },
    api: any,
    action: PayloadAction<{
        queryFn: (baseQuery: any) => Promise<any>;
        format?: "frontend" | "database";
    }>,
    tableName: string,
    dbQueryOptions: any
) {
    try {
        // Start loading
        yield put(actions.executeQueryRequest({}));

        // Execute the custom query with `queryFn`
        const rawData = yield call(action.payload.queryFn, api);

        const frontendData =
            action.payload.format === "database"
            ? rawData
            : yield select(selectFrontendConversion, rawData);

        yield put(actions.executeQuerySuccess(frontendData));
    } catch (error: any) {
        yield put(actions.executeQueryFailure({message: error.message, code: error.code}));
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
        const from = (action.payload.page - 1) * action.payload.pageSize;
        const to = action.payload.page * action.payload.pageSize - 1;

        const {data, error, count} = yield api
            .select("*", {count: "exact"})
            .range(from, to);

        if (error) {
            throw error;
        }

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        const result = {
            data: frontendResponse,
            page: action.payload.page,
            pageSize: action.payload.pageSize,
            totalCount: count,
            maxCount: action.payload.maxCount || 10000,
        };
        yield put(actions.fetchPaginatedSuccess(result));

    } catch (error: any) {
        yield put(actions.setError({
                message: error.message || "An error occurred during handleFetchPaginated.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;
    }
}

type EntitySchemaType<TEntity extends EntityKeys> = AutomationEntities[TEntity];

export function createEntitySaga<TEntity extends EntityKeys>(
    entityKey: TEntity
) {
    const {actions} = createEntitySlice(entityKey);

    return function* saga() {
        yield all([

/*
            takeLatest(
                actions.fetchRecords.type,
                withConversion.bind(null, handleFetchPaginated, entityKey, actions)
            ),
            takeLatest(
                actions.fetchQuickReference.type,
                withConversion.bind(null, handleFetchPaginated, entityKey, actions)
            ),
            takeLatest(
                actions.fetchOne.type,
                withConversion.bind(null, handleFetchOne, entityKey, actions)
            ),
            takeLatest(
                actions.createRecord.type,
                withConversion.bind(null, handleCreate, entityKey, actions)
            ),
            takeLatest(
                actions.updateRecord.type,
                withConversion.bind(null, handleUpdate, entityKey, actions)
            ),
            takeLatest(
                actions.deleteRecord.type,
                withConversion.bind(null, handleDelete, entityKey, actions)
            ),
            takeLatest(
                actions.batchOperation.type,
                withConversion.bind(null, handleBatchOperation, entityKey, actions)
            ),
            takeLatest(
                actions.fetchAll.type,
                withConversion.bind(null, handleFetchAll, entityKey, actions)
            ),
            takeLatest(
                actions.executeCustomQuery.type,
                withUnifiedConversion.bind(null, handleExecuteCustomQuery, entityKey, actions)
            ),
*/

            takeLatest(
                actions.fetchRequest.type,
                withConversion.bind(null, handleFetchPaginated, entityKey, actions)
            ),
            takeLatest(
                actions.fetchPaginatedRequest.type,
                withConversion.bind(null, handleFetchPaginated, entityKey, actions)
            ),
            takeLatest(
                actions.fetchOneRequest.type,
                withConversion.bind(null, handleFetchOne, entityKey, actions)
            ),
            takeLatest(
                actions.createRequest.type,
                withConversion.bind(null, handleCreate, entityKey, actions)
            ),
            takeLatest(
                actions.updateRequest.type,
                withConversion.bind(null, handleUpdate, entityKey, actions)
            ),
            takeLatest(
                actions.deleteRequest.type,
                withConversion.bind(null, handleDelete, entityKey, actions)
            ),
            takeLatest(
                actions.executeQueryRequest.type,
                withConversion.bind(null, handleExecuteCustomQuery, entityKey, actions)
            ),
            takeLatest(
                actions.fetchPaginatedDirectlyRequest.type,
                withConversion.bind(null, MakeQuery, entityKey, actions)
            ),
            takeLatest(
                actions.fetchByPrimaryKeyRequest.type,
                withConversion.bind(null, handleFetchByPrimaryKey, entityKey, actions)
            ),
            takeLatest(
                actions.fetchByFieldRequest.type,
                withConversion.bind(null, handleFetchByField, entityKey, actions)
            ),
            takeLatest(
                actions.fetchSimpleRequest.type,
                withConversion.bind(null, handleFetchSimple, entityKey, actions)
            ),
            takeLatest(
                actions.subscribe.type,
                withConversion.bind(null, handleSubscribeToChanges, entityKey, actions)
            ),
            takeLatest(
                actions.unsubscribe.type,
                withConversion.bind(
                    null,
                    handleUnsubscribeFromChanges,
                    entityKey,
                    actions
                )
            ),
            takeLatest(
                actions.fetchAllRequest.type,
                withConversion.bind(null, handleFetchAll, entityKey, actions)
            ),
            takeLatest(
                actions.fetchPkAndDisplayFieldsRequest.type,
                withConversion.bind(
                    null,
                    handleFetchPkAndDisplayFields,
                    entityKey,
                    actions
                )
            ),
            takeLatest(
                actions.createBackupRequest.type,
                withConversion.bind(null, handleCreateBackup, entityKey, actions)
            ),
            takeLatest(
                actions.restoreBackupRequest.type,
                withConversion.bind(null, handleRestoreBackup, entityKey, actions)
            ),
        ]);
    };
}

/*

export function createEntitySaga<TEntity extends EntityKeys>(entityKey: TEntity) {
    const { actions } = createEntitySlice(entityKey);

    return function* saga() {
        yield all([
            takeLatest(
                actions.fetchRecords.type,
                withConversion.bind(null, handleFetchPaginated, entityKey, actions)
            ),
            takeLatest(
                actions.fetchQuickReference.type,
                withConversion.bind(null, handleFetchPaginated, entityKey, actions)
            ),
            takeLatest(
                actions.fetchOne.type,
                withConversion.bind(null, handleFetchOne, entityKey, actions)
            ),
            takeLatest(
                actions.createRecord.type,
                withConversion.bind(null, handleCreate, entityKey, actions)
            ),
            takeLatest(
                actions.updateRecord.type,
                withConversion.bind(null, handleUpdate, entityKey, actions)
            ),
            takeLatest(
                actions.deleteRecord.type,
                withConversion.bind(null, handleDelete, entityKey, actions)
            ),
            takeLatest(
                actions.batchOperation.type,
                withConversion.bind(null, handleBatchOperation, entityKey, actions)
            ),
            takeLatest(
                actions.fetchAll.type,
                withConversion.bind(null, handleFetchAll, entityKey, actions)
            ),
            takeLatest(
                actions.executeCustomQuery.type,
                withUnifiedConversion.bind(null, handleExecuteCustomQuery, entityKey, actions)
            ),
        ]);
    };
}
*/



/**
 * Initialize DatabaseApiWrapper for a given entity and dynamically inject the Supabase client
 */
// function* initializeDatabaseApi<TEntity extends EntityKeys>(
//     entityKey: TEntity
// ) {
//     const schemaResolution = yield call(useSchemaResolution);
//     const databaseApi = DatabaseApiWrapper.create(entityKey, schemaResolution);
//     databaseApi.setClient(supabase);
//     return databaseApi;
// }


// First, let's create an enhanced query preparation function
function prepareUnifiedQueryOptions<TEntity extends EntityKeys>(
    baseQuery: any,
    options: UnifiedQueryOptions<TEntity>
): any {
    let query = baseQuery;

    // Handle distinct if specified
    if (options.distinct) {
        query = query.select('*', {count: 'exact', head: false}).distinct();
    }

    // Handle specific columns selection
    if (options.columns?.length) {
        query = query.select(options.columns.join(','));
    }

    // Handle filters
    if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
            // Handle different types of filters
            if (Array.isArray(value)) {
                query = query.in(key, value);
            } else if (typeof value === 'object' && value !== null) {
                // Handle range queries or special operators
                const filterObj = value as Record<string, any>;
                if ('gt' in filterObj) query = query.gt(key, filterObj.gt);
                if ('gte' in filterObj) query = query.gte(key, filterObj.gte);
                if ('lt' in filterObj) query = query.lt(key, filterObj.lt);
                if ('lte' in filterObj) query = query.lte(key, filterObj.lte);
                if ('not' in filterObj) query = query.not(key, filterObj.not);
            } else {
                query = query.eq(key, value);
            }
        }
    }

    // Handle full-text search
    if (options.fullTextSearch) {
        query = query.textSearch(
            options.fullTextSearch.column,
            options.fullTextSearch.query
        );
    }

    // Handle joins
    if (options.joinTables?.length) {
        for (const join of options.joinTables) {
            query = query.select(join.columns?.join(',') || '*', {
                foreignTable: join.table,
                // Supabase expects the relationship to be defined in the database
                // so we just need to specify which foreign table to join
            });
        }
    }

    // Handle sorting
    if (options.sorts) {
        for (const {column, ascending = true} of options.sorts) {
            query = query.order(column, {ascending});
        }
    }

    // Handle grouping
    if (options.groupBy?.length) {
        query = query.select(options.groupBy.join(','))
            .group(options.groupBy.join(','));
    }

    // Handle having clauses after group by
    if (options.having) {
        for (const [key, value] of Object.entries(options.having)) {
            query = query.having(key, value);
        }
    }

    // Handle pagination - prefer range if specified, fall back to limit/offset
    if (options.range) {
        query = query.range(options.range.start, options.range.end);
    } else {
        if (options.limit) {
            query = query.limit(options.limit);
        }
        if (options.offset) {
            query = query.range(
                options.offset,
                options.offset + (options.limit || 0) - 1
            );
        }
    }

    return query;
}

// Now create the enhanced withConversion function
export function* withUnifiedConversion<TEntity extends EntityKeys>(
    {
        sagaHandler,
        entityKey,
        actions,
        action
    }: WithConversionParams<TEntity>) {
    try {
        // Get the database table name
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        console.log("withUnifiedConversion converted tableName:", tableName);

        // Initialize the database API
        const api = yield call(initializeDatabaseApi, tableName);

        // Convert the query options using our new unified converter
        const dbQueryOptions = yield select(selectUnifiedQueryDatabaseConversion, {
            entityName: entityKey,
            options: action.payload.options,
        });

        console.log("withUnifiedConversion converted options:", dbQueryOptions);

        // Prepare the query with all options
        const preparedQuery = prepareUnifiedQueryOptions(api, dbQueryOptions);

        // Call the saga handler with the prepared query
        yield call(
            sagaHandler,
            entityKey,
            actions,
            preparedQuery, // Note: passing the prepared query instead of raw api
            action,
            tableName,
            dbQueryOptions
        );
    } catch (error: any) {
        yield put(
            actions.setError({
                message: error.message || "An error occurred during query preparation.",
                code: error.code
            })
        );
        console.error("withUnifiedConversion error:", error);
        throw error;
    }
}
