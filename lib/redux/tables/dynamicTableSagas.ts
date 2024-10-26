import {call, put, takeLatest, all, select} from 'redux-saga/effects';
import {PayloadAction} from '@reduxjs/toolkit';
import {databaseApi, QueryOptions} from '@/utils/supabase/api-wrapper';
import {
    AutomationTableStructure,
    TableKeys,
} from '@/types/automationTableTypes';
import {createTableSlice} from "@/lib/redux/tables/tableSliceCreator";

type TableData<TTable extends TableKeys> = AutomationTableStructure[TTable];

function* MakeQuery<TTable extends TableKeys>(
    tableName: TTable,
    actions: ReturnType<typeof createTableSlice>['actions'],
    action: PayloadAction<QueryOptions<TTable> | undefined>
) {
    try {
        const state = yield select();
        const tableState = state[tableName];
        const optionsKey = JSON.stringify(action.payload || {});
        const lastFetchedTime = tableState.lastFetched[optionsKey];
        const now = Date.now();
        const isStale = !lastFetchedTime || (now - lastFetchedTime) > tableState.staleTime;

        if (!isStale) {
            return;
        }

        yield put(actions.setLoading(true));
        const data: TableData<TTable>[] = yield call(
            [databaseApi, databaseApi.fetchAll],
            tableName,
            action.payload
        );
        yield put(actions.setTableData(data));
        yield put(actions.setLastFetched({key: optionsKey, time: now}));
    } catch (error: any) {
        yield put(actions.setError(error.message));
    }
}
//
//
// function* handleFetchOne<T extends keyof AutomationTableStructure>(
//     tableName: T,
//     actions: ReturnType<typeof createTableSlice>['actions'],
//     action: PayloadAction<{
//         id: string;
//         options?: Omit<QueryOptions<TableData<T>>, 'limit' | 'offset'>;
//     }>
// ) {
//     try {
//         const state = yield select();
//         const tableState = state[tableName];
//         const item = tableState.data.find(
//             (item: TableData<T>) => item.id === action.payload.id
//         );
//
//         const lastFetchedTime = tableState.lastFetched[action.payload.id];
//         const now = Date.now();
//         const isStale = !lastFetchedTime || (now - lastFetchedTime) > tableState.staleTime;
//
//         if (item && !isStale) {
//             // Data is fresh, no need to fetch
//             yield put(actions.setSelectedItem(item));
//             return;
//         }
//
//         yield put(actions.setLoading(true));
//         const data: TableData<T> = yield call(
//             [databaseApi, databaseApi.fetchOne],
//             tableName,
//             action.payload.id,
//             action.payload.options
//         );
//         yield put(actions.setSelectedItem(data));
//         yield put(actions.setLastFetched({key: action.payload.id, time: now}));
//     } catch (error: any) {
//         yield put(actions.setError(error.message));
//     }
// }
//
// function* handleCreate<T extends keyof AutomationTableStructure>(
//     tableName: T,
//     actions: ReturnType<typeof createTableSlice>['actions'],
//     action: PayloadAction<Partial<TableData<T>>>
// ) {
//     try {
//         yield put(actions.setLoading(true));
//         const data: TableData<T> = yield call(
//             [databaseApi, databaseApi.create],
//             tableName,
//             action.payload
//         );
//         const currentData = yield select((state) => state[tableName].data);
//         yield put(actions.setTableData([...currentData, data]));
//         yield put(actions.setLastFetched({key: data.id, time: Date.now()}));
//     } catch (error: any) {
//         yield put(actions.setError(error.message));
//     }
// }
//
// function* handleUpdate<T extends keyof AutomationTableStructure>(
//     tableName: T,
//     actions: ReturnType<typeof createTableSlice>['actions'],
//     action: PayloadAction<{
//         id: string;
//         data: Partial<TableData<T>>;
//     }>
// ) {
//     try {
//         yield put(actions.setLoading(true));
//         const data: TableData<T> = yield call(
//             [databaseApi, databaseApi.update],
//             tableName,
//             action.payload.id,
//             action.payload.data
//         );
//         const updatedData = yield select((state) =>
//             state[tableName].data.map((item: TableData<T>) =>
//                 item.id === action.payload.id ? data : item
//             )
//         );
//         yield put(actions.setTableData(updatedData));
//         yield put(actions.setLastFetched({key: action.payload.id, time: Date.now()}));
//     } catch (error: any) {
//         yield put(actions.setError(error.message));
//     }
// }
//
// function* handleDelete<T extends keyof AutomationTableStructure>(
//     tableName: T,
//     actions: ReturnType<typeof createTableSlice>['actions'],
//     action: PayloadAction<string>
// ) {
//     try {
//         yield put(actions.setLoading(true));
//         yield call([databaseApi, databaseApi.delete], tableName, action.payload);
//         const filteredData = yield select((state) =>
//             state[tableName].data.filter((item: TableData<T>) => item.id !== action.payload)
//         );
//         yield put(actions.setTableData(filteredData));
//         yield put(actions.removeLastFetchedKey(action.payload));
//     } catch (error: any) {
//         yield put(actions.setError(error.message));
//     }
// }
//
// function* handleExecuteCustomQuery<T extends keyof AutomationTableStructure>(
//     tableName: T,
//     actions: ReturnType<typeof createTableSlice>['actions'],
//     action: PayloadAction<(baseQuery: any) => any>
// ) {
//     try {
//         yield put(actions.setLoading(true));
//         const data: TableData<T>[] = yield call(
//             [databaseApi, databaseApi.executeCustomQuery],
//             tableName,
//             action.payload
//         );
//         yield put(actions.setTableData(data));
//     } catch (error: any) {
//         yield put(actions.setError(error.message));
//     }
// }
//
// function* handleFetchPaginated<T extends keyof AutomationTableStructure>(
//     tableName: T,
//     actions: ReturnType<typeof createTableSlice>['actions'],
//     action: PayloadAction<{
//         options: QueryOptions<TableData<T>>;
//         page: number;
//         pageSize: number;
//     }>
// ) {
//     try {
//         const state = yield select();
//         const tableState = state[tableName];
//         const optionsKey = JSON.stringify({...action.payload.options, page: action.payload.page});
//         const lastFetchedTime = tableState.lastFetched[optionsKey];
//         const now = Date.now();
//         const isStale = !lastFetchedTime || (now - lastFetchedTime) > tableState.staleTime;
//
//         if (!isStale) {
//             // Data is fresh, no need to fetch
//             return;
//         }
//
//         yield put(actions.setLoading(true));
//         const {page, pageSize, options} = action.payload;
//         const data = yield call(
//             [databaseApi, databaseApi.fetchPaginated],
//             tableName,
//             options,
//             page,
//             pageSize
//         );
//         yield put(actions.setTableData(data.paginatedData));
//         yield put(actions.setTotalCount(data.totalCount));
//         yield put(actions.setLastFetched({key: optionsKey, time: now}));
//     } catch (error: any) {
//         yield put(actions.setError(error.message));
//     }
// }
//
// export function createTableSaga(tableName: TableNames, tableSchema: AutomationTable) {
//     const { actions } = createTableSlice(tableName, tableSchema);
//     const baseType = `table/${tableName}`;
//
//     return function* saga() {
//         yield all([
//             takeLatest(`${baseType}/fetch`, handleFetch.bind(null, tableName, actions)),
//             takeLatest(`${baseType}/fetchOne`, handleFetchOne.bind(null, tableName, actions)),
//             takeLatest(`${baseType}/create`, handleCreate.bind(null, tableName, actions)),
//             takeLatest(`${baseType}/update`, handleUpdate.bind(null, tableName, actions)),
//             takeLatest(`${baseType}/delete`, handleDelete.bind(null, tableName, actions)),
//             takeLatest(`${baseType}/executeQuery`, handleExecuteCustomQuery.bind(null, tableName, actions)),
//             takeLatest(`${baseType}/fetchPaginated`, handleFetchPaginated.bind(null, tableName, actions)),
//             ...createCustomSagas(tableSchema, baseType, tableName, actions),
//         ]);
//     };
// }
//
// function createCustomSagas(
//     schema: AutomationTable,
//     baseType: string,
//     tableName: keyof AutomationTableStructure,
//     actions: ReturnType<typeof createTableSlice>['actions']
// ) {
//     const customSagas: any[] = [];
//
//     if ('status' in schema.entityFields) {
//         function* handleChangeStatus(
//             action: PayloadAction<{
//                 id: string;
//                 status: any;
//             }>
//         ) {
//             try {
//                 yield put(actions.setLoading(true));
//                 const data = yield call(
//                     [databaseApi, databaseApi.update],
//                     tableName,
//                     action.payload.id,
//                     {status: action.payload.status}
//                 );
//                 const updatedData = yield select((state) =>
//                     state[tableName].data.map((item: any) =>
//                         item.id === action.payload.id ? data : item
//                     )
//                 );
//                 yield put(actions.setTableData(updatedData));
//                 yield put(actions.setLastFetched({key: action.payload.id, time: Date.now()}));
//             } catch (error: any) {
//                 yield put(actions.setError(error.message));
//             }
//         }
//
//         customSagas.push(
//             takeLatest(`${baseType}/changeStatus`, handleChangeStatus)
//         );
//     }
//
//     return customSagas;
// }
