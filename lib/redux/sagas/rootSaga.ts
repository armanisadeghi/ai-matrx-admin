// lib/redux/sagas/rootSaga.ts
import { all, call, fork } from 'redux-saga/effects';
import { EntityKeys } from '@/types/entityTypes';
import { SagaCoordinator } from '@/lib/redux/sagas/SagaCoordinator';
import { createStorageSyncSaga } from '@/lib/redux/sagas/storage/storageSyncSaga';
import { storageSyncConfig } from '@/lib/redux/sagas/storage/config';
import { socketSaga } from '@/lib/redux/features/socket/socketSaga';

export function createRootSaga(entityNames: EntityKeys[]) {
    return function* rootSaga() {
        const sagaCoordinator = SagaCoordinator.getInstance();
        sagaCoordinator.setEntityNames(entityNames);

        const storageSaga = createStorageSyncSaga(storageSyncConfig);

        yield all([
            call([sagaCoordinator, sagaCoordinator.initializeEntitySagas]),
            call(storageSaga),
            fork(socketSaga),
        ]);
    };
}