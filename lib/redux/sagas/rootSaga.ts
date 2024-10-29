// lib/redux/sagas/rootSaga.ts

import { all } from 'redux-saga/effects';

import {EntityKeys, AutomationEntities} from "@/types/entityTypes";
import {createEntitySaga} from "@/lib/redux/entity/entitySagas";

export function createRootSaga(entitySchema: AutomationEntities) {
    return function* rootSaga() {
        const tableSagas = Object.keys(entitySchema).map(entityName =>
            createEntitySaga(entityName as EntityKeys, entitySchema[entityName as EntityKeys])()
        );

        yield all([
            ...tableSagas,
        ]);
    };
}
