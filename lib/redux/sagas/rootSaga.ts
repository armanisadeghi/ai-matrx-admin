// lib/redux/sagas/rootSaga.ts

import { all, call } from 'redux-saga/effects';
import { EntityKeys } from '@/types/entityTypes';
import { SagaCoordinator } from '@/lib/redux/sagas/SagaCoordinator';

export function createRootSaga(entityNames: EntityKeys[]) {
    return function* rootSaga() {
        const sagaCoordinator = SagaCoordinator.getInstance();
        sagaCoordinator.setEntityNames(entityNames);
        yield all([call([sagaCoordinator, sagaCoordinator.initializeEntitySagas])]);
    };
}
