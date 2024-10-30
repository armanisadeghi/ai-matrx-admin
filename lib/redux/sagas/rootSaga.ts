// lib/redux/sagas/rootSaga.ts

import { all, call } from 'redux-saga/effects';
import { EntityKeys, AutomationEntities } from "@/types/entityTypes";
import { createEntitySaga } from "@/lib/redux/entity/entitySagas";
import { SagaCoordinator } from '@/lib/redux/sagas/SagaCoordinator';

export function createRootSaga(entitySchema: AutomationEntities) {
    return function* rootSaga() {

        const entitySagas = Object.keys(entitySchema).map(entityName =>
            createEntitySaga(entityName as EntityKeys, entitySchema[entityName as EntityKeys])()
        );

        const sagaCoordinator = SagaCoordinator.getInstance();

        yield all([
            ...entitySagas,
            call(function* () { yield* sagaCoordinator.initializeEntitySagas(); })
        ]);
    };
}
