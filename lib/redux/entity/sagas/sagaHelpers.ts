// lib/redux/entity/sagaHelpers.ts

import {
    AllEntityFieldKeys,
    AllEntityNameVariations,
    AnyDatabaseColumnForEntity,
    AnyEntityDatabaseTable,
    EntityKeys
} from "@/types/entityTypes";
import {createEntitySlice} from "@/lib/redux/entity/slice";
import {PayloadAction} from "@reduxjs/toolkit";
import {MatrxRecordId, PrimaryKeyMetadata} from "@/lib/redux/entity/types/stateTypes";
import {supabase} from "@/utils/supabase/client";
import EntityLogger from "@/lib/redux/entity/utils/entityLogger";
import {call, put, select} from "redux-saga/effects";
import {
    selectEntityDatabaseName, selectEntityFrontendName, selectFrontendConversion,
    selectPayloadOptionsDatabaseConversion, selectUnifiedDatabaseObjectConversion
} from "@/lib/redux/schema/globalCacheSelectors";
import {callbackManager} from "@/utils/callbackManager";
import {getEntitySlice} from "@/lib/redux/entity/entitySlice";


const trace = "SAGA CONVERSIONS";
const sagaLogger = EntityLogger.createLoggerWithDefaults(trace, 'NoEntity');

export interface BaseSagaContext<TEntity extends EntityKeys> {
    entityKey: TEntity;
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"];
    api: any;
    action: PayloadAction<any>;
    tableName: AnyEntityDatabaseTable;
    dbQueryOptions?: QueryOptions<TEntity>;
    unifiedDatabaseObject?: UnifiedDatabaseObject;
}

export interface WithFullConversionSagaContext<TEntity extends EntityKeys> extends BaseSagaContext<TEntity> {
    successAction: (payload: any) => PayloadAction<any>;
}

export type SagaHandler<TEntity extends EntityKeys> = (
    context: BaseSagaContext<TEntity>
) => Generator;

export type WithFullConversionSagaHandler<TEntity extends EntityKeys> = (
    context: WithFullConversionSagaContext<TEntity>
) => Generator;

export interface QueryOptions<TEntity extends EntityKeys> {
    tableName: AnyEntityDatabaseTable;
    recordKey?: MatrxRecordId;
    filters?: Partial<Record<AllEntityFieldKeys, unknown>>;
    sorts?: Array<{
        column: AllEntityFieldKeys;
        ascending?: boolean;
    }>;
    limit?: number;
    offset?: number;
    columns?: AllEntityFieldKeys[];
    primaryKeyMetadata?: PrimaryKeyMetadata;
    primaryKeyFields?: string[];
}

export interface QueryOptionsReturn<TEntity extends EntityKeys> {
    tableName: AnyEntityDatabaseTable;
    recordKey?: MatrxRecordId;
    filters?: Partial<Record<AnyDatabaseColumnForEntity<TEntity>, unknown>>;
    sorts?: Array<{
        column: AnyDatabaseColumnForEntity<TEntity>;
        ascending?: boolean;
    }>;
    limit?: number;
    offset?: number;
    columns?: AnyDatabaseColumnForEntity<TEntity>[];
    primaryKeyMetadata?: PrimaryKeyMetadata;
    primaryKeyFields?: string[];
}


export interface FlexibleQueryOptions {
    entityNameAnyFormat: AllEntityNameVariations;
    callback?: string;
    recordKeys?: MatrxRecordId[];
    filters?: Partial<Record<AllEntityFieldKeys, unknown>>;
    sorts?: Array<{
        column: AllEntityFieldKeys;
        ascending?: boolean;
    }>;
    limit?: number;
    offset?: number;
    maxCount?: number;
    columns?: AllEntityFieldKeys[];
    data?: unknown | unknown[];
    matrxRecordId?: MatrxRecordId;
}


function* initializeDatabaseApi(tableName: AnyEntityDatabaseTable) {
    return supabase.from(tableName);
}


export function* withConversion<TEntity extends EntityKeys>(
    sagaHandler: SagaHandler<TEntity>,
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    action: PayloadAction<any>
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('WITH CONVERSION', entityKey);
    entityLogger.log('debug', 'Full Action Payload', action.payload);


    try {
        const tableName: AnyEntityDatabaseTable = yield select(selectEntityDatabaseName, entityKey);
        entityLogger.log('debug', 'Resolved table name', {tableName});

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
            action: {...action, payload: action.payload},
            tableName,
            dbQueryOptions
        };

        const result = yield call(sagaHandler, context);

        if (action.payload.callbackId) {
            callbackManager.trigger(action.payload.callbackId, {success: true});
        }

        return result;

    } catch (error: any) {
        entityLogger.log('error', 'Error in conversion', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during database operation",
            code: error.code,
            details: error
        }));

        if (action.payload.callback) {
            callbackManager.trigger(action.payload.callbackId, {success: false, error: "Error message"});
        }

        throw error;
    }
}

