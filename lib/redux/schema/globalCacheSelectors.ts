// lib/redux/selectors/globalCacheSelectors.ts
import {RootState} from "@/lib/redux/store";
import {createSelector} from "@reduxjs/toolkit";
import {
    EntityFieldKeys,
    EntityKeys,
    EntityPrettyFields,
    EntitySelectOption,
    PrettyEntityName
} from "@/types/entityTypes";
import {SchemaEntity, SchemaField} from "@/types/schema";
import {NameFormat} from "@/types/AutomationSchemaTypes";

import { GlobalCacheState } from "./globalCacheSlice";
import {QueryOptions} from "@/lib/redux/entity/sagas";




// ----------------
// BATCH 1: Direct State Access Selectors
// ----------------

// Base selector for the entire global cache slice
const selectGlobalCache = (state: RootState): GlobalCacheState => state.globalCache;

// Basic state access selectors
export const selectSchema = createSelector(
    [selectGlobalCache],
    cache => cache.schema
);

export const selectEntityNames = createSelector(
    [selectGlobalCache],
    cache => cache.entityNames
);

export const selectEntities = createSelector(
    [selectGlobalCache],
    cache => cache.entities
);

export const selectFields = createSelector(
    [selectGlobalCache],
    cache => cache.fields
);

export const selectFieldsByEntity = createSelector(
    [selectGlobalCache],
    cache => cache.fieldsByEntity
);

export const selectIsInitialized = createSelector(
    [selectGlobalCache],
    cache => cache.isInitialized
);

// Direct conversion map selectors
export const selectEntityNameToCanonical = createSelector(
    [selectGlobalCache],
    cache => cache.entityNameToCanonical
);

export const selectFieldNameToCanonical = createSelector(
    [selectGlobalCache],
    cache => cache.fieldNameToCanonical
);

export const selectEntityNameFormats = createSelector(
    [selectGlobalCache],
    cache => cache.entityNameFormats
);

export const selectFieldNameFormats = createSelector(
    [selectGlobalCache],
    cache => cache.fieldNameFormats
);

export const selectEntityNameToDatabase = createSelector(
    [selectGlobalCache],
    cache => cache.entityNameToDatabase
);

export const selectEntityNameToBackend = createSelector(
    [selectGlobalCache],
    cache => cache.entityNameToBackend
);

export const selectFieldNameToDatabase = createSelector(
    [selectGlobalCache],
    cache => cache.fieldNameToDatabase
);

export const selectFieldNameToBackend = createSelector(
    [selectGlobalCache],
    cache => cache.fieldNameToBackend
);

// ----------------
// BATCH 2: Core Derived Selectors
// ----------------

// Entity-specific selectors
export const selectEntity = createSelector(
    [selectEntities, (_: RootState, entityName: EntityKeys) => entityName],
    (entities, entityName): SchemaEntity | undefined => entities[entityName]
);

// Field selectors
export const selectEntityFields = createSelector(
    [selectFields, selectFieldsByEntity, (_: RootState, entityName: EntityKeys) => entityName],
    (fields, fieldsByEntity, entityName): SchemaField[] => {
        const fieldIds = fieldsByEntity[entityName] || [];
        if (fieldIds.length === 0) return [];
        const result = fieldIds.map(id => fields[id]).filter(Boolean);
        return result;
    }
);

export const selectField = createSelector(
    [
        selectFields,
        (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params
    ],
    (fields, params): SchemaField | undefined => {
        const fieldId = `${params.entityName}__${params.fieldName}`;
        return fields[fieldId];
    }
);


// Primary key and display field selectors
export const selectEntityPrimaryKeyField = createSelector(
    [selectEntityFields],
    (fields): string | undefined => {
        const primaryKeyField = fields.find(field => field.isPrimaryKey);
        return primaryKeyField ? primaryKeyField.fieldName : undefined;
    }
);

// get the display field, if there is one
export const selectEntityDisplayField = createSelector(
    [selectEntityFields],
    (fields): string | undefined => {
        const displayField = fields.find(field => field.isDisplayField);
        return displayField ? displayField.fieldName : undefined;
    }
);




export const selectEntityFieldNameToDatabaseMap = createSelector(
    [selectFieldNameToDatabase, (_: RootState, entityName: EntityKeys) => entityName],
    (fieldNameToDatabase, entityName) => fieldNameToDatabase[entityName] || {}
);



// Relationship selectors
export const selectEntityRelationships = createSelector(
    [selectEntity],
    (entity) => entity?.relationships || []
);

export const selectRelatedEntities = createSelector(
    [selectEntityRelationships, selectEntityNames],
    (relationships, entityNames) =>
        relationships.map(rel => ({
            ...rel,
            relatedEntity: entityNames.find(name => name === rel.relatedTable)
        }))
);




export const selectEntityDatabaseName = createSelector(
    [selectEntityNameToDatabase, (_: RootState, entityName: EntityKeys) => entityName],
    (entityToDatabase, entityName): string => entityToDatabase[entityName] || entityName
);

export const selectEntityBackendName = createSelector(
    [selectEntityNameToBackend, (_: RootState, entityName: EntityKeys) => entityName],
    (entityToBackend, entityName): string => entityToBackend[entityName] || entityName
);

// This converts FROM any format TO canonical
export const selectEntityCanonicalName = createSelector(
    [selectEntityNameToCanonical, (_: RootState, entityName: string) => entityName],
    (toCanonicalMap, entityName): EntityKeys => toCanonicalMap[entityName] || entityName as EntityKeys
);

export const selectEntityFrontendName = selectEntityCanonicalName;

// Returns the name of the table in a Pretty Format for display
export const selectEntityPrettyName = createSelector(
    [selectEntityNameFormats, (_: RootState, entityName: EntityKeys) => entityName],
    (entityNameFormats, entityName) => entityNameFormats[entityName]?.['pretty'] as PrettyEntityName<EntityKeys>
);

export const selectFormattedEntityOptions = createSelector(
    [(state: RootState) => state, selectEntityNames],
    (state, entityNames): EntitySelectOption<EntityKeys>[] => {
        return entityNames.map((entityName) => ({
            value: entityName,
            label: selectEntityPrettyName(state, entityName)
        }));
    }
);


export const selectEntityAnyName = createSelector(
    [selectEntityNameFormats, (_: RootState, params: { entityName: EntityKeys; format: NameFormat }) => params],
    (entityNameFormats, {entityName, format}) => entityNameFormats[entityName]?.[format] || entityName
);

// FIELD NAME CONVERSION SELECTORS
export const selectFieldDatabaseName = createSelector(
    [
        selectFieldNameToDatabase,
        (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params
    ],
    (fieldToDatabase, {entityName, fieldName}): string =>
        fieldToDatabase[entityName]?.[fieldName] || fieldName
);

export const selectFieldBackendName = createSelector(
    [
        selectFieldNameToBackend,
        (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params
    ],
    (fieldToBackend, {entityName, fieldName}): string =>
        fieldToBackend[entityName]?.[fieldName] || fieldName
);

// This converts FROM any format TO canonical
export const selectFieldFrontendName = createSelector(
    [
        selectFieldNameToCanonical,
        (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params
    ],
    (toCanonicalMap, {entityName, fieldName}): string =>
        toCanonicalMap[entityName]?.[fieldName] || fieldName
);

// Returns the nae of the field in a Pretty Format for display, such as a column header
export const selectFieldPrettyName = createSelector(
    [
        selectFieldNameFormats,
        (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params
    ],
    (fieldFormats, {entityName, fieldName}) =>
        fieldFormats[entityName]?.[fieldName]?.['pretty'] || fieldName
);

export const selectAllFieldPrettyNames = createSelector(
    [
        selectFieldNameFormats,
        (_: RootState, params: { entityName: EntityKeys }) => params,
    ],
    (fieldFormats, { entityName }) => {

        const entityFields = fieldFormats[entityName];
        if (!entityFields) {
            return {};
        }

        const prettyNames: Record<string, string> = {};
        Object.keys(entityFields).forEach((fieldName) => {
            const prettyName = entityFields[fieldName]?.['pretty'] || fieldName;
            prettyNames[fieldName] = prettyName;
        });

        return prettyNames;
    }
);


export const selectFieldAnyName = createSelector(
    [
        selectFieldNameFormats,
        (_: RootState, params: { entityName: EntityKeys; fieldName: string; format: NameFormat }) => params
    ],
    (fieldFormats, {entityName, fieldName, format}) =>
        fieldFormats[entityName]?.[fieldName]?.[format] || fieldName
);


// SCHEMA SELECTORS
export const selectEntitySchema = createSelector(
    [
        selectEntities,
        (_: RootState, payload: { entityName: EntityKeys }) => payload
    ],
    (entities, { entityName }) => entities[entityName]
);

export const selectFieldSchema = createSelector(
    [
        selectEntitySchema,
        (_: RootState, payload: { entityName: EntityKeys; fieldName: EntityFieldKeys<EntityKeys> }) => payload
    ],
    (entitySchema, { fieldName }) => entitySchema?.entityFields?.[fieldName]
);



export type KeyMapping = { [oldKey: string]: string };

interface FormatConversionPayload<T extends Record<string, any>> {
    entityName: EntityKeys;
    data: T | T[];
    format: NameFormat;
}

interface UnknownFormatPayload<T extends Record<string, any>> {
    entityNameOrAlias: string;
    data: T | T[];
    targetFormat: NameFormat;
}

interface UnknownFieldFormatPayload {
    entityNameOrAlias: string;
    fieldNameOrAlias: string;
    targetFormat: NameFormat;
}

// Existing selector with console logs added
export const selectReplaceKeysInObject = createSelector(
    [
        (_: RootState, data: Record<string, any> | Record<string, any>[] | string) => data,
        (_: RootState, _data: any, keyMapping: KeyMapping) => keyMapping
    ],
    (data, keyMapping) => {
        // console.log("Received data:", data);
        // console.log("Received keyMapping:", keyMapping);

        if (typeof data === 'string') {
            // console.log("Data is a string, performing direct key mapping.");
            return keyMapping?.[data] || data;
        }

        const replaceKeys = (obj: Record<string, any>): Record<string, any> => {
            // console.log("Replacing keys in object:", obj);
            const keys = Object.keys(obj);
            // Return same object if no keys need mapping
            if (keys.every(key => !keyMapping?.[key])) return obj;

            return keys.reduce((acc, key) => {
                const newKey = keyMapping?.[key] || key;
                // console.log(`Mapping key '${key}' to '${newKey}'`);
                acc[newKey] = obj[key];
                return acc;
            }, {});
        };

        if (Array.isArray(data)) {
            // console.log("Data is an array, processing each element.");
            // Return same array if no changes needed
            const processedData = data.map(replaceKeys);
            return processedData.every((item, index) => item === data[index]) ? data : processedData;
        }

        // console.log("Data is a single object, replacing keys.");
        return replaceKeys(data);
    }
);

// Safer version of selectReplaceKeysInObject
export const safeSelectReplaceKeysInObjectWithErrorControl = createSelector(
    [
        (_: RootState, data: Record<string, any> | Record<string, any>[] | string) => data,
        (_: RootState, _data: any, keyMapping: KeyMapping) => keyMapping || {}  // Default to empty object if keyMapping is undefined
    ],
    (data, keyMapping) => {
        // console.log("Received data:", data);
        // console.log("Received keyMapping:", keyMapping);

        if (typeof data === 'string') {
            // console.log("Data is a string, performing direct key mapping.");
            return keyMapping[data] || data;  // Safe access
        }

        const replaceKeys = (obj: Record<string, any> = {}): Record<string, any> => {
            // console.log("Replacing keys in object:", obj);
            const keys = Object.keys(obj);
            // Return same object if no keys need mapping
            if (keys.every(key => !keyMapping[key])) return obj;

            return keys.reduce((acc, key) => {
                const newKey = keyMapping[key] || key;
                // console.log(`Mapping key '${key}' to '${newKey}'`);
                acc[newKey] = obj[key];
                return acc;
            }, {});
        };

        if (Array.isArray(data)) {
            // console.log("Data is an array, processing each element.");
            // Return same array if no changes needed
            const processedData = data.map(replaceKeys);
            return processedData.every((item, index) => item === data[index]) ? data : processedData;
        }

        // console.log("Data is a single object, replacing keys.");
        return replaceKeys(data as Record<string, any>);
    }
);

export const selectConvertDataFormat = createSelector(
    [
        (_: RootState, data: Record<string, any> | Record<string, any>[] | string) => data,
        (_: RootState, _data: any, entityNameMapping: KeyMapping) => entityNameMapping,
        (_: RootState, _data: any, _entityNameMapping: any, fieldNameMapping: KeyMapping) => fieldNameMapping
    ],
    (data, entityNameMapping, fieldNameMapping) => {
        // If data is a string, process it through both mappings in sequence
        if (typeof data === 'string') {
            const entityConverted = entityNameMapping[data] || data;
            return fieldNameMapping[entityConverted] || entityConverted;
        }

        const entityConverted = selectReplaceKeysInObject(
            {} as RootState,
            data,
            entityNameMapping
        );

        return selectReplaceKeysInObject(
            {} as RootState,
            entityConverted,
            fieldNameMapping
        );
    }
);

// Then update the conversion selectors to use the memoized version
export const selectDatabaseConversion = createSelector(
    [
        selectEntityNameToDatabase,
        selectFieldNameToDatabase,
        (_: RootState, payload: { entityName: EntityKeys; data: any }) => payload
    ],
    (entityMap, fieldMap, {entityName, data}) =>
        selectConvertDataFormat({} as RootState, data, entityMap, fieldMap[entityName] || {})
);

export const selectBackendConversion = createSelector(
    [
        selectEntityNameToBackend,
        selectFieldNameToBackend,
        (_: RootState, payload: { entityName: EntityKeys; data: any }) => payload
    ],
    (entityMap, fieldMap, {entityName, data}) =>
        selectConvertDataFormat({} as RootState, data, entityMap, fieldMap[entityName] || {})
);


// Mapping selectors - these are basic and don't need to change
export const selectPrettyEntityMapping = createSelector(
    [
        selectEntityNameFormats
    ],
    (entityNameFormats) =>
        Object.entries(entityNameFormats).reduce((acc, [entity, formats]) => {
            acc[entity] = formats['pretty'] || entity;
            return acc;
        }, {} as Record<string, string>)
);

export const selectPrettyFieldMapping = createSelector(
    [
        selectFieldNameFormats,
        (_: RootState, entityName: EntityKeys) => entityName
    ],
    (fieldFormats, entityName) =>
        Object.entries(fieldFormats[entityName] || {}).reduce(
            (acc, [field, formats]) => {
                acc[field] = formats['pretty'] || field;
                return acc;
            },
            {} as Record<string, string>
        )
);


// Main conversion selectors
export const selectPrettyConversion = createSelector(
    [
        (_: RootState, payload: { entityName: EntityKeys; data: any }) => payload.data,
        selectPrettyEntityMapping,
        (state: RootState, payload: { entityName: EntityKeys; data: any }) =>
            selectPrettyFieldMapping(state, payload.entityName)
    ],
    (data, entityMap, fieldMap) => selectReplaceKeysInObject(
        {} as RootState,
        selectReplaceKeysInObject({} as RootState, data, entityMap),
        fieldMap
    )
);

// =========================
// Mapping selectors - these are basic and don't need to change
export const selectAnyEntityMapping = createSelector(
    [
        selectEntityNameFormats,
        (_: RootState, format: NameFormat) => format,
    ],
    (entityNameFormats, format) =>
        Object.entries(entityNameFormats).reduce((acc, [entity, formats]) => {
            acc[entity] = formats[format] || entity;
            return acc;
        }, {} as Record<string, string>)
);

export const selectAnyFieldMapping = createSelector(
    [
        selectFieldNameFormats,
        (_: RootState, entityName: EntityKeys, format: NameFormat) => entityName,
        (_: RootState, entityName: EntityKeys, format: NameFormat) => format,
    ],
    (fieldFormats, entityName, format) =>
        Object.entries(fieldFormats[entityName] || {}).reduce(
            (acc, [field, formats]) => {
                acc[field] = formats[format] || field;
                return acc;
            },
            {} as Record<string, string>
        )
);


export const selectAnyObjectFormatConversion = createSelector(
    [
        (
            _: RootState,
            payload: { entityName: EntityKeys; data: any; format: NameFormat }
        ) => payload.data,
        (
            state: RootState,
            payload: { entityName: EntityKeys; data: any; format: NameFormat }
        ) => selectAnyEntityMapping(state, payload.format),
        (
            state: RootState,
            payload: { entityName: EntityKeys; data: any; format: NameFormat }
        ) =>
            selectAnyFieldMapping(state, payload.entityName, payload.format),
    ],
    (data, entityMap, fieldMap) =>
        selectReplaceKeysInObject(
            {} as RootState,
            selectReplaceKeysInObject({} as RootState, data, entityMap),
            fieldMap
        )
);

//==============================



export const selectUnknownToAnyObjectFormatConversion = createSelector(
    [
        (
            _: RootState,
            payload: { entityAlias: string; data: any; targetFormat: NameFormat }
        ) => payload.data,
        (
            state: RootState,
            payload: { entityAlias: string; data: any; targetFormat: NameFormat }
        ) => selectEntityCanonicalName(state, payload.entityAlias),
        (
            state: RootState,
            payload: { entityAlias: string; data: any; targetFormat: NameFormat }
        ) => state,
        (
            _: RootState,
            payload: { entityAlias: string; data: any; targetFormat: NameFormat }
        ) => payload.targetFormat,
    ],
    (data, entityName, state, targetFormat) => {
        const canonicalData = selectCanonicalConversion(state, { entityName, data });
        return selectAnyObjectFormatConversion(state, { entityName, data: canonicalData, format: targetFormat });
    }
);

interface ResponseConversionPayload {
    entityName: EntityKeys;
    data: any | any[];
}

export const selectFrontendConversion = createSelector(
    [
        selectFieldNameToCanonical,
        (_: RootState, payload: ResponseConversionPayload) => payload
    ],
    (fieldToCanonical: Record<EntityKeys, Record<string, string>>, { entityName, data }) => {
        if (!data) {
            return data;
        }
        const keyMapping: KeyMapping = fieldToCanonical[entityName] || {};

        return selectReplaceKeysInObject({} as RootState, data, keyMapping);
    }
);

export const selectCanonicalConversion = createSelector(
    [
        selectFieldNameToCanonical,
        (_: RootState, payload: ResponseConversionPayload) => payload
    ],
    (fieldToCanonical: Record<EntityKeys, Record<string, string>>, { entityName, data }) => {
        if (!data) {
            return data;
        }
        const keyMapping: KeyMapping = fieldToCanonical[entityName] || {};
        return selectReplaceKeysInObject({} as RootState, data, keyMapping);
    }
);

export interface QueryConversionPayload<T extends EntityKeys> {
    entityName: T;
    options?: QueryOptions<T>;
}


export const selectQueryDatabaseConversion = createSelector(
    [
        (state: RootState, payload: QueryConversionPayload<EntityKeys>) =>
            selectEntityDatabaseName(state, payload.entityName),
        (state: RootState, payload: QueryConversionPayload<EntityKeys>) =>
            selectEntityFieldNameToDatabaseMap(state, payload.entityName),
        (_: RootState, payload: QueryConversionPayload<EntityKeys>) => payload.entityName,
        (_: RootState, payload: QueryConversionPayload<EntityKeys>) => payload.options
    ],
    (databaseTableName, fieldMap, entityName, options) => {
        if (!options) {
            return {} as QueryOptions<typeof entityName>;
        }

        const completeFieldMap = {
            ...fieldMap,
            [options.tableName]: databaseTableName
        };

        const processedFilters = options.filters
                                 ? selectReplaceKeysInObject({} as RootState, options.filters, completeFieldMap) as Partial<Record<string, any>>
                                 : undefined;

        const result: QueryOptions<typeof entityName> = {
            tableName: databaseTableName,

            ...(processedFilters && { filters: processedFilters }),

            ...(options.sorts && {
                sorts: options.sorts.map(sort => ({
                    column: fieldMap[sort.column] || sort.column,
                    ascending: sort.ascending
                }))
            }),

            ...(options.columns && {
                columns: options.columns.map(column => fieldMap[column] || column)
            }),

            ...(typeof options.limit !== 'undefined' && { limit: options.limit }),
            ...(typeof options.offset !== 'undefined' && { offset: options.offset })
        };

        return result;
    }
);

interface PayloadOptionsConversionPayload<T extends EntityKeys> {
    entityName: T;
    options?: QueryOptions<T>;
}

export const selectPayloadOptionsDatabaseConversion = createSelector(
    [
        (state: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) =>
            selectEntityFieldNameToDatabaseMap(state, payload.entityName),
        (state: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) =>
            selectEntityDatabaseName(state, payload.entityName),
        (_: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) => payload.entityName,
        (_: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) => payload.options
    ],
    (fieldMap, databaseTableName, entityName, options) => {
        if (!options) {
            return undefined;
        }
        const result: QueryOptions<typeof entityName> = {
            tableName: options.tableName ? databaseTableName : options.tableName,

            ...(options.filters && {
                filters: selectReplaceKeysInObject({} as RootState, options.filters, fieldMap) as Partial<Record<string, any>>
            }),

            ...(options.sorts && {
                sorts: options.sorts.map(sort => ({
                    column: fieldMap[sort.column] || sort.column,
                    ascending: sort.ascending
                }))
            }),

            ...(options.columns && {
                columns: options.columns.map(column => fieldMap[column] || column)
            }),

            ...(typeof options.limit !== 'undefined' && { limit: options.limit }),
            ...(typeof options.offset !== 'undefined' && { offset: options.offset })
        };

        return result;
    }
);


export type UnifiedQueryOptions<TEntity extends EntityKeys> = Partial<{
    tableName: TEntity; // The main table to query from
    filters: Partial<Record<string, any>>; // Field-based filters
    sorts: Array<{ column: string; ascending?: boolean }>; // Sort options for columns
    columns: Array<string>; // Columns to return in the result set
    limit: number; // Limit number of rows returned
    offset: number; // Skip a number of rows for pagination
    distinct: boolean; // To return only unique rows

    // Pagination controls
    range: {
        start: number;
        end: number;
    };

    // Full-text search support
    fullTextSearch: {
        column: string;
        query: string;
    };

    // Relationships (joins)
    joinTables: Array<{
        table: string; // The related table to join
        on: string; // Join condition, e.g., 'user_id = id'
        columns?: Array<string>; // Columns from the joined table to include
    }>;

    // Grouping and aggregate filtering
    groupBy: Array<string>; // Fields to group by
    having: Partial<Record<string, any>>; // Aggregate condition filters after grouping

    // Upsert and conflict handling
    upsertConflictColumns: Array<string>; // Columns to identify conflicts during upserts
}>;


export const selectUnifiedQueryDatabaseConversion = createSelector(
    [
        (state: RootState, payload: { entityName: EntityKeys; options?: UnifiedQueryOptions<EntityKeys> }) =>
            selectEntityDatabaseName(state, payload.entityName),
        (state: RootState, payload: { entityName: EntityKeys; options?: UnifiedQueryOptions<EntityKeys> }) =>
            selectEntityFieldNameToDatabaseMap(state, payload.entityName),
        selectEntityNameToDatabase,
        selectFieldNameToDatabase,
        (_: RootState, payload: { entityName: EntityKeys; options?: UnifiedQueryOptions<EntityKeys> }) =>
            payload.entityName,
        (_: RootState, payload: { entityName: EntityKeys; options?: UnifiedQueryOptions<EntityKeys> }) =>
            payload.options
    ],
    (databaseTableName, mainFieldMap, entityNameToDatabase, fieldNameToDatabase, entityName, options) => {
        if (!options) {
            return undefined;
        }

        const processJoinTables = (joins?: Array<{
            table: string;
            on: string;
            columns?: Array<string>;
        }>) => {
            if (!joins) return undefined;

            return joins.map(join => {
                const joinedTableName = entityNameToDatabase[join.table] || join.table;
                const joinedTableFieldMap = fieldNameToDatabase[join.table] || {};

                return {
                    table: joinedTableName,
                    on: Object.entries(joinedTableFieldMap).reduce<string>(
                        (clause: string, [key, value]: [string, string]) =>
                            clause.replace(new RegExp(`\\b${key}\\b`, 'g'), value),
                        join.on
                    ),
                    ...(join.columns && {
                        columns: join.columns.map(column =>
                            joinedTableFieldMap[column] || column
                        )
                    })
                };
            });
        };

        const processFullTextSearch = (fts?: { column: string; query: string }) => {
            if (!fts) return undefined;
            return {
                column: mainFieldMap[fts.column] || fts.column,
                query: fts.query
            };
        };

        const result: UnifiedQueryOptions<typeof entityName> = {
            tableName: databaseTableName as typeof entityName,

            ...(options.filters && {
                filters: selectReplaceKeysInObject({} as RootState, options.filters, mainFieldMap) as Partial<Record<string, any>>
            }),

            ...(options.sorts && {
                sorts: options.sorts.map(sort => ({
                    column: mainFieldMap[sort.column] || sort.column,
                    ascending: sort.ascending
                }))
            }),

            ...(options.columns && {
                columns: options.columns.map(column => mainFieldMap[column] || column)
            }),

            ...(typeof options.limit !== 'undefined' && { limit: options.limit }),
            ...(typeof options.offset !== 'undefined' && { offset: options.offset }),
            ...(typeof options.distinct !== 'undefined' && { distinct: options.distinct }),
            ...(options.range && { range: options.range }),

            ...(options.fullTextSearch && {
                fullTextSearch: processFullTextSearch(options.fullTextSearch)
            }),

            ...(options.joinTables && {
                joinTables: processJoinTables(options.joinTables)
            }),

            ...(options.groupBy && {
                groupBy: options.groupBy.map(field => mainFieldMap[field] || field)
            }),

            ...(options.having && {
                having: selectReplaceKeysInObject({} as RootState, options.having, mainFieldMap) as Partial<Record<string, any>>
            }),

            ...(options.upsertConflictColumns && {
                upsertConflictColumns: options.upsertConflictColumns.map(
                    column => mainFieldMap[column] || column
                )
            })
        };

        return result;
    }
);

// ============= Convenience Selectors =============






/*
export const selectPayloadOptionsDatabaseConversion = createSelector(
    [
        selectFieldNameToDatabase,
        selectEntityNameToDatabase,
        (_: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) => payload,
        (state: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) =>
            selectReplaceKeysInObject(state, payload.options?.filters || {}, {}), // Pass RootState and filters to selectReplaceKeysInObject
    ],
    (fieldMappings, tableNameMappings, payload, convertedFilters) => {
        const { entityName, options } = payload;
        if (!options) return options;

        const fieldMap = fieldMappings[entityName] || {};

        const convertedOptions = {
            ...options,
            ...(options.tableName && {
                tableName: tableNameMappings[options.tableName] || options.tableName,
            }),
            ...(options.filters && { filters: convertedFilters }), // Use convertedFilters instead of calling selectReplaceKeysInObject directly
            ...(options.sorts && {
                sorts: options.sorts.map((sort) => ({
                    ...sort,
                    column: fieldMap[sort.column] || sort.column,
                })),
            }),
            ...(options.columns && {
                columns: options.columns.map((column) => fieldMap[column] || column),
            }),
        };

        return convertedOptions;
    }
);

 */
