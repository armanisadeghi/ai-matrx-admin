// lib/redux/entity/sagaHelpers.ts

import { AllEntityNameVariations, AnyEntityDatabaseTable, EntityKeys } from '@/types/entityTypes';
import { createEntitySlice } from '@/lib/redux/entity/slice';
import { PayloadAction } from '@reduxjs/toolkit';
import { FlexibleQueryOptions, QueryOptions, UnifiedDatabaseObject } from '@/lib/redux/entity/types/stateTypes';
import { supabase } from '@/utils/supabase/client';
import EntityLogger from '@/lib/redux/entity/utils/entityLogger';
import { call, put, select } from 'redux-saga/effects';
import {
    selectEntityDatabaseName,
    selectEntityFrontendName,
    selectFrontendConversion,
    selectPayloadOptionsDatabaseConversion,
    selectUnifiedDatabaseObjectConversion,
} from '@/lib/redux/schema/globalCacheSelectors';
import { callbackManager } from '@/utils/callbackManager';
import { getEntitySlice } from '@/lib/redux/entity/entitySlice';
import { createStructuredError } from '@/utils/errorContext';

export interface BaseSagaContext<TEntity extends EntityKeys> {
    entityKey: TEntity;
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'];
    api: any;
    action: PayloadAction<any>;
    tableName: AnyEntityDatabaseTable;
    dbQueryOptions?: QueryOptions<TEntity>;
    unifiedDatabaseObject?: UnifiedDatabaseObject;
}

export interface WithFullConversionSagaContext<TEntity extends EntityKeys> extends BaseSagaContext<TEntity> {
    successAction: (payload: any) => PayloadAction<any>;
}

export type SagaHandler<TEntity extends EntityKeys> = (context: BaseSagaContext<TEntity>) => Generator;

export type WithFullConversionSagaHandler<TEntity extends EntityKeys> = (context: WithFullConversionSagaContext<TEntity>) => Generator;

function* initializeDatabaseApi(tableName: AnyEntityDatabaseTable) {
    return supabase.from(tableName);
}

export function* withConversion<TEntity extends EntityKeys>(
    sagaHandler: SagaHandler<TEntity>,
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'],
    action: PayloadAction<any>
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('WITH CONVERSION', entityKey);
    entityLogger.log('debug', 'Full Action Payload', action.payload);

    try {
        const tableName: AnyEntityDatabaseTable = yield select(selectEntityDatabaseName, entityKey);
        entityLogger.log('debug', 'Resolved table name', { tableName });

        const api = yield call(initializeDatabaseApi, tableName);
        entityLogger.log('debug', 'Database API initialized');

        const dbQueryOptions: QueryOptions<TEntity> = yield select(selectPayloadOptionsDatabaseConversion, {
            entityName: entityKey,
            options: action.payload?.options || {},
        });
        entityLogger.log('debug', 'Query options selected', dbQueryOptions);

        const context: BaseSagaContext<TEntity> = {
            entityKey,
            actions,
            api,
            action: { ...action, payload: action.payload },
            tableName,
            dbQueryOptions,
        };

        const result = yield call(sagaHandler, context);

        if (action.payload.callbackId) {
            const callbackData = {
                success: true,
                entityName: entityKey,
                result,
                requestData: context,
                originalPayload: action.payload,
            };

            callbackManager.triggerWithContext(action.payload.callbackId, callbackData, {
                progress: {
                    progress: 100,
                    status: 'completed',
                },
            });
        }

        return result;
    } catch (error: any) {
        entityLogger.log('error', 'Error in conversion', error);
        yield put(
            actions.setError({
                message: error.message || 'An error occurred during database operation',
                code: error.code,
                details: error,
            })
        );

        if (action.payload.callback) {
            callbackManager.trigger(action.payload.callbackId, { success: false, error: 'Error message' });
        }

        throw error;
    }
}

export const optionalActionKeys = ['recordKeys', 'matrxRecordId', 'filters', 'sorts', 'limit', 'offset', 'data', 'tempRecordId'] as const;

