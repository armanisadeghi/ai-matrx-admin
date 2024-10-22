import { call, put, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { databaseApi, QueryOptions } from '@/utils/supabase/api-wrapper';
import {createTableSlice, ExtractTableData} from './tableSliceCreator';
import {
    TableSchema,
    AutomationType,
} from '@/types/AutomationTypes';
import { automationTableSchema } from "@/utils/schema/initialSchemas";
import {AutomationTableName} from "@/types/AutomationSchemaTypes";

// Handle the fetch operation
function* handleFetch<T extends AutomationTableName>(
    tableName: T,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<QueryOptions<ExtractTableData<T>> | undefined>
) {
    try {
        yield put(actions.setLoading());
        const data: ExtractTableData<T>[] = yield call(
            [databaseApi, databaseApi.fetchAll],
            tableName,
            action.payload
        );
        yield put(actions.fetchSuccess(data));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

function* handleFetchOne<T extends AutomationTableName>(
    tableName: T,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<{
        id: string;
        options?: Omit<QueryOptions<ExtractTableData<T>>, 'limit' | 'offset'>
    }>
) {
    try {
        yield put(actions.setLoading());
        const data: ExtractTableData<T> = yield call(
            [databaseApi, databaseApi.fetchOne],
            tableName,
            action.payload.id,
            action.payload.options
        );
        yield put(actions.fetchOneSuccess(data));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

function* handleCreate<T extends AutomationTableName>(
    tableName: T,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<Partial<ExtractTableData<T>>>
) {
    try {
        yield put(actions.setLoading());
        const data: ExtractTableData<T> = yield call(
            [databaseApi, databaseApi.create],
            tableName,
            action.payload
        );
        yield put(actions.createSuccess(data));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

function* handleUpdate<T extends AutomationTableName>(
    tableName: T,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<{
        id: string;
        data: Partial<ExtractTableData<T>>
    }>
) {
    try {
        yield put(actions.setLoading());
        const data: ExtractTableData<T> = yield call(
            [databaseApi, databaseApi.update],
            tableName,
            action.payload.id,
            action.payload.data
        );
        yield put(actions.updateSuccess(data));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

function* handleDelete<T extends AutomationTableName>(
    tableName: T,
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

function* handleExecuteCustomQuery<T extends AutomationTableName>(
    tableName: T,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<(baseQuery: any) => any>
) {
    try {
        yield put(actions.setLoading());
        const data: ExtractTableData<T>[] = yield call(
            [databaseApi, databaseApi.executeCustomQuery],
            tableName,
            action.payload
        );
        yield put(actions.executeCustomQuerySuccess(data));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

function* handleFetchPaginated<T extends AutomationTableName>(
    tableName: T,
    actions: ReturnType<typeof createTableSlice<T>>['actions'],
    action: PayloadAction<{
        options: QueryOptions<ExtractTableData<T>>;
        page: number;
        pageSize: number
    }>
) {
    try {
        yield put(actions.setLoading());
        const { page, pageSize, options } = action.payload;
        const data = yield call(
            [databaseApi, databaseApi.fetchPaginated],
            tableName,
            options,
            page,
            pageSize
        );
        yield put(actions.fetchSuccess(data.paginatedData));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}

export function createTableSaga<T extends AutomationTableName>(tableName: T) {
    const schema = automationTableSchema[tableName];
    if (!schema) {
        throw new Error(`Schema not found for table: ${tableName}`);
    }

    const { actions } = createTableSlice(tableName, schema);
    const baseType = schema.entityNameVariations.frontend.toUpperCase();

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

function createCustomSagas<T extends AutomationTableName>(
    schema: TableSchema<T>,
    baseType: string,
    tableName: T,
    actions: ReturnType<typeof createTableSlice<T>>['actions']
) {
    const customSagas: any[] = [];

    // Check for specific fields in the schema
    if ('status' in schema.entityFields) {
        function* handleChangeStatus(
            action: PayloadAction<{
                id: string;
                status: ExtractTableData<T>['status']
            }>
        ) {
            try {
                yield put(actions.setLoading());
                const data: ExtractTableData<T> = yield call(
                    [databaseApi, databaseApi.update],
                    tableName,
                    action.payload.id,
                    { status: action.payload.status }
                );
                yield put(actions.changeStatusSuccess(data));
            } catch (error: any) {
                yield put(actions.setError(error.message));
            }
        }

        customSagas.push(
            takeLatest(`${baseType}/CHANGE_STATUS`, handleChangeStatus)
        );
    }

    return customSagas;
}
