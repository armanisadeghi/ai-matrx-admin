import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { DatabaseApiWrapper, QueryOptions } from '@/utils/supabase/api-wrapper';
import { createTableSlice } from "@/lib/redux/tables/tableSliceCreator";
import {
    AutomationEntities, createFormattedRecord,
    EntityKeys,
    EntityRecord
} from "@/types/entityTypes";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Initialize DatabaseApiWrapper for a given entity and dynamically inject the Supabase client
 */
function* initializeDatabaseApiWrapper<TEntity extends EntityKeys>(
    entityVariant: TEntity,
    client: SupabaseClient
) {
    const databaseApi = DatabaseApiWrapper.create(entityVariant);
    databaseApi.setClient(client);  // Dynamically set the client (either from server or client-side)
    return databaseApi;
}


/**
 * Utility function to get primary key value from a record
 */
function* getPrimaryKeyInfo<TEntity extends EntityKeys>(
    databaseApi: DatabaseApiWrapper<TEntity>,
    record: EntityRecord<TEntity, 'frontend'>
): Generator<any, { field: string; value: string | number }> {
    const primaryKeyField = yield call([databaseApi, databaseApi.getPrimaryKeyField]);
    const value = record[primaryKeyField];
    return { field: primaryKeyField, value };
}



/**
 * Handle paginated query for an entity
 */
function* MakeQuery<TEntity extends EntityKeys>(
    entityVariant: TEntity,
    client: SupabaseClient,
    actions: ReturnType<typeof createTableSlice>['actions'],
    action: PayloadAction<{
        options?: QueryOptions<TEntity>;
        page?: number;
        pageSize?: number;
    }>
) {
    try {
        const state = yield select();
        const entityState = state[entityVariant];
        const optionsKey = JSON.stringify(action.payload || {});
        const lastFetchedTime = entityState.lastFetched[optionsKey];
        const now = Date.now();
        const isStale = !lastFetchedTime || (now - lastFetchedTime) > entityState.staleTime;

        if (!isStale) return;

        const databaseApi = yield call(
            initializeDatabaseApiWrapper<TEntity>,
            entityVariant,
            client
        );

        yield put(actions.setLoading(true));

        // Use fetchPaginated with proper typing
        const result: {
            data: EntityRecord<TEntity, 'frontend'>[];
            page: number;
            pageSize: number;
            totalCount: number;
        } = yield call(
            [databaseApi, databaseApi.fetchPaginated],
            action.payload.options,
            action.payload.page,
            action.payload.pageSize
        );

        yield put(actions.setTableData(result.data));
        yield put(actions.setPagination({
            page: result.page,
            pageSize: result.pageSize,
            totalCount: result.totalCount
        }));
        yield put(actions.setLastFetched({ key: optionsKey, time: now }));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    } finally {
        yield put(actions.setLoading(false));
    }
}

/**
 * Updated handlers using dynamic primary key
 */
function* handleFetchOne<TEntity extends EntityKeys>(
    entityVariant: TEntity,
    client: SupabaseClient,
    actions: ReturnType<typeof createTableSlice>['actions'],
    action: PayloadAction<{
        primaryKeyValue: string | number;
        options?: QueryOptions<TEntity>;
    }>
) {
    try {
        const databaseApi = yield call(
            initializeDatabaseApiWrapper<TEntity>,
            entityVariant,
            client
        );

        const state = yield select();
        const entityState = state[entityVariant];
        const primaryKeyField = yield call([databaseApi, databaseApi.getPrimaryKeyField]);

        const item = entityState.data.find(
            (item: EntityRecord<TEntity, 'frontend'>) =>
                item[primaryKeyField] === action.payload.primaryKeyValue
        );

        const lastFetchedTime = entityState.lastFetched[action.payload.primaryKeyValue];
        const now = Date.now();
        const isStale = !lastFetchedTime || (now - lastFetchedTime) > entityState.staleTime;

        if (item && !isStale) {
            yield put(actions.setSelectedItem(item));
            return;
        }

        yield put(actions.setLoading(true));

        const data: EntityRecord<TEntity, 'frontend'> = yield call(
            [databaseApi, databaseApi.fetchByPrimaryKey],
            action.payload.primaryKeyValue,
            action.payload.options
        );

        if (data) {
            yield put(actions.setSelectedItem(data));
            yield put(actions.setLastFetched({
                key: action.payload.primaryKeyValue.toString(),
                time: now
            }));
        }
    } catch (error: any) {
        yield put(actions.setError(error.message));
    } finally {
        yield put(actions.setLoading(false));
    }
}

/**
 * Handle creating a new record
 */
function* handleCreate<TEntity extends EntityKeys>(
    entityVariant: TEntity,
    client: SupabaseClient,
    actions: ReturnType<typeof createTableSlice>['actions'],
    action: PayloadAction<Partial<EntityRecord<TEntity, 'frontend'>>>
) {
    try {
        yield put(actions.setLoading(true));

        const databaseApi = yield call(
            initializeDatabaseApiWrapper<TEntity>,
            entityVariant,
            client
        );

        const data: EntityRecord<TEntity, 'frontend'> = yield call(
            [databaseApi, databaseApi.create],
            action.payload
        );

        if (data) {
            const currentData = yield select(
                (state) => state[entityVariant].data
            );
            yield put(actions.setTableData([...currentData, data]));
            yield put(actions.setLastFetched({
                key: data.id.toString(),
                time: Date.now()
            }));
        }
    } catch (error: any) {
        yield put(actions.setError(error.message));
    } finally {
        yield put(actions.setLoading(false));
    }
}

