// // File Location: lib/redux/sagas/rootSaga.ts

import { all } from 'redux-saga/effects';
import {initialSchemas} from "@/utils/schema/initialSchemas";
import {createTableSaga} from "@/lib/redux/tableSagas/tableSagas";

export function* rootSaga() {
    const tableSagas = Object.keys(initialSchemas).map(tableName => createTableSaga(tableName as keyof typeof initialSchemas)());

    yield all([
        ...tableSagas,
    ]);
}
