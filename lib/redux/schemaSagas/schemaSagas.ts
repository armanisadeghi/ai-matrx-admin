// lib/redux/schemaSaga/schemaSagas.ts

import { call, put, takeLatest, all } from 'redux-saga/effects';

// Placeholder API call
// Adjust `fetchTableDataAPI` to meet your real data-fetching logic
function fetchTableDataAPI(tableName: string) {
    return Promise.resolve([]); // Mock API to fetch empty data
}

// // function* fetchData(action: ReturnType<typeof fetchRequest>) {
// //     try {
// //         const data: any[] = yield call(fetchTableDataAPI, action.payload);
// //         yield put(fetchSuccess({ tableName: action.payload, data }));
// //     } catch (error) {
// //         yield put(fetchFailure({ tableName: action.payload, error: error.message || 'Unknown error' }));
// //     }
// // }
// //
// // function* schemaSaga() {
// //     yield takeLatest(fetchRequest.type, fetchData);
// // }
//
// // Combine and export all sagas
// export function* rootSchemaSaga() {
//     yield all([schemaSaga()]);
// }