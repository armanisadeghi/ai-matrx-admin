import {AnyEntityDatabaseTable, EntityData, EntityKeys} from "@/types/entityTypes";
import {createEntitySlice} from "@/lib/redux/entity/slice";
import {PayloadAction} from "@reduxjs/toolkit";
import {BatchOperationPayload, FilterPayload, HistoryEntry, MatrxRecordId, QueryOptions, UnifiedDatabaseObject} from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "@/lib/redux/entity/utils/entityLogger";
import {all, call, delay, put, select, take} from "redux-saga/effects";
import {
    selectDatabaseConversion,
    selectEntityDatabaseName,
    selectEntityMetadata, selectEntityPrimaryKeyMetadata, selectEntityRelationships,
    selectFrontendConversion
} from "@/lib/redux/schema/globalCacheSelectors";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {createRecordKey} from "@/lib/redux/entity/utils/stateHelpUtils";
import {Draft} from "immer";
import {BaseSagaContext} from "@/lib/redux";
import {FetchOneWithFkIfkPayload, getOrFetchSelectedRecordsPayload} from "../actions";
import {createStructuredError} from "@/utils/errorContext";

const DEBOUNCE_MS = 300;
const CACHE_DURATION = 5 * 60 * 1000;
const trace = "SAGA HANDLERS";
const sagaLogger = EntityLogger.createLoggerWithDefaults(trace, 'NoEntity');


function* handleFetchOneWithFkIfk<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        tableName,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity>) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleFetchOneWithFkIfk', entityKey);

    try {
        const {data, error} = yield api
            .rpc('fetch_all_fk_ifk', {
                p_table_name: tableName,
                p_primary_key_values: unifiedDatabaseObject.primaryKeysAndValues
            });

        if (error) throw error;

        entityLogger.log('debug', 'Fetched data with relationships', data);
        return data;
    } catch (error: any) {
        yield put(actions.setError(
            createStructuredError({
                error,
                location: 'handleFetchOneWithFkIfk Saga',
                entityKey,
                additionalContext: {
                    tableName,
                    primaryKeysAndValues: unifiedDatabaseObject.primaryKeysAndValues,
                    rpcMethod: 'fetch_all_fk_ifk'
                }
            })
        ));
        throw error;
    }
}

function* handleFetchOne<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        tableName,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity>) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleFetchOne', entityKey);
    entityLogger.log('debug', 'Starting fetchOne', action.payload);

    // const relationships = yield select(selectEntityRelationships, entityKey);


    let query = api.select("*");

    Object.entries(unifiedDatabaseObject.primaryKeysAndValues).forEach(([key, value]) => {
        query = query.eq(key, value);
    });

    const {data, error} = yield query.single();

    if (error) throw error;

    entityLogger.log('debug', 'Fetched data', data);
    return data;
}

function* handleFetchOneWithRelated<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        tableName,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity>) {

    const relationships = yield select(selectEntityRelationships, entityKey);

    let query = api.select("*");

    Object.entries(unifiedDatabaseObject.primaryKeysAndValues).forEach(([key, value]) => {
        query = query.eq(key, value);
    });

    const {data: mainData, error} = yield query.single();

    if (error) throw error;

    // Process all relationships
    const relatedData: Record<string, any> = {};

    for (const relationship of relationships) {
        const {
            relationshipType,
            column,
            relatedTable,
            relatedColumn,
            junctionTable
        } = relationship;

        try {
            switch (relationshipType) {
                case 'foreignKey': {
                    // Fetch complete record for foreign key relationships
                    if (mainData[column]) {
                        const {data, error} = yield api
                            .from(relatedTable)
                            .select('*')
                            .eq(relatedColumn, mainData[column])
                            .single();

                        if (!error && data) {
                            relatedData[`${relatedTable}_${column}`] = data;
                        }
                    }
                    break;
                }

                case 'inverseForeignKey': {
                    // Get primary key fields for the related table
                    const relatedTablePrimaryKeys = yield select(selectEntityPrimaryKeyMetadata, relatedTable);
                    const primaryKeyFields = relatedTablePrimaryKeys.database_fields.join(',');

                    const {data, error} = yield api
                        .from(relatedTable)
                        .select(primaryKeyFields)
                        .eq(relatedColumn, mainData[column]);

                    if (!error && data) {
                        relatedData[`${relatedTable}_inverse`] = data;
                    }
                    break;
                }

                case 'manyToMany': {
                    if (junctionTable) {
                        // First get the related ids from junction table
                        const {data: junctionData, error: junctionError} = yield api
                            .from(junctionTable)
                            .select(relatedColumn)
                            .eq(column, mainData.id);

                        if (!junctionError && junctionData) {
                            const relatedIds = junctionData.map(record => record[relatedColumn]);

                            // Get primary key fields for the related table
                            const relatedTablePrimaryKeys = yield select(selectEntityPrimaryKeyMetadata, relatedTable);
                            const primaryKeyFields = relatedTablePrimaryKeys.database_fields.join(',');

                            // Then fetch only the primary keys from the related table
                            const {data: manyToManyData, error: relatedError} = yield api
                                .from(relatedTable)
                                .select(primaryKeyFields)
                                .in(relatedColumn, relatedIds);

                            if (!relatedError && manyToManyData) {
                                relatedData[`${relatedTable}_manyToMany`] = manyToManyData;
                            }
                        }
                    }
                    break;
                }
            }
        } catch (relationError) {
            console.error(`Error fetching related data for ${relatedTable}:`, relationError);
        }
    }

    return {
        ...mainData,
        relationships: relatedData
    };
}

function* handleFetchOneAdvanced<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        tableName,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity>) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleFetchOneAdvanced', entityKey);

    try {
        entityLogger.log('debug', 'Starting fetchOne', action.payload);

        let query = api.select("*");

        Object.entries(action.payload.primaryKeyValues).forEach(([key, value]) => {
            query = query.eq(key, value);
        });

        const {data, error} = yield query.single();
        if (error) throw error;

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        entityLogger.log('debug', 'Fetch one response', frontendResponse);

        yield put(actions.fetchOneSuccess(frontendResponse));
    } catch (error: any) {
        entityLogger.log('error', 'Error in fetchOne', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during fetch one.",
            code: error.code,
        }));
        throw error;
    }
}


function* handleGetOrFetchSelectedRecords<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    action: PayloadAction<getOrFetchSelectedRecordsPayload>,
    unifiedDatabaseObject?: UnifiedDatabaseObject,
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleGetOrFetchSelectedRecords', entityKey);

    try {
        entityLogger.log('debug', 'Starting', action.payload);

        const entitySelectors = createEntitySelectors(entityKey);
        const {existingRecords, recordIdsNotInState, primaryKeysToFetch} = yield select(
            entitySelectors.selectRecordsForFetching(action.payload.matrxRecordIds)
        );

        entityLogger.log('debug', '-Existing records', existingRecords);
        entityLogger.log('debug', '-Record IDs not in state', recordIdsNotInState);
        entityLogger.log('debug', '-Primary keys to fetch', primaryKeysToFetch);

        for (const recordId of existingRecords) {
            entityLogger.log('debug', '-Existing records', existingRecords);
            entityLogger.log('debug', '--- handleGetOrFetchSelectedRecords Adding to selection', recordId);
            entityLogger.log('debug', 'Dispatching addToSelection action');

            yield put(actions.addToSelection(recordId));
        }

        if (primaryKeysToFetch.length > 0) {
            const tableName: AnyEntityDatabaseTable = yield select(selectEntityDatabaseName, entityKey);

            const queryOptions: QueryOptions<TEntity> = {
                tableName,
                filters: primaryKeysToFetch.reduce((acc, primaryKey) => {
                    Object.assign(acc, primaryKey);
                    return acc;
                }, {} as Record<string, string>),
            };

            entityLogger.log('debug', 'Query options', queryOptions);

            if (action.payload.fetchMode === 'fkIfk') {
                for (const recordId of recordIdsNotInState) {
                    const payload: FetchOneWithFkIfkPayload = {
                        matrxRecordId: recordId,
                    };
                    entityLogger.log('debug', 'fetchMode is fkIfk. Triggering fetchOneWithFkIfk with Payload:', payload);
                    yield put(actions.fetchOneWithFkIfk(payload));
                }
            } else {
                entityLogger.log('debug', 'fetchMode is not fkIfk. Using fetchSelectedRecords');
                yield put(actions.fetchSelectedRecords(queryOptions));
            }
        }

        yield put(actions.getOrFetchSelectedRecordsSuccess());

    } catch (error: any) {
        entityLogger.log('error', 'Error', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during fetch by record IDs.",
            code: error.code,
        }));
    }
}

