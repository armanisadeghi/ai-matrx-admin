// lib/redux/sagas/SagaCoordinator.ts

import { channel, Channel } from 'redux-saga';
import {all, call, select} from 'redux-saga/effects';
import { createEntitySaga } from '../entity/entitySagas';
import { UnifiedSchemaCache } from "@/types/entityTypes";
import {
    getSchema,
    selectConvertEntityName,
    selectConvertFieldNames,
    selectConvertEntityNameFormat,
    selectConvertFieldNameFormat
} from '@/lib/redux/selectors/schemaSelectors';

export class SagaCoordinator {
    private static instance: SagaCoordinator | null = null;
    private coordinationChannel: Channel<any>;

    private constructor() {
        this.coordinationChannel = channel();
    }

    static getInstance(): SagaCoordinator {
        if (!SagaCoordinator.instance) {
            SagaCoordinator.instance = new SagaCoordinator();
        }
        return SagaCoordinator.instance;
    }

    getChannel(): Channel<any> {
        return this.coordinationChannel;
    }

    *initializeEntitySagas() {
        const schema: UnifiedSchemaCache = yield select(getSchema);

        for (const entityKey of Object.keys(schema.schema)) {
            const entitySchema = schema.schema[entityKey];

            const saga = createEntitySaga(entityKey as keyof typeof schema.schema, entitySchema);
            yield call(saga);
        }
    }
}
