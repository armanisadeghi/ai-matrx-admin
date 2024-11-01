// lib/redux/selectors/globalCacheSelectors.ts
import {RootState} from "@/lib/redux/store";
import {createSelector} from "@reduxjs/toolkit";
import {EntityFieldKeys, EntityKeys} from "@/types/entityTypes";
import {GlobalCacheState, SchemaEntity, SchemaField} from "@/types/schema";
import {NameFormat} from "@/types/AutomationSchemaTypes";
import {QueryOptions} from "@/lib/redux/entity/entitySagas";

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
        return fieldIds.map(id => fields[id]).filter(Boolean);
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

export const selectEntityDisplayField = createSelector(
    [selectEntityFields],
    (fields): string | undefined => {
        const displayField = fields.find(field => field.isDisplayField);
        return displayField ? displayField.fieldName : undefined;
    }
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


// ENTITY NAME CONVERSION SELECTORS
// export const selectEntityDatabaseName = createSelector(
//     [selectEntityNameToDatabase, (_: RootState, entityName: EntityKeys) => entityName],
//     (toDatabase: Record<EntityKeys, string>, entityName): string => toDatabase[entityName] || entityName
// );

export const selectEntityDatabaseName = createSelector(
    [selectEntityNameToDatabase, (_: RootState, entityName: EntityKeys) => entityName],
    (entityToDatabase, entityName): string => entityToDatabase[entityName] || entityName
);

export const selectEntityBackendName = createSelector(
    [selectEntityNameToBackend, (_: RootState, entityName: EntityKeys) => entityName],
    (entityToBackend, entityName): string => entityToBackend[entityName] || entityName
);

// This converts FROM any format TO canonical
export const selectEntityFrontendName = createSelector(
    [selectEntityNameToCanonical, (_: RootState, entityName: string) => entityName],
    (toCanonicalMap, entityName): EntityKeys => toCanonicalMap[entityName] || entityName as EntityKeys
);

export const selectEntityPrettyName = createSelector(
    [selectEntityNameFormats, (_: RootState, entityName: EntityKeys) => entityName],
    (entityNameFormats, entityName) => entityNameFormats[entityName]?.['pretty'] || entityName
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

export const selectFieldPrettyName = createSelector(
    [
        selectFieldNameFormats,
        (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params
    ],
    (fieldFormats, {entityName, fieldName}) =>
        fieldFormats[entityName]?.[fieldName]?.['pretty'] || fieldName
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

export const selectReplaceKeysInObject = createSelector(
    [
        (_: RootState, data: Record<string, any> | Record<string, any>[]) => data,
        (_: RootState, _data: any, keyMapping: KeyMapping) => keyMapping
    ],
    (data, keyMapping) => {
        const replaceKeys = (obj: Record<string, any>): Record<string, any> => {
            return Object.keys(obj).reduce((acc, key) => {
                const newKey = keyMapping[key] || key;
                acc[newKey] = obj[key];
                return acc;
            }, {});
        };

        if (Array.isArray(data)) {
            return data.map(replaceKeys);
        }

        return replaceKeys(data);
    }
);

export const selectConvertDataFormat = createSelector(
    [
        (_: RootState, data: Record<string, any> | Record<string, any>[]) => data,
        (_: RootState, _data: any, entityNameMapping: KeyMapping) => entityNameMapping,
        (_: RootState, _data: any, _entityNameMapping: any, fieldNameMapping: KeyMapping) => fieldNameMapping
    ],
    (data, entityNameMapping, fieldNameMapping) => {
        // Use selectReplaceKeysInObject for both conversions
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

export const selectFormatEntityMapping = createSelector(
    [
        selectEntityNameFormats,
        (_: RootState, entityName: EntityKeys) => entityName,
        (_: RootState, _entityName: EntityKeys, format: string) => format
    ],
    (entityNameFormats, entityName, format) =>
        Object.entries(entityNameFormats[entityName] || {}).reduce(
            (acc, [key, value]) => {
                if (format === key) acc[entityName] = value;
                return acc;
            },
            {} as Record<string, string>
        )
);

export const selectFormatFieldMapping = createSelector(
    [
        selectFieldNameFormats,
        (_: RootState, entityName: EntityKeys) => entityName,
        (_: RootState, _entityName: EntityKeys, format: string) => format
    ],
    (fieldFormats, entityName, format) =>
        Object.entries(fieldFormats[entityName] || {}).reduce(
            (acc, [fieldName, formatMap]) => {
                const value = formatMap[format];
                if (value) acc[fieldName] = value;
                return acc;
            },
            {} as Record<string, string>
        )
);


export const selectPrettyConversion = createSelector(
    [
        selectEntityNameFormats,
        selectFieldNameFormats,
        (_: RootState, payload: { entityName: EntityKeys; data: any }) => payload
    ],
    (entityNameFormats, fieldFormats, {entityName, data}) => {
        const entityMap = Object.entries(entityNameFormats).reduce((acc, [entity, formats]) => {
            acc[entity] = formats['pretty'] || entity;
            return acc;
        }, {} as Record<string, string>);

        const fieldMap = Object.entries(fieldFormats[entityName] || {}).reduce(
            (acc, [field, formats]) => {
                acc[field] = formats['pretty'] || field;
                return acc;
            },
            {} as Record<string, string>
        );

        return selectConvertDataFormat({} as RootState, data, entityMap, fieldMap);
    }
);

export const selectFormatConversion = createSelector(
    [
        selectEntityNameFormats,
        selectFieldNameFormats,
        (_: RootState, payload: FormatConversionPayload<any>) => payload
    ],
    (entityNameFormats, fieldFormats, {entityName, data, format}) => {
        const entityMapping = Object.entries(entityNameFormats[entityName] || {}).reduce(
            (acc, [key, value]) => {
                if (format === key) acc[entityName] = value;
                return acc;
            },
            {} as Record<string, string>
        );

        const fieldMapping = Object.entries(fieldFormats[entityName] || {}).reduce(
            (acc, [fieldName, formatMap]) => {
                const value = formatMap[format];
                if (value) acc[fieldName] = value;
                return acc;
            },
            {} as Record<string, string>
        );

        return selectConvertDataFormat({} as RootState, data, entityMapping, fieldMapping);
    }
);

// Unknown format conversion selectors
export const selectUnknownFormatConversion = createSelector(
    [
        selectEntityNameToCanonical,
        selectEntityNameFormats,
        selectFieldNameFormats,
        (_: RootState, payload: UnknownFormatPayload<any>) => payload
    ],
    (entityNameToCanonical, entityNameFormats, fieldFormats, {entityNameOrAlias, data, targetFormat}) => {
        // First, get the canonical entity name
        const entityKey = entityNameToCanonical[entityNameOrAlias];
        if (!entityKey) {
            throw new Error(`Unknown entity: ${entityNameOrAlias}`);
        }

        // Then use the format conversion
        return selectFormatConversion.resultFunc(
            // @ts-ignore
            entityNameFormats,
            fieldFormats,
            {entityName: entityKey, data, format: targetFormat}
        );
    }
);

export const selectUnknownFieldFormatConversion = createSelector(
    [
        selectEntityNameToCanonical,
        selectFieldNameToCanonical,
        selectFieldNameFormats,
        (_: RootState, payload: UnknownFieldFormatPayload) => payload
    ],
    (entityNameToCanonical, fieldNameToCanonical, fieldFormats, {entityNameOrAlias, fieldNameOrAlias, targetFormat}) => {
        // First, get the canonical entity name
        const entityKey = entityNameToCanonical[entityNameOrAlias];
        if (!entityKey) {
            throw new Error(`Unknown entity: ${entityNameOrAlias}`);
        }

        // Then, get the canonical field name
        const fieldKey = fieldNameToCanonical[entityKey]?.[fieldNameOrAlias];
        if (!fieldKey) {
            throw new Error(`Unknown field: ${fieldNameOrAlias} for entity ${entityKey}`);
        }

        // Finally, get the target format
        const targetName = fieldFormats[entityKey]?.[fieldKey]?.[targetFormat];
        if (!targetName) {
            throw new Error(`Unknown format ${targetFormat} for field ${fieldKey} in entity ${entityKey}`);
        }

        return targetName;
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
    (fieldMappings, {entityName, data}) => {
        if (!data) return data;

        const fieldMap = fieldMappings[entityName] || {};

        return selectReplaceKeysInObject({} as RootState, data, fieldMap);
    }
);

export interface QueryConversionPayload<T extends EntityKeys> {
    entityName: T;
    options?: QueryOptions<T>;
}



// Update query conversion selector as well
export const selectQueryDatabaseConversion = createSelector(
    [
        selectFieldNameToDatabase,
        selectEntityNameToDatabase,
        (_: RootState, payload: QueryConversionPayload<EntityKeys>) => payload
    ],
    (fieldMappings, tableNameMappings, payload) => {
        const {entityName, options} = payload;
        if (!options) return {} as QueryOptions<typeof entityName>;

        const fieldMap = fieldMappings[entityName] || {};

        return {
            ...options,
            tableName: tableNameMappings[options.tableName] || options.tableName,
            filters: options.filters
                     ? selectReplaceKeysInObject({} as RootState, options.filters, fieldMap)
                     : undefined,
            sorts: options.sorts?.map(sort => ({
                column: fieldMap[sort.column] || sort.column,
                ascending: sort.ascending
            })),
            columns: options.columns?.map(
                column => fieldMap[column] || column
            ),
            limit: options.limit,
            offset: options.offset
        } as QueryOptions<typeof entityName>;
    }
);

interface PayloadOptionsConversionPayload<T extends EntityKeys> {
    entityName: T;
    options?: QueryOptions<T>;
}

export const selectPayloadOptionsDatabaseConversion = createSelector(
    [
        selectFieldNameToDatabase,
        selectEntityNameToDatabase,
        (_: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) => payload
    ],
    (fieldMappings, tableNameMappings, payload) => {
        const { entityName, options } = payload;
        if (!options) return options;

        const fieldMap = fieldMappings[entityName] || {};

        const convertedOptions = {
            ...options,
            ...(options.tableName && {
                tableName: tableNameMappings[options.tableName] || options.tableName
            }),
            ...(options.filters && {
                filters: selectReplaceKeysInObject({} as RootState, options.filters, fieldMap)
            }),
            ...(options.sorts && {
                sorts: options.sorts.map(sort => ({
                    ...sort,  // Preserve any additional sort properties
                    column: fieldMap[sort.column] || sort.column,
                }))
            }),
            ...(options.columns && {
                columns: options.columns.map(column =>
                    fieldMap[column] || column
                )
            })
        };

        return convertedOptions;
    }
);

export const selectFieldDatabaseColumns = createSelector(
    [
        selectFieldNameToDatabase,
        (_: RootState, params: { entityName: EntityKeys; columns: string[] }) => params
    ],
    (fieldMappings, {entityName, columns}) => {
        const fieldMap = fieldMappings[entityName] || {};
        return selectReplaceKeysInObject({} as RootState, columns, fieldMap);
    }
);