function* handleFetchSelectedRecords<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        tableName,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity> & {
        action: PayloadAction<QueryOptions<TEntity>>
    }) {
    const entitySelectors = createEntitySelectors(entityKey);
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleFetchSelectedRecords', entityKey);

    try {
        const queryOptions = action.payload;
        entityLogger.log('debug', 'Starting handleFetchSelectedRecords', queryOptions);

        let query = api.select("*");
        entityLogger.log('debug', 'Initial query:', query);

        // Apply filters from queryOptions
        if (queryOptions.filters) {
            Object.entries(queryOptions.filters).forEach(([field, value]) => {
                query = query.eq(field, value);
                entityLogger.log('debug', `Applying filter: ${field} = ${value}`, query);
            });
        }

        // Execute the query and log results
        entityLogger.log('debug', 'Final query with all filters applied:', query);
        const {data, error} = yield query;

        if (error) {
            entityLogger.log('error', 'Error from database query', error);
            throw error;
        }
        entityLogger.log('debug', 'Data fetched successfully:', data);

        // Prepare payload for frontend conversion and log it
        const payload = {entityName: entityKey, data};
        entityLogger.log('debug', 'Payload for frontend conversion:', payload);

        // Perform frontend conversion and log the result
        const frontendResponse = yield select(selectFrontendConversion, payload);
        entityLogger.log('debug', 'Fetch Selected Records: Frontend conversion result:', frontendResponse);

        // Dispatch success and add to selection actions
        yield put(actions.fetchSelectedRecordsSuccess(frontendResponse));
        entityLogger.log('debug', 'Dispatched fetchSelectedRecordsSuccess action', frontendResponse);

        const recordId = yield select(entitySelectors.selectRecordIdByRecord, frontendResponse);
        entityLogger.log('debug', 'Dispatching addToSelection Record ID:', recordId);
        yield put(actions.addToSelection(recordId));
        entityLogger.log('debug', 'Dispatched addToSelection action', frontendResponse);

    } catch (error: any) {
        entityLogger.log('error', 'Error in handleFetchSelectedRecords', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during the database query.",
            code: error.code,
        }));
    }
}


function* handleFetchAll<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        tableName,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity>) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleFetchAll', entityKey);

    try {
        entityLogger.log('debug', 'Starting fetchAll');

        let query = api.select("*");

        if (unifiedDatabaseObject.filters) {
            Object.entries(unifiedDatabaseObject.filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        const {data, error} = yield query;
        if (error) throw error;

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);
        entityLogger.log('debug', 'Fetch All response received and sending back');

        yield put(actions.fetchAllSuccess(frontendResponse));
    } catch (error: any) {
        entityLogger.log('error', 'Error in fetchAll', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during fetch all.",
            code: error.code,
        }));
        throw error;
    }
}

function* handleFetchQuickReference<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        tableName,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity>) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleFetchQuickReference', entityKey);

    try {
        entityLogger.log('debug', 'Starting', action.payload);

        const {primaryKeyMetadata, displayFieldMetadata} = yield select(selectEntityMetadata, entityKey);

        const dbPrimaryKeyFields = primaryKeyMetadata.database_fields;
        const dbDisplayField = displayFieldMetadata?.databaseFieldName;
        const limit = action.payload?.maxRecords ?? 1000;

        let query = api
            .select(`${dbPrimaryKeyFields.join(',')}${dbDisplayField ? `,${dbDisplayField}` : ''}`)
            .limit(limit);

        const {data, error, count} = yield query; // TODO: NOT GETTING A TOTAL COUNT!
        if (error) throw error;


        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        entityLogger.log('debug', 'Final result', frontendResponse);

        const quickReferenceRecords = frontendResponse.map(record => {
            const primaryKeyValues = primaryKeyMetadata.fields.reduce((acc, field) => {
                acc[field] = record[field];
                return acc;
            }, {} as Record<string, MatrxRecordId>);

            const displayFieldName = displayFieldMetadata.fieldName;

            if (!(displayFieldName in record)) {
                throw new Error(`Display field '${displayFieldName}' is missing from record data.`);
            }
            const displayValue = record[displayFieldName];
            const recordKey = createRecordKey(primaryKeyMetadata, primaryKeyValues);

            return {
                primaryKeyValues,
                displayValue,
                recordKey,
            };
        });

        yield put(actions.fetchQuickReferenceSuccess(quickReferenceRecords));
    } catch (error: any) {
        entityLogger.log('error', 'Error in fetchQuickReference', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during quick reference fetch.",
            code: error.code,
        }));
        throw error;
    }
}