/**
 * Handle updating a record
 */
function* handleUpdate<TEntity extends EntityKeys>(
    entityVariant: TEntity,
    client: SupabaseClient,
    actions: ReturnType<typeof createTableSlice>['actions'],
    action: PayloadAction<{
        id: string | number;
        data: Partial<EntityRecord<TEntity, 'frontend'>>;
    }>
) {
    try {
        yield put(actions.setLoading(true));

        const databaseApi = yield call(
            initializeDatabaseApiWrapper<TEntity>,
            entityVariant,
            client
        );

        const updatedData: EntityRecord<TEntity, 'frontend'> | null = yield call(
            [databaseApi, databaseApi.update],
            action.payload.id,
            action.payload.data
        );

        if (updatedData) {
            const currentData: EntityRecord<TEntity, 'frontend'>[] = yield select(
                (state) => state[entityVariant].data
            );

            const newData = currentData.map(item =>
                item.id === action.payload.id ? updatedData : item
            );

            yield put(actions.setTableData(newData));
            yield put(actions.setLastFetched({
                key: action.payload.id.toString(),
                time: Date.now()
            }));
        }
    } catch (error: any) {
        yield put(actions.setError(error.message));
    } finally {
        yield put(actions.setLoading(false));
    }
}

/**
 * Handle deleting a record
 */
function* handleDelete<TEntity extends EntityKeys>(
    entityVariant: TEntity,
    client: SupabaseClient,
    actions: ReturnType<typeof createTableSlice>['actions'],
    action: PayloadAction<string | number>
) {
    try {
        yield put(actions.setLoading(true));

        const databaseApi = yield call(
            initializeDatabaseApiWrapper<TEntity>,
            entityVariant,
            client
        );

        const success: boolean = yield call(
            [databaseApi, databaseApi.delete],
            action.payload
        );

        if (success) {
            const currentData: EntityRecord<TEntity, 'frontend'>[] = yield select(
                (state) => state[entityVariant].data
            );

            const filteredData = currentData.filter(
                item => item.id !== action.payload
            );

            yield put(actions.setTableData(filteredData));
            yield put(actions.removeLastFetchedKey(action.payload.toString()));
        }
    } catch (error: any) {
        yield put(actions.setError(error.message));
    } finally {
        yield put(actions.setLoading(false));
    }
}

/**
 * Handle custom query execution
 */
function* handleExecuteCustomQuery<TEntity extends EntityKeys>(
    entityVariant: TEntity,
    client: SupabaseClient,
    actions: ReturnType<typeof createTableSlice>['actions'],
    action: PayloadAction<{
        queryFn: (baseQuery: PostgrestFilterBuilder<any, any, any>) => Promise<any>;
        format?: 'frontend' | 'database';
    }>
) {
    try {
        yield put(actions.setLoading(true));

        const databaseApi = yield call(
            initializeDatabaseApiWrapper<TEntity>,
            entityVariant,
            client
        );

        const rawData: unknown[] = yield call(
            [databaseApi, databaseApi.executeCustomQuery],
            action.payload.queryFn
        );

        const formattedData = action.payload.format === 'database'
                              ? rawData
                              : rawData.map(item =>
                createFormattedRecord(entityVariant, item as Record<string, unknown>, 'frontend')
            );

        yield put(actions.setTableData(formattedData));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    } finally {
        yield put(actions.setLoading(false));
    }
}

type EntitySchemaType<TEntity extends EntityKeys> = AutomationEntities[TEntity];

export function createEntitySaga<TEntity extends EntityKeys>(
    entityVariant: TEntity,
    entitySchema: EntitySchemaType<TEntity>,
    client: SupabaseClient
) {
    const { actions } = createTableSlice<TEntity>(entityVariant, entitySchema);
    const baseType = `entity/${entityVariant}`;

    return function* saga() {
        yield all([
            takeLatest(
                `${baseType}/fetch`,
                MakeQuery.bind(null, entityVariant, client, actions)
            ),
            takeLatest(
                `${baseType}/fetchOne`,
                handleFetchOne.bind(null, entityVariant, client, actions)
            ),
            takeLatest(
                `${baseType}/create`,
                handleCreate.bind(null, entityVariant, client, actions)
            ),
            takeLatest(
                `${baseType}/update`,
                handleUpdate.bind(null, entityVariant, client, actions)
            ),
            takeLatest(
                `${baseType}/delete`,
                handleDelete.bind(null, entityVariant, client, actions)
            ),
            takeLatest(
                `${baseType}/executeQuery`,
                handleExecuteCustomQuery.bind(null, entityVariant, client, actions)
            ),
            takeLatest(
                `${baseType}/fetchPaginated`,
                MakeQuery.bind(null, entityVariant, client, actions)
            )
        ]);
    };
}
