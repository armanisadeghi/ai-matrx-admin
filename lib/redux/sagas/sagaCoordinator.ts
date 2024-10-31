// lib/redux/sagas/SagaCoordinator.ts

import { channel, Channel } from 'redux-saga';
import { all, call, select } from 'redux-saga/effects';
import { createEntitySaga } from '../entity/entitySagas';
import { EntityKeys, UnifiedSchemaCache } from "@/types/entityTypes";

export class SagaCoordinator {
    private static instance: SagaCoordinator | null = null;
    private coordinationChannel: Channel<any>;
    private entityNames: EntityKeys[] = [];

    private constructor() {
        this.coordinationChannel = channel();
    }

    static getInstance(): SagaCoordinator {
        if (!SagaCoordinator.instance) {
            SagaCoordinator.instance = new SagaCoordinator();
        }
        console.log('SagaCoordinator returning instance');
        return SagaCoordinator.instance;
    }

    setEntityNames(entityNames: EntityKeys[]) {
        console.log('Setting entity names...');
        this.entityNames = entityNames;
    }

    getChannel(): Channel<any> {
        return this.coordinationChannel;
    }

    *initializeEntitySagas() {
        const sagas = this.entityNames.map((entityKey) => {
            const saga = createEntitySaga(entityKey);
            // console.log('Creating saga for entity:', entityKey);
            return call(saga);
        });

        yield all(sagas);
    }
}
