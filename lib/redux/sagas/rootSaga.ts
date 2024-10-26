// lib/redux/sagas/rootSaga.ts

import { all } from 'redux-saga/effects';
import { createTableSaga } from "@/lib/redux/tables/dynamicTableSagas";
import { AutomationTableStructure, TableNames } from '@/types/automationTableTypes';

export function createRootSaga(schema: AutomationTableStructure) {
    return function* rootSaga() {
        const tableSagas = Object.keys(schema).map(tableName =>
            createTableSaga(tableName as TableNames, schema[tableName as TableNames])()
        );

        yield all([
            ...tableSagas,
        ]);
    };
}