export interface UnifiedDatabaseObject {
    entityName: EntityKeys;
    tableName: AnyEntityDatabaseTable;
    primaryKeyMetadata: PrimaryKeyMetadata;
    frontendPks: AllEntityFieldKeys[];
    databasePks: string[];
    frontendDisplayField: AllEntityFieldKeys;
    databaseDisplayField: string;

    recordKeys?: MatrxRecordId[];
    parsedFrontendRecords?: Record<AllEntityFieldKeys, string>[];
    parsedDatabaseRecords?: Record<string, string>[];

    filters?: Partial<Record<string, unknown>>;
    sorts?: Array<{
        column: string;
        ascending?: boolean;
    }>;
    limit?: number;
    offset?: number;
    columns?: string[];

    data?: unknown | unknown[];
    primaryKeysAndValues?: Record<string, any>;
    matrxRecordId?: MatrxRecordId;
}

export interface FlexibleQueryOptions {
    entityNameAnyFormat: AllEntityNameVariations;
    recordKeys?: MatrxRecordId[];
    filters?: Partial<Record<AllEntityFieldKeys, unknown>>;
    sorts?: Array<{
        column: AllEntityFieldKeys;
        ascending?: boolean;
    }>;
    limit?: number;
    offset?: number;
    columns?: AllEntityFieldKeys[];
    data?: unknown | unknown[];
}

export const optionalActionKeys = [
    'recordKeys',
    'matrxRecordId',
    'filters',
    'sorts',
    'limit',
    'offset',
    'data'
] as const;

export function* withFullConversion<TEntity extends EntityKeys>(
    sagaHandler: WithFullConversionSagaHandler<TEntity>,
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    action: PayloadAction<any>,
    successAction?: (payload: any) => PayloadAction<any>
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('WITH FULL CONVERSION', entityKey);
    const payload = action.payload;
    entityLogger.log('debug', 'Starting with: ', payload);

    try {
        const flexibleQueryOptions: FlexibleQueryOptions = {
            entityNameAnyFormat: entityKey
        };

        entityLogger.log('debug', 'Flexible Query Options', flexibleQueryOptions);

        optionalActionKeys.forEach((key) => {
            if (key in payload && payload[key] !== undefined) {
                // @ts-ignore
                flexibleQueryOptions[key] = payload[key];
            }
        });

        entityLogger.log('debug', 'Flexible Query Options with optional keys', flexibleQueryOptions);

        if (payload.columns || payload.fields) {
            flexibleQueryOptions.columns = payload.columns || payload.fields;
        }

        entityLogger.log('debug', 'Flexible Query Options with columns', flexibleQueryOptions);

        const unifiedDatabaseObject: UnifiedDatabaseObject = yield select(
            selectUnifiedDatabaseObjectConversion,
            flexibleQueryOptions
        );

        entityLogger.log('info', 'Updated unifiedDatabaseObject: ', unifiedDatabaseObject);

        const api = yield call(initializeDatabaseApi, unifiedDatabaseObject.tableName);
        entityLogger.log('debug', 'Database API initialized', entityKey);


        const context: WithFullConversionSagaContext<TEntity> = {
            entityKey,
            actions,
            api,
            action: {...action, payload: payload},
            tableName: unifiedDatabaseObject.tableName,
            unifiedDatabaseObject,
            successAction,
        };

        const result = yield call(sagaHandler, context);

        entityLogger.log('debug', 'withFullConversion result', entityKey, result);


        const frontendResponse = yield select(selectFrontendConversion, {entityName: entityKey, data: result});
        entityLogger.log('debug', 'Frontend Conversion', entityKey, frontendResponse);

        if (successAction) {
            yield put(successAction(frontendResponse));
        }

        if (action.payload.callbackId) {
            callbackManager.trigger(action.payload.callbackId, {success: true});
        }

    } catch (error: any) {
        entityLogger.log('error', 'Error in conversion', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during database operation",
            code: error.code,
            details: error
        }));

        if (payload.callbackId) {
            callbackManager.trigger(action.payload.callbackId, {success: false, error: "Error message"});
        }
        throw error;
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
        tableName: AllEntityNameVariations;  // This is the database version of the name
        data: any;
    }[];
}

