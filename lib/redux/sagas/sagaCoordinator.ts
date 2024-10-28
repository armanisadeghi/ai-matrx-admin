import { channel, Channel } from 'redux-saga';
import {
    AutomationEntities,
    EntityNameFormatMap,
    EntityNameToCanonicalMap,
    FieldNameFormatMap,
    FieldNameToCanonicalMap,
    UnifiedSchemaCache
} from "@/types/entityTypes";
import { all, takeLatest } from 'redux-saga/effects';
import { createEntitySaga } from '../tables/dynamicTableSagas';

export class SagaCoordinator {
    private static instance: SagaCoordinator | null = null;
    private coordinationChannel: Channel<any>;
    private unifiedSchema: UnifiedSchemaCache;

    private schema: AutomationEntities;
    private entityNameToCanonical: EntityNameToCanonicalMap;
    private fieldNameToCanonical: FieldNameToCanonicalMap;
    private entityNameFormats: EntityNameFormatMap;
    private fieldNameFormats: FieldNameFormatMap;

    private constructor(unifiedSchema: UnifiedSchemaCache) {
        this.coordinationChannel = channel(); // Initialize the saga coordination channel
        this.unifiedSchema = unifiedSchema; // Store unifiedSchema as a whole

        // Initialize individual elements from unifiedSchema
        this.schema = unifiedSchema.schema;
        this.entityNameToCanonical = unifiedSchema.entityNameToCanonical;
        this.fieldNameToCanonical = unifiedSchema.fieldNameToCanonical;
        this.entityNameFormats = unifiedSchema.entityNameFormats;
        this.fieldNameFormats = unifiedSchema.fieldNameFormats;
    }

    static getInstance(unifiedSchema?: UnifiedSchemaCache): SagaCoordinator {
        if (!SagaCoordinator.instance) {
            if (!unifiedSchema) {
                throw new Error('SagaCoordinator requires a unifiedSchema to be initialized the first time.');
            }
            SagaCoordinator.instance = new SagaCoordinator(unifiedSchema);
        } else if (unifiedSchema) {
            console.warn('Unified schema is ignored. SagaCoordinator is already initialized.');
        }
        return SagaCoordinator.instance;
    }

    getChannel(): Channel<any> {
        return this.coordinationChannel;
    }

    getSchema(): UnifiedSchemaCache {
        return this.unifiedSchema;
    }

    // Initialize Sagas for all entities
    initializeEntitySagas() {
        const allSagas = [];

        for (const entityKey of Object.keys(this.schema)) {
            const entitySchema = this.schema[entityKey];
            const saga = createEntitySaga(entityKey as keyof AutomationEntities, entitySchema);
            allSagas.push(saga());
        }

        return function* rootSaga() {
            yield all(allSagas);
        };
    }
}