function* handleExecuteCustomQuery<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        tableName,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity> & {
        action: PayloadAction<QueryOptions<TEntity>>
    }) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleExecuteCustomQuery', entityKey);

    try {
        entityLogger.log('debug', 'Starting', action.payload);

        let query = api.select(unifiedDatabaseObject.columns?.join(',') || '*');

        if (unifiedDatabaseObject.filters) {
            Object.entries(unifiedDatabaseObject.filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        if (unifiedDatabaseObject.sorts) {
            unifiedDatabaseObject.sorts.forEach(sort => {
                query = query.order(sort.column, {ascending: sort.ascending});
            });
        }

        if (unifiedDatabaseObject.limit) {
            query = query.limit(unifiedDatabaseObject.limit);
        }

        if (unifiedDatabaseObject.offset) {
            query = query.range(unifiedDatabaseObject.offset, unifiedDatabaseObject.offset + (unifiedDatabaseObject.limit || 10) - 1);
        }

        const {data, error} = yield query;
        if (error) throw error;

        entityLogger.log('debug', 'Database response', {data});

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        entityLogger.log('debug', 'Final result', frontendResponse);

        yield put(actions.executeCustomQuerySuccess(frontendResponse));

    } catch (error: any) {
        yield put(actions.setError({
            message: error.message || "An error occurred during custom query execution.",
            code: error.code,
        }));
        throw error;
    }
}


function* handleDelete<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        tableName,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity> & {}
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleDelete', entityKey);

    try {
        entityLogger.log('debug', 'Starting delete operation', unifiedDatabaseObject);

        let query = api.delete();

        // Apply primary key conditions using primaryKeysAndValues from unifiedDatabaseObject
        const primaryKeyValues = unifiedDatabaseObject.primaryKeysAndValues;
        if (primaryKeyValues) {
            Object.entries(primaryKeyValues).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        } else {
            throw new Error("Primary key values are missing in unifiedDatabaseObject.");
        }

        const {error} = yield query;
        if (error) throw error;

        entityLogger.log('debug', 'Database response', {success: true});

        const recordKeys = unifiedDatabaseObject.recordKeys;

        yield put(actions.removeRecords(recordKeys));

        entityLogger.log('debug', 'Final result', {removed: primaryKeyValues});

        for (const recordKey of recordKeys) {
            yield put(actions.deleteRecordSuccess({matrxRecordId: recordKey}));
        }

        yield put(actions.fetchQuickReference({maxRecords: 1000}));

    } catch (error: any) {
        entityLogger.log('error', 'Delete operation error', error);

        yield put(actions.setError({
            message: error.message || "An error occurred during delete.",
            code: error.code,
        }));
        throw error;
    }
}

function* handleBatchOperation<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity> & {
        action: PayloadAction<BatchOperationPayload<TEntity>>
    }) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleBatchOperation', entityKey);

    try {
        const {operation, records, primaryKeyMetadata, options} = action.payload;
        const batchSize = options?.batchSize || 100;
        const results: EntityData<TEntity>[] = [];

        entityLogger.log('debug', 'Starting', {operation, batchSize, records});

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            let result;

            switch (operation) {
                case 'create':
                    const {data: insertData, error: insertError} = yield api
                        .insert(batch)
                        .select();
                    if (insertError) throw insertError;
                    if (insertData) results.push(...insertData);
                    break;

                case 'update':
                    for (const record of batch) {
                        let updateQuery = api.update(record);
                        primaryKeyMetadata.fields.forEach(field => {
                            updateQuery = updateQuery.eq(field, record[field]);
                        });
                        const {data: updateData, error: updateError} = yield updateQuery.select().single();
                        if (updateError) throw updateError;
                        if (updateData) results.push(updateData);
                    }
                    break;

                case 'delete':
                    for (const record of batch) {
                        let deleteQuery = api.delete();
                        primaryKeyMetadata.fields.forEach(field => {
                            deleteQuery = deleteQuery.eq(field, record[field]);
                        });
                        const {error: deleteError} = yield deleteQuery;
                        if (deleteError) throw deleteError;
                    }
                    break;
            }

            if (options?.onProgress) {
                options.onProgress(((i + batch.length) / records.length) * 100);
            }
        }

        entityLogger.log('debug', 'Database response', {results});

        const payload = {entityName: entityKey, data: results};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        entityLogger.log('debug', 'Final result', frontendResponse);

        switch (operation) {
            case 'create':
            case 'update':
                yield put(actions.upsertRecords(frontendResponse));
                break;
            case 'delete':
                // @ts-ignore
                yield put(actions.removeRecords(records as Draft<EntityData<TEntity>>[]));
                break;
        }

    } catch (error: any) {
        yield put(actions.setError({
            message: error.message || "An error occurred during batch operation.",
            code: error.code,
        }));
        throw error;
    }
}


function* handleSubscriptionEvents<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: any;
        old: any;
    },
    unifiedDatabaseObject
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleSubscriptionEvents', entityKey);

    try {
        entityLogger.log('debug', 'Handling subscription event', payload);

        const conversionPayload = {
            entityName: entityKey,
            data: payload.new || payload.old
        };
        const frontendData = yield select(selectFrontendConversion, conversionPayload);

        switch (payload.eventType) {
            case 'INSERT':
                yield put(actions.upsertRecords([frontendData]));
                break;
            case 'UPDATE':
                yield put(actions.upsertRecords([frontendData]));
                break;
            case 'DELETE':
                yield put(actions.removeRecords([frontendData]));
                break;
        }

        yield* handleQuickReferenceUpdate(entityKey, actions, frontendData, unifiedDatabaseObject);

    } catch (error: any) {
        entityLogger.log('error', 'Subscription event handling error', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during subscription handling.",
            code: error.code,
            details: error
        }));
    }
}