export function* withFullConversion<TEntity extends EntityKeys>(
    sagaHandler: WithFullConversionSagaHandler<TEntity>,
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'],
    action: PayloadAction<any>,
    successAction?: (payload: any) => PayloadAction<any>
) {
    const DEBUG_LEVEL = 'info';
    const entityLogger = EntityLogger.createLoggerWithDefaults('WITH FULL CONVERSION', entityKey);
    const payload = action.payload;
    entityLogger.log(DEBUG_LEVEL, 'Starting with: ', payload);

    try {
        const flexibleQueryOptions: FlexibleQueryOptions = {
            entityNameAnyFormat: entityKey,
        };

        entityLogger.log(DEBUG_LEVEL, 'Flexible Query Options', flexibleQueryOptions);

        optionalActionKeys.forEach((key) => {
            if (key in payload && payload[key] !== undefined) {
                // @ts-ignore
                flexibleQueryOptions[key] = payload[key];
            }
        });

        entityLogger.log(DEBUG_LEVEL, 'Flexible Query Options with optional keys', flexibleQueryOptions);

        if (payload.columns || payload.fields) {
            flexibleQueryOptions.columns = payload.columns || payload.fields;
        }

        entityLogger.log(DEBUG_LEVEL, 'Flexible Query Options with columns', flexibleQueryOptions);

        const unifiedDatabaseObject: UnifiedDatabaseObject = yield select(selectUnifiedDatabaseObjectConversion, flexibleQueryOptions);

        entityLogger.log(DEBUG_LEVEL, 'Updated unifiedDatabaseObject: ', unifiedDatabaseObject);

        const api = yield call(initializeDatabaseApi, unifiedDatabaseObject.tableName);
        entityLogger.log(DEBUG_LEVEL, 'Database API initialized', entityKey);

        const context: WithFullConversionSagaContext<TEntity> = {
            entityKey,
            actions,
            api,
            action: { ...action, payload: payload },
            tableName: unifiedDatabaseObject.tableName,
            unifiedDatabaseObject,
            successAction,
        };

        const result = yield call(sagaHandler, context);

        entityLogger.log(DEBUG_LEVEL, 'withFullConversion result', entityKey, result);

        const frontendResponse = yield select(selectFrontendConversion, { entityName: entityKey, data: result });
        entityLogger.log(DEBUG_LEVEL, 'Frontend Conversion', entityKey, frontendResponse);

        if (successAction) {
            yield put(successAction(frontendResponse));
        }

        if (action.payload.callbackId) {
            const callbackData = {
                success: true,
                entityName: entityKey,
                result,
                requestData: context,
                originalPayload: action.payload,
            };

            callbackManager.triggerWithContext(action.payload.callbackId, callbackData, {
                progress: {
                    progress: 100,
                    status: 'completed',
                },
            });
        }

    } catch (error: any) {
        entityLogger.log('error', 'withFullConversion Error in conversion', entityKey, error, payload);

        yield put(
            actions.setError(
                createStructuredError({
                    error,
                    location: 'handleUpdate Saga',
                    action,
                    entityKey,
                })
            )
        );

        if (payload.callbackId) {
            callbackManager.trigger(action.payload.callbackId, { success: false, error: 'Error message' });
        }
    }
}

export function getSliceActions<TEntity extends EntityKeys>(entityKey: TEntity) {
    const slice = getEntitySlice(entityKey);
    return slice.actions;
}

interface TransformResult {
    mainEntity: {
        data: any;
    };
    relatedEntities: {
        tableName: AllEntityNameVariations; // This is the database version of the name
        data: any;
    }[];
}

export const transformDatabaseResponse = (response: Record<string, any>): TransformResult => {
    const result: TransformResult = {
        mainEntity: {
            data: {}, // Will contain main object data
        },
        relatedEntities: [],
    };

    Object.entries(response).forEach(([key, value]) => {
        if (key.endsWith('_reference') || key.endsWith('_inverse')) {
            const tableName = key.replace(/_reference$/, '').replace(/_inverse$/, '') as AllEntityNameVariations;

            result.relatedEntities.push({
                tableName,
                data: value,
            });
        } else {
            result.mainEntity.data[key] = value;
        }
    });

    return result;
};