export const transformDatabaseResponse = (
    response: Record<string, any>
): TransformResult => {
    const result: TransformResult = {
        mainEntity: {
            data: {} // Will contain main object data
        },
        relatedEntities: []
    };

    Object.entries(response).forEach(([key, value]) => {
        if (key.endsWith('_reference') || key.endsWith('_inverse')) {
            const tableName = key.replace(/_reference$/, '').replace(/_inverse$/, '') as AllEntityNameVariations;

            result.relatedEntities.push({
                tableName,
                data: value
            });
        } else {
            result.mainEntity.data[key] = value;
        }
    });

    return result;
};


export function* withFullRelationConversion<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    action: PayloadAction<any>,
    successAction?: (payload: any) => PayloadAction<any>
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('WITH FULL RELATION CONVERSION', entityKey);
    const payload = action.payload;

    try {
        const flexibleQueryOptions: FlexibleQueryOptions = {
            entityNameAnyFormat: entityKey,
        };

        entityLogger.log('debug', 'Flexible Query Options', flexibleQueryOptions);

        optionalActionKeys.forEach((key) => {
            if (key in payload && payload[key] !== undefined) {
                // @ts-ignore
                flexibleQueryOptions[key] = payload[key];
            }
        });

        entityLogger.log('debug', 'Flexible Query Options with optional keys', flexibleQueryOptions);

        if (payload.columns || payload.fields) {
            flexibleQueryOptions.columns = payload.columns || payload.fields;
        }

        entityLogger.log('info', 'Flexible Query Options with columns', flexibleQueryOptions);

        const unifiedDatabaseObject: UnifiedDatabaseObject = yield select(
            selectUnifiedDatabaseObjectConversion,
            flexibleQueryOptions
        );

        entityLogger.log('info', 'Updated unifiedDatabaseObject just before call:', unifiedDatabaseObject);

        const rpcArgs = {
            p_table_name: unifiedDatabaseObject.tableName,
            p_primary_key_values: unifiedDatabaseObject.primaryKeysAndValues
        };

        const {data, error} = yield supabase
            .rpc('fetch_all_fk_ifk', rpcArgs, {
                count: 'exact'
            });

        if (error) {
            entityLogger.log('error', 'RPC call failed:', error);
            throw error;
        }

        entityLogger.log('info', 'Full response data:', data);


        const frontendResponse = yield select(selectFrontendConversion, {entityName: entityKey, data: data});
        entityLogger.log('info', 'Frontend Conversion', frontendResponse);
        yield put(actions.fetchOneWithFkIfkSuccess(frontendResponse));

        const transformed = transformDatabaseResponse(data);

        const groupedEntities: Record<EntityKeys, any[]> = {};

        for (const relatedEntity of transformed.relatedEntities) {
            const frontendEntityName: EntityKeys = yield select(selectEntityFrontendName, relatedEntity.tableName);
            entityLogger.log('info', 'Related Entity Frontend Entity Name', frontendEntityName);

            // Initialize array if this is the first record for this entity
            if (!groupedEntities[frontendEntityName]) {
                groupedEntities[frontendEntityName] = [];
            }

            // If it's an array, add all records, if single object, wrap in array
            const recordsToAdd = Array.isArray(relatedEntity.data)
                                 ? relatedEntity.data
                                 : [relatedEntity.data];

            // Convert each record to frontend format
            for (const record of recordsToAdd) {
                const frontendResponse = yield select(selectFrontendConversion, {
                    entityName: frontendEntityName,
                    data: record
                });
                groupedEntities[frontendEntityName].push(frontendResponse);
            }
        }

        // Dispatch grouped records
        for (const [frontendEntityName, records] of Object.entries(groupedEntities)) {
            const relatedActions = getSliceActions(frontendEntityName as EntityKeys);
            if (relatedActions) {
                yield put(relatedActions.fetchedAsRelatedSuccess(records));
                entityLogger.log('info', `Updated ${records.length} records for entity:`, frontendEntityName);
            } else {
                console.warn(`No actions found for entity key: ${frontendEntityName}`);
            }
        }

        if (action.payload.callbackId) {
            callbackManager.trigger(action.payload.callbackId, {success: true});
        } else {
            console.warn("No callbackId provided in action payload");
        }
    } catch (error: any) {
        yield put(
            actions.setError({
                message: error.message || "An error occurred during database operation",
                code: error.code,
                details: error,
            })
        );

        if (payload.callbackId) {
            callbackManager.trigger(action.payload.callbackId, {success: false, error: "Error message"});
        }
        throw error;
    }
}


// const frontendResponse = yield select(selectFrontendConversion, {entityName: entityKey, data: data});
// if (successAction) {
//     yield put(successAction(frontendResponse));
// }
