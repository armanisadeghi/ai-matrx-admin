// lib/redux/entity/sagaHelpers.ts

import {AllEntityFieldKeys, AllEntityNameVariations, AnyEntityDatabaseTable, EntityKeys} from "@/types/entityTypes";
import {createEntitySlice} from "@/lib/redux/entity/slice";
import {PayloadAction} from "@reduxjs/toolkit";
import {MatrxRecordId, PrimaryKeyMetadata} from "@/lib/redux/entity/types";
import {supabase} from "@/utils/supabase/client";
import EntityLogger from "@/lib/redux/entity/entityLogger";
import {call, put, select} from "redux-saga/effects";
import {
    selectEntityDatabaseName, selectFrontendConversion,
    selectPayloadOptionsDatabaseConversion, selectUnifiedDatabaseObjectConversion
} from "@/lib/redux/schema/globalCacheSelectors";
import {callbackManager} from "@/utils/callbackManager";


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
    columns?: AllEntityFieldKeys[];
    data?: unknown | unknown[];
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
    entityLogger.log('info', 'Full Action Payload', action.payload);


    try {
        const tableName: AnyEntityDatabaseTable = yield select(selectEntityDatabaseName, entityKey);
        entityLogger.log('info', 'Resolved table name', {tableName});

        const api = yield call(initializeDatabaseApi, tableName);
        entityLogger.log('info', 'Database API initialized');

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
            callbackManager.trigger(action.payload.callbackId, { success: true });
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
            callbackManager.trigger(action.payload.callbackId, { success: false, error: "Error message" });
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
    entityLogger.log('info', 'Starting with: ', payload);

    try {
        const flexibleQueryOptions: FlexibleQueryOptions = {
            entityNameAnyFormat: entityKey
        };

        entityLogger.log('info', 'Flexible Query Options', flexibleQueryOptions);

        optionalActionKeys.forEach((key) => {
            if (key in payload && payload[key] !== undefined) {
                flexibleQueryOptions[key] = payload[key];
            }
        });

        entityLogger.log('info', 'Flexible Query Options with optional keys', flexibleQueryOptions);

        if (payload.columns || payload.fields) {
            flexibleQueryOptions.columns = payload.columns || payload.fields;
        }

        entityLogger.log('info', 'Flexible Query Options with columns', flexibleQueryOptions);

        const unifiedDatabaseObject: UnifiedDatabaseObject = yield select(
            selectUnifiedDatabaseObjectConversion,
            flexibleQueryOptions
        );

        entityLogger.log('info', 'Updated unifiedDatabaseObject: ', unifiedDatabaseObject);

        const api = yield call(initializeDatabaseApi, unifiedDatabaseObject.tableName);
        entityLogger.log('info', 'Database API initialized', entityKey);


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
            callbackManager.trigger(action.payload.callbackId, { success: true });
        }

    } catch (error: any) {
        entityLogger.log('error', 'Error in conversion', entityKey, error);
        yield put(actions.setError({
            message: error.message || "An error occurred during database operation",
            code: error.code,
            details: error
        }));

        if (payload.callbackId) {
            callbackManager.trigger(action.payload.callbackId, { success: false, error: "Error message" });
        }
        throw error;
    }
}