export function* withFullRelationConversion<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'],
    action: PayloadAction<any>,
    successAction?: (payload: any) => PayloadAction<any>
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('WITH FULL RELATION CONVERSION', entityKey);
    const payload = action.payload;
    const DEBUG_LEVEL = 'info';

    entityLogger.log(DEBUG_LEVEL, 'Starting with payload:', payload);

    try {
        const flexibleQueryOptions: FlexibleQueryOptions = {
            entityNameAnyFormat: entityKey,
        };

        entityLogger.log(DEBUG_LEVEL, 'Flexible Query Options', flexibleQueryOptions);

        optionalActionKeys.forEach((key) => {
            if (key in payload && payload[key] !== undefined) {
                // @ts-ignore
                flexibleQueryOptions[key] = payload[key];
            }
        });

        entityLogger.log(DEBUG_LEVEL, 'Flexible Query Options with optional keys', flexibleQueryOptions);

        if (payload.columns || payload.fields) {
            flexibleQueryOptions.columns = payload.columns || payload.fields;
        }

        entityLogger.log(DEBUG_LEVEL, 'Flexible Query Options with columns', flexibleQueryOptions);

        const unifiedDatabaseObject: UnifiedDatabaseObject = yield select(selectUnifiedDatabaseObjectConversion, flexibleQueryOptions);

        entityLogger.log(DEBUG_LEVEL, 'Updated unifiedDatabaseObject just before call:', unifiedDatabaseObject);
        entityLogger.log(DEBUG_LEVEL, 'Unified Database Object Table Name:', unifiedDatabaseObject.tableName);
        entityLogger.log(DEBUG_LEVEL, 'Unified Database Object Primary Keys and Values:', unifiedDatabaseObject.primaryKeysAndValues);

        const rpcArgs = {
            p_table_name: unifiedDatabaseObject.tableName,
            p_primary_key_values: unifiedDatabaseObject.primaryKeysAndValues,
        };

        const { data, error } = yield supabase.rpc('fetch_all_fk_ifk', rpcArgs, {
            count: 'exact',
        });

        if (error) {
            entityLogger.log('error', 'RPC call failed:', error);
            throw error;
        }

        entityLogger.log(DEBUG_LEVEL, 'Full response data:', data);

        const frontendResponse = yield select(selectFrontendConversion, { entityName: entityKey, data: data });
        entityLogger.log(DEBUG_LEVEL, 'Frontend Conversion', frontendResponse);
        yield put(actions.fetchOneWithFkIfkSuccess(frontendResponse));

        const transformed = transformDatabaseResponse(data);

        const groupedEntities: Partial<Record<EntityKeys, any[]>> = {};

        for (const relatedEntity of transformed.relatedEntities) {
            const frontendEntityName: EntityKeys = yield select(selectEntityFrontendName, relatedEntity.tableName);
            entityLogger.log(DEBUG_LEVEL, 'Related Entity Frontend Entity Name', frontendEntityName);

            // Initialize array if this is the first record for this entity
            if (!groupedEntities[frontendEntityName]) {
                groupedEntities[frontendEntityName] = [];
            }

            // If it's an array, add all records, if single object, wrap in array
            const recordsToAdd = Array.isArray(relatedEntity.data) ? relatedEntity.data : [relatedEntity.data];

            // Convert each record to frontend format
            for (const record of recordsToAdd) {
                const frontendResponse = yield select(selectFrontendConversion, {
                    entityName: frontendEntityName,
                    data: record,
                });
                groupedEntities[frontendEntityName].push(frontendResponse);
            }
        }

        // Dispatch grouped records
        for (const [frontendEntityName, records] of Object.entries(groupedEntities)) {
            const relatedActions = getSliceActions(frontendEntityName as EntityKeys);
            if (relatedActions) {
                yield put(relatedActions.fetchedAsRelatedSuccess(records));
                entityLogger.log(DEBUG_LEVEL, `Updated ${records.length} records for entity:`, frontendEntityName);
            } else {
                console.warn(`No actions found for entity key: ${frontendEntityName}`);
            }
        }

        if (action.payload.callbackId) {
            const callbackData = {
                success: true,
                entityName: entityKey,
                result: frontendResponse,
                requestData: unifiedDatabaseObject,
                originalPayload: action.payload,
            };

            callbackManager.triggerWithContext(action.payload.callbackId, callbackData, {
                progress: {
                    progress: 100,
                    status: 'completed',
                },
            });
        }
        
    } catch (error: any) {
        yield put(
            actions.setError({
                message: error.message || 'An error occurred during database operation',
                code: error.code,
                details: error,
            })
        );

        if (payload.callbackId) {
            callbackManager.trigger(action.payload.callbackId, { success: false, error: 'Error message' });
        }
        throw error;
    }
}

// const frontendResponse = yield select(selectFrontendConversion, {entityName: entityKey, data: data});
// if (successAction) {
//     yield put(successAction(frontendResponse));
// }