function* handleQuickReferenceUpdate<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    record: EntityData<TEntity>,
    unifiedDatabaseObject?: UnifiedDatabaseObject
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleQuickReferenceUpdate', entityKey);

    entityLogger.log('debug', 'Starting', record);

    const {primaryKeyMetadata, displayFieldMetadata} = yield select(selectEntityMetadata, entityKey);

    const displayFieldName = unifiedDatabaseObject.frontendDisplayField
    const primaryKeyValues = primaryKeyMetadata.fields.reduce((acc, field) => {
        acc[field] = record[field];
        return acc;
    }, {} as Record<string, MatrxRecordId>);

    const recordKey = createRecordKey(primaryKeyMetadata, primaryKeyValues);

    const quickReferenceRecord = {
        primaryKeyValues,
        displayValue: record[displayFieldName],
        recordKey
    }

    entityLogger.log('debug', 'Final result', quickReferenceRecord);

    yield put(actions.addQuickReferenceRecords([quickReferenceRecord]));
}

function* handleRefreshData<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<void>,
    tableName: string,
    unifiedDatabaseObject?: UnifiedDatabaseObject
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleRefreshData', entityKey);

    try {
        entityLogger.log('debug', 'Starting data refresh', action.payload);

        const currentState = yield select(state => state.entities[entityKey]);
        const {page, pageSize} = currentState.pagination;

        // Create a new action for fetch paginated
        const fetchAction = createPayloadAction(actions.fetchRecords.type, {
            page,
            pageSize
        });

        // Use put instead of call for saga actions
        yield put(actions.fetchRecords({page, pageSize}));

        // Refresh quick reference if needed
        yield put(actions.fetchQuickReference({maxRecords: 1000}));

        yield put(actions.setFlags({needsRefresh: false}));
        entityLogger.log('debug', 'Data refresh completed');

    } catch (error: any) {
        entityLogger.log('error', 'Refresh data error', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during refresh.",
            code: error.code,
            details: error
        }));
    }
}

function* handleCacheInvalidation<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    unifiedDatabaseObject?: UnifiedDatabaseObject
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleCacheInvalidation', entityKey);

    try {
        entityLogger.log('debug', 'Checking cache invalidation');

        const currentState = yield select(state => state.entities[entityKey]);
        const now = new Date().getTime();
        const cacheKey = currentState.entityMetadata.primaryKeyMetadata.database_fields.join('::');
        const lastFetched = new Date(currentState.cache.lastFetched[cacheKey] || 0).getTime();

        if (now - lastFetched > currentState.cache.staleTime) {
            entityLogger.log('debug', 'Cache invalidated', {
                lastFetched: new Date(lastFetched).toISOString(),
                staleTime: currentState.cache.staleTime
            });

            yield put(actions.invalidateCache());
            yield put(actions.refreshData());
        }
    } catch (error: any) {
        entityLogger.log('error', 'Cache invalidation error', error);
    }
}

function* handleHistoryUpdate<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    operation: 'create' | 'update' | 'delete' | 'bulk',
    newData: EntityData<TEntity> | EntityData<TEntity>[],
    previousData?: EntityData<TEntity> | EntityData<TEntity>[],
    metadata?: {
        user?: string;
        reason?: string;
        batchId?: string;
    },
    unifiedDatabaseObject?: UnifiedDatabaseObject
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleHistoryUpdate', entityKey);

    try {
        entityLogger.log('debug', 'Updating history', {operation, metadata});

        const historyEntry: Draft<HistoryEntry<TEntity>> = {
            timestamp: new Date().toISOString(),
            operation,
            data: newData as Draft<EntityData<TEntity>> | Draft<EntityData<TEntity>>[],
            previousData: previousData as Draft<EntityData<TEntity>> | Draft<EntityData<TEntity>>[],
            metadata: {
                ...metadata,
                user: metadata?.user || 'system'
            }
        };

        yield put(actions.pushToHistory(historyEntry));
        entityLogger.log('debug', 'History updated successfully');

    } catch (error: any) {
        entityLogger.log('error', 'History update error', error);
    }
}


