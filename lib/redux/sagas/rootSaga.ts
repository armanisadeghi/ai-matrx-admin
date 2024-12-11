// lib/redux/sagas/rootSaga.ts

import { all, call } from 'redux-saga/effects';
import { EntityKeys } from '@/types/entityTypes';
import { SagaCoordinator } from '@/lib/redux/sagas/SagaCoordinator';
import { createStorageSyncSaga } from './storage/storageSyncSaga';
import { storageSyncConfig } from './storage/config';

export function createRootSaga(entityNames: EntityKeys[]) {
    return function* rootSaga() {
        const sagaCoordinator = SagaCoordinator.getInstance();
        sagaCoordinator.setEntityNames(entityNames);

        const storageSaga = createStorageSyncSaga(storageSyncConfig);

        yield all([
            call([sagaCoordinator, sagaCoordinator.initializeEntitySagas]),
            call(storageSaga)
        ]);
    };
}
