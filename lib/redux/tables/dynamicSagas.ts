import { call, put, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { getSchema } from "@/utils/schema/schemaRegistry";
import { databaseApi, QueryOptions } from '@/utils/supabase/api-wrapper';
import { createTableSlice } from './tableSliceCreator';
import {TableSchema} from "@/types/tableSchemaTypes";
import {initialSchemas} from "@/utils/schema/initialSchemas";



type TableName = keyof typeof initialSchemas;



// Handle the fetch operation
function* handleFetch<T extends FrontendTableNames>(
    tableName: T,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<QueryOptions<T> | undefined>
) {
    try {
        yield put(actions.setLoading());
        const data = yield call([databaseApi, databaseApi.fetchAll], tableName, action.payload);
        yield put(actions.fetchSuccess(data));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

function* handleFetchOne<T extends TableOrView>(
    tableName: FrontendTableNames,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<{ id: string; options?: Omit<QueryOptions<T>, 'limit' | 'offset'> }>
) {
    try {
        yield put(actions.setLoading());
        const data = yield call([databaseApi, databaseApi.fetchOne], tableName, action.payload.id, action.payload.options);
        yield put(actions.fetchOneSuccess(data));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

// Handle creating a new record
function* handleCreate<T extends TableOrView>(
    tableName: FrontendTableNames,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<Partial<any>>
) {
    try {
        yield put(actions.setLoading());
        const data = yield call([databaseApi, databaseApi.create], tableName, action.payload);
        yield put(actions.createSuccess(data));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

// Handle updating an existing record
function* handleUpdate<T extends TableOrView>(
    tableName: FrontendTableNames,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<{ id: string; data: Partial<any> }>
) {
    try {
        yield put(actions.setLoading());
        const data = yield call([databaseApi, databaseApi.update], tableName, action.payload.id, action.payload.data);
        yield put(actions.updateSuccess(data));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

// Handle deleting a record
function* handleDelete<T extends TableOrView>(
    tableName: FrontendTableNames,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<string>
) {
    try {
        yield put(actions.setLoading());
        yield call([databaseApi, databaseApi.delete], tableName, action.payload);
        yield put(actions.deleteSuccess(action.payload));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

// Handle custom queries
function* handleExecuteCustomQuery<T extends TableOrView>(
    tableName: FrontendTableNames,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<(baseQuery: any) => any>
) {
    try {
        yield put(actions.setLoading());
        const data = yield call([databaseApi, databaseApi.executeCustomQuery], tableName, action.payload);
        yield put(actions.executeCustomQuerySuccess(data));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

// Handle paginated fetch
function* handleFetchPaginated<T extends TableOrView>(
    tableName: FrontendTableNames,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<{ options: QueryOptions<T>; page: number; pageSize: number }>
) {
    try {
        yield put(actions.setLoading());
        const { page, pageSize, options } = action.payload;
        const data = yield call([databaseApi, databaseApi.fetchPaginated], tableName, options, page, pageSize);
        yield put(actions.fetchSuccess(data.paginatedData));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

// Create a saga generator for a given table
export function createTableSaga<T extends FrontendTableNames>(tableName: T) {
    const schema = getSchema(tableName);
    if (!schema) {
        throw new Error(`Schema not found for table: ${tableName}`);
    }

    const { actions } = createTableSlice(tableName, schema);
    const baseType = schema.name.frontend.toUpperCase();

    function* saga() {
        yield all([
            takeLatest(`${baseType}/FETCH`, handleFetch, tableName, actions),
            takeLatest(`${baseType}/FETCH_ONE`, handleFetchOne, tableName, actions),
            takeLatest(`${baseType}/CREATE`, handleCreate, tableName, actions),
            takeLatest(`${baseType}/UPDATE`, handleUpdate, tableName, actions),
            takeLatest(`${baseType}/DELETE`, handleDelete, tableName, actions),
            takeLatest(`${baseType}/EXECUTE_QUERY`, handleExecuteCustomQuery, tableName, actions),
            takeLatest(`${baseType}/FETCH_PAGINATED`, handleFetchPaginated, tableName, actions),
            ...createCustomSagas(schema, baseType, tableName, actions),
        ]);
    }

    return saga;
}

// Add any custom sagas based on the table schema
function createCustomSagas<T extends TableSchema>(
    schema: T,
    baseType: string,
    tableName: FrontendTableNames,
    actions: ReturnType<typeof createTableSlice<TableOrView>>['actions']
) {
    const customSagas: any[] = [];

    // For example, handle status changes based on schema
    if (schema.fields.status) {
        function* handleChangeStatus(action: PayloadAction<{ id: string; status: string }>) {
            try {
                yield put(actions.setLoading());
                const data = yield call([databaseApi, databaseApi.update], tableName, action.payload.id, { status: action.payload.status });
                yield put(actions.changeStatusSuccess(data));
            } catch (error: any) {
                yield put(actions.setError(error.message));
            }
        }

        customSagas.push(takeLatest(`${baseType}/CHANGE_STATUS`, handleChangeStatus));
    }

    return customSagas;
}