function* handleFilterChange<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<FilterPayload>,
    unifiedDatabaseObject?: UnifiedDatabaseObject
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleFilterChange', entityKey);

    try {
        entityLogger.log('debug', 'Handling filter change', action.payload);

        yield delay(DEBOUNCE_MS);

        const currentState = yield select(state => state.entities[entityKey]);
        yield put(actions.setPage(1));

        let query = api.select("*", {count: "exact"});

        // Apply filters
        if (action.payload.conditions.length > 0) {
            action.payload.conditions.forEach(condition => {
                if (condition.operator === 'eq') {
                    query = query.eq(condition.field, condition.value);
                }
                // Add other operators as needed
            });
        }

        const {data, error, count} = yield query;
        if (error) throw error;

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.fetchRecordsSuccess({
            data: frontendResponse,
            page: 1,
            pageSize: currentState.pagination.pageSize,
            totalCount: count || 0
        }));

        entityLogger.log('debug', 'Filter change applied successfully');

    } catch (error: any) {
        entityLogger.log('error', 'Filter change error', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during filter update.",
            code: error.code,
            details: error
        }));
    }
}


function* handleFetchPaginated<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        unifiedDatabaseObject,
    }: BaseSagaContext<TEntity> & {
        action: PayloadAction<{ page: number; pageSize: number; options?: QueryOptions<TEntity>; maxCount?: number }>
    }) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleFetchPaginated', entityKey);

    try {
        entityLogger.log('debug', 'Starting fetchPaginated', action.payload);

        const from = (action.payload.page - 1) * action.payload.pageSize;
        const to = action.payload.page * action.payload.pageSize - 1;

        entityLogger.log('debug', 'Executing query', {from, to});

        const {data, error, count} = yield api
            .select("*", {count: "exact"})
            .range(from, to);

        if (error) {
            entityLogger.log('error', 'Query error', error);
            throw error;
        }

        entityLogger.log('debug', 'Query successful', {dataCount: data?.length, totalCount: count});

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        yield put(actions.fetchRecordsSuccess({
            data: frontendResponse,
            page: action.payload.page,
            pageSize: action.payload.pageSize,
            totalCount: count || 0
        }));

    } catch (error: any) {
        entityLogger.log('error', 'Error in fetchPaginated', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during fetch paginated.",
            code: error.code,
            details: error
        }));
        throw error;
    }
}

function createPayloadAction<T>(type: string, payload: T): PayloadAction<T> {
    return {type, payload};
}

function* handleCreate<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        unifiedDatabaseObject,
    }: BaseSagaContext<TEntity> & {
        action: PayloadAction<EntityData<TEntity>>
    }) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleCreate', entityKey);

    const dataForInsert = unifiedDatabaseObject.data
    entityLogger.log('debug', 'Data for insert:', dataForInsert);

    try {

        const {data, error} = yield api
            .insert(dataForInsert)
            .select()
            .single();

        if (error) throw error;

        entityLogger.log('info', 'Database response', {data});

        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);

        console.log("--tempRecordId--", unifiedDatabaseObject.tempRecordId);

        const successPayload = {
            tempRecordId: unifiedDatabaseObject.tempRecordId,
            data: frontendResponse
        };

        console.log("successPayload", successPayload);
        entityLogger.log('info', '-- Dispatching createRecordSuccess', successPayload);

        yield put(actions.createRecordSuccess(successPayload));


        entityLogger.log('info', 'Pushing to history', frontendResponse);

        yield put(actions.pushToHistory({
            timestamp: new Date().toISOString(),
            operation: 'create',
            data: frontendResponse
        }));

        entityLogger.log('info', 'Invalidating cache');

        yield put(actions.invalidateCache());

        entityLogger.log('info', 'Handling quick reference update');

        yield* handleQuickReferenceUpdate(entityKey, actions, frontendResponse, unifiedDatabaseObject);

        entityLogger.log('info', 'Final result', frontendResponse);

    } catch (error: any) {
        entityLogger.log('error', 'Create operation error', error);
        yield put(actions.setError({
            message: error.message || "An error occurred during create.",
            code: error.code,
        }));
        throw error;
    }
}

