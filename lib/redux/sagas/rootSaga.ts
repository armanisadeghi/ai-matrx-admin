// lib/redux/sagas/rootSaga.ts

import { all, call } from 'redux-saga/effects';
import { EntityKeys } from "@/types/entityTypes";
import { SagaCoordinator } from '@/lib/redux/sagas/SagaCoordinator';

export function createRootSaga(entityNames: EntityKeys[]) {
    return function* rootSaga() {

        const sagaCoordinator = SagaCoordinator.getInstance();
        // console.log('createRootSaga has Saga Coordinator Instance:', sagaCoordinator);

        sagaCoordinator.setEntityNames(entityNames);
        // console.log('createRootSaga has Saga Coordinator Entity Names:', entityNames);

        yield all([
            call(function* () { yield* sagaCoordinator.initializeEntitySagas(); })
        ]);
    };
}
