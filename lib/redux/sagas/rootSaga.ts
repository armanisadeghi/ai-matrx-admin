// lib/redux/sagas/rootSaga.ts

import { all } from 'redux-saga/effects';
import { createTableSaga } from "@/lib/redux/tables/dynamicTableSagas";
import {EntityKeys, AutomationEntities, UnifiedSchemaCache} from "@/types/entityTypes";

export function createRootSaga(unifiedSchemaCache: UnifiedSchemaCache) {
    const schema = unifiedSchemaCache.schema as AutomationEntities;

    return function* rootSaga() {
        const tableSagas = Object.keys(schema).map(tableName =>
            createTableSaga(tableName as EntityKeys, schema[tableName as EntityKeys])()
        );

        yield all([
            ...tableSagas,
        ]);
    };
}