function* handleUpdate<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        unifiedDatabaseObject,
    }: BaseSagaContext<TEntity> & {}) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleUpdate', entityKey);
    entityLogger.log('info', 'Starting update operation', action.payload);


    let previousData: Record<string, any> | undefined;
    let recordKey: string;

    try {
        recordKey = unifiedDatabaseObject.recordKeys[0];
        const entitySelectors = createEntitySelectors(entityKey);

        const changeComparison = yield select(state =>
            entitySelectors.selectChangeComparisonById(state, recordKey)
        );

        previousData = changeComparison.originalRecord;
        const allUpdatedData = changeComparison.unsavedRecord;

        if (previousData) {
            const optimisticData = {...previousData, ...allUpdatedData};
            entityLogger.log('info', 'Optimistic update', optimisticData);

            yield put(actions.upsertRecords([
                {recordKey, record: optimisticData}
            ]));
        }

        const convertedChangedData = yield select(selectDatabaseConversion, {
            entityName: entityKey,
            data: changeComparison.changedFieldData
        });

        const primaryKeyFields = unifiedDatabaseObject.databasePks;

        entityLogger.log('info', 'Converted data for update:', convertedChangedData);


        const primaryKeyValues = primaryKeyFields.reduce((acc, key) => {
            if (previousData[key] !== undefined) {
                acc[key] = previousData[key];
            }
            return acc;
        }, {});

        entityLogger.log('info', 'Primary key values:', primaryKeyValues);


        let query = api.update(convertedChangedData);
        Object.entries(primaryKeyValues).forEach(([key, value]) => {
            query = query.eq(key, value);
        });

        entityLogger.log('info', 'DB Query:', query);
        const {data, error} = yield query.select().single();

        entityLogger.log('info', 'Database response', {error, data});

        if (error) throw error;


        const payload = {entityName: entityKey, data};
        const frontendResponse = yield select(selectFrontendConversion, payload);


        entityLogger.log('debug', 'Frontend response', frontendResponse);

        yield put(actions.updateRecordSuccess(frontendResponse));

        // Update history
        yield put(actions.pushToHistory({
            timestamp: new Date().toISOString(),
            operation: 'update',
            data: frontendResponse,
            previousData
        }));

        // Invalidate cache
        yield put(actions.invalidateCache());


        yield* handleUpdateQuickReference(entityKey, actions, frontendResponse, unifiedDatabaseObject);

        entityLogger.log('debug', 'Final result', frontendResponse);

    } catch (error: any) {
        entityLogger.log('error', 'Update operation error', error);

        if (previousData) {
            entityLogger.log('debug', 'Reverting optimistic update');
            yield put(actions.upsertRecords([
                {recordKey, record: previousData}
            ]));
        }

        yield put(actions.setError(createStructuredError({
            error,
            location: 'handleUpdate Saga',
            action,
            entityKey,
        })));
        throw error;
    }
}


function* handleUpdateQuickReference<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    record: EntityData<TEntity>,
    unifiedDatabaseObject?: UnifiedDatabaseObject
) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleQuickReferenceUpdate', entityKey);

    entityLogger.log('debug', 'Starting Quick Reference Update', {record, unifiedDatabaseObject});

    const quickReferenceRecord = {
        primaryKeyValues: unifiedDatabaseObject?.primaryKeysAndValues,
        displayValue: record[unifiedDatabaseObject?.frontendDisplayField],
        recordKey: unifiedDatabaseObject?.recordKeys[0]
    };

    entityLogger.log('debug', 'Prepared Quick Reference Record', quickReferenceRecord);

    // Dispatch to addQuickReferenceRecords with the properly structured record
    yield put(actions.addQuickReferenceRecords([quickReferenceRecord]));
}


function* handleFetchMetrics<TEntity extends EntityKeys>(
    {
        entityKey,
        actions,
        api,
        action,
        unifiedDatabaseObject
    }: BaseSagaContext<TEntity> & { action: PayloadAction<void> }) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleFetchMetrics', entityKey);

    try {
        entityLogger.log('debug', 'Fetching entity metrics');

        // Fetch operation counts
        const operationCounts = yield all({
            creates: api.select('count(*)', {head: true})
                .eq('operation_type', 'create'),
            updates: api.select('count(*)', {head: true})
                .eq('operation_type', 'update'),
            deletes: api.select('count(*)', {head: true})
                .eq('operation_type', 'delete'),
        });

        // Fetch performance metrics
        const performanceMetrics = yield call(async () => {
            const response = await api.rpc('get_entity_performance_metrics', {
                entity_name: entityKey
            });
            return response.data;
        });

        // Fetch cache statistics
        const cacheStats = yield call(async () => {
            const response = await api.rpc('get_entity_cache_stats', {
                entity_name: entityKey
            });
            return response.data;
        });

        // Fetch error rates
        const errorRates = yield call(async () => {
            const response = await api.rpc('get_entity_error_rates', {
                entity_name: entityKey,
                time_range: '24h'
            });
            return response.data;
        });

        yield put(actions.setMetrics({
            operationCounts,
            performanceMetrics,
            cacheStats,
            errorRates,
            lastUpdated: new Date().toISOString()
        }));

        entityLogger.log('debug', 'Final result', {operationCounts, performanceMetrics, cacheStats, errorRates});

    } catch (error: any) {
        entityLogger.log('error', 'Error fetching metrics', error);
        yield put(actions.setError({
            message: error.message || "An error occurred while fetching metrics.",
            code: error.code,
        }));
        throw error;
    }
}


export {
    handleFetchOne,
    handleFetchPaginated,
    handleCreate,
    handleUpdate,
    handleFetchAll,
    handleFetchQuickReference,
    handleDelete,
    handleBatchOperation,
    handleExecuteCustomQuery,
    handleSubscriptionEvents,
    handleRefreshData,
    handleFilterChange,
    handleHistoryUpdate,
    handleCacheInvalidation,
    handleFetchMetrics,
    handleFetchOneAdvanced,
    handleGetOrFetchSelectedRecords,
    handleFetchSelectedRecords,
};


/*// Socket ==========================================================

function* handleCreateFromSocket<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'],
    data: EntityData<TEntity>
) {
    try {
        // Save data into the database
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        const api = yield call(initializeDatabaseApi, tableName);

        const { error } = yield api.insert(data);
        if (error) throw error;

        // Update state
        yield put(actions.upsertRecords([data]));

        sagaLogger.log('debug', `Handled create from socket for ${entityKey}`, data);
    } catch (error: any) {
        sagaLogger.log('error', `Error handling socket create: ${error.message}`, entityKey, error);
    }
}

function* handleUpdateFromSocket<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'],
    data: EntityData<TEntity>
) {
    try {
        // Save data into the database
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        const api = yield call(initializeDatabaseApi, tableName);

        const primaryKeyValues = getPrimaryKeyValues(entityKey, data); // Implement this function based on your schema

        let query = api.update(data);
        Object.entries(primaryKeyValues).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        const { error } = yield query;
        if (error) throw error;

        // Update state
        yield put(actions.upsertRecords([data]));

        sagaLogger.log('debug', `Handled update from socket for ${entityKey}`, data);
    } catch (error: any) {
        sagaLogger.log('error', `Error handling socket update: ${error.message}`, entityKey, error);
    }
}

function* handleDeleteFromSocket<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'],
    data: EntityData<TEntity>
) {
    try {
        // Delete data from the database
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);
        const api = yield call(initializeDatabaseApi, tableName);

        const primaryKeyValues = getPrimaryKeyValues(entityKey, data); // Implement this function

        let query = api.delete();
        Object.entries(primaryKeyValues).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        const { error } = yield query;
        if (error) throw error;

        // Update state
        yield put(actions.deleteRecordSuccess(primaryKeyValues));

        sagaLogger.log('debug', `Handled delete from socket for ${entityKey}`, data);
    } catch (error: any) {
        sagaLogger.log('error', `Error handling socket delete: ${error.message}`, entityKey, error);
    }
}

*/


// =========== Socket Samples ================
/*
function* handleCreate<TEntity extends EntityKeys>(
    // ... existing parameters ...
) {
    try {
        // ... existing code ...

        // Emit socket event to notify backend and other clients
        const socketManager = SocketManager.getInstance();
        socketManager.emit(`entity/${entityKey}/created`, frontendResponse);

        // ... existing code ...
    } catch (error: any) {
        // ... existing error handling ...
    }
}

function* handleUpdate<TEntity extends EntityKeys>(
    // ... existing parameters ...
) {
    try {
        // ... existing code ...

        // Emit socket event to notify backend and other clients
        const socketManager = SocketManager.getInstance();
        socketManager.emit(`entity/${entityKey}/updated`, frontendResponse);

        // ... existing code ...
    } catch (error: any) {
        // ... existing error handling ...
    }
}

function* handleDelete<TEntity extends EntityKeys>(
    // ... existing parameters ...
) {
    try {
        // ... existing code ...

        // Emit socket event to notify backend and other clients
        const socketManager = SocketManager.getInstance();
        socketManager.emit(`entity/${entityKey}/deleted`, action.payload.primaryKeyValues);

        // ... existing code ...
    } catch (error: any) {
        // ... existing error handling ...
    }
}*/


/*function* handleSubscription<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"]
) {
    try {
        const subscriptionConfig = yield select(selectEntitySubscriptionConfig, entityKey);
        const tableName: string = yield select(selectEntityDatabaseName, entityKey);

        if (subscriptionConfig.enabled) {
            const channel = supabase
                .channel(`${tableName}_changes`)
                .on('postgres_changes',
                    {event: '*', schema: 'public', table: tableName},
                    (payload) => handleSubscriptionEvents(entityKey, actions, payload)
                )
                .subscribe();

            // Store subscription reference if needed
            yield put(actions.setSubscription({channel}));
        }
    } catch (error: any) {
        console.error(`Subscription Error (${entityKey}):`, error);
    }
}
*/

//================================================================
