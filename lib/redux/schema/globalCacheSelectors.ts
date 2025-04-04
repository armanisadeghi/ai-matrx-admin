// lib/redux/selectors/globalCacheSelectors.ts
import { RootState } from '@/lib/redux/store';
import { createSelector } from '@reduxjs/toolkit';
import {
    AnyEntityDatabaseTable,
    EntityFieldKeys,
    EntityKeys,
    AllEntityNameVariations,
    EntitySelectOption,
    PrettyEntityName,
    AllEntityFieldKeys,
} from '@/types/entityTypes';
import { SchemaEntity } from '@/types/schema';
import { NameFormat } from '@/types/AutomationSchemaTypes';

import { GlobalCacheState } from '@/lib/redux';
import {
    DisplayFieldMetadata,
    EntityStateField,
    FlexibleQueryOptions,
    PrimaryKeyMetadata,
    QueryOptions,
    QueryOptionsReturn,
    UnifiedDatabaseObject,
} from '../entity/types/stateTypes';
import { parseMatrxRecordId, parseRecordKeys } from '@/lib/redux/entity/utils/stateHelpUtils';
import EntityLogger from '@/lib/redux/entity/utils/entityLogger';

const trace = 'GLOBAL CACHE SELECTORS';
const logger = EntityLogger.createLoggerWithDefaults(trace, 'NoEntity');

// ----------------
// BATCH 1: Direct State Access Selectors
// ----------------

// Base selector for the entire global cache slice
const selectGlobalCache = (state: RootState): GlobalCacheState => state.globalCache;

// Basic state access selectors
export const selectSchema = createSelector([selectGlobalCache], (cache) => cache.schema);

export const selectEntityNames = createSelector([selectGlobalCache], (cache) => cache.entityNames);

export const selectEntities = createSelector([selectGlobalCache], (cache) => cache.entitiesWithoutFields);

// export const selectFields = createSelector([selectGlobalCache], (cache) => cache.fields);

// export const selectFieldsByEntity = createSelector([selectGlobalCache], (cache) => cache.entities);

export const selectIsInitialized = createSelector([selectGlobalCache], (cache) => cache.isInitialized);

// Direct conversion map selectors
export const selectEntityNameToCanonical = createSelector([selectGlobalCache], (cache) => cache.entityNameToCanonical);

export const selectFieldNameToCanonical = createSelector([selectGlobalCache], (cache) => cache.fieldNameToCanonical);

export const selectEntityNameFormats = createSelector([selectGlobalCache], (cache) => cache.entityNameFormats);

export const makeSelectEntityNameByFormat = (entityName: EntityKeys, format: NameFormat) =>
    createSelector([selectEntityNameFormats], (entityNameFormats) => {
        if (!entityNameFormats || !entityNameFormats[entityName]) {
            return null;
        }
        return (entityNameFormats[entityName][format] as AllEntityNameVariations) || null;
    });

export const selectFieldNameFormats = createSelector([selectGlobalCache], (cache) => cache.fieldNameFormats);

export const selectEntityNameToDatabase = createSelector([selectGlobalCache], (cache) => cache.entityNameToDatabase);

export const selectEntityNameToBackend = createSelector([selectGlobalCache], (cache) => cache.entityNameToBackend);

export const selectFieldNameToDatabase = createSelector([selectGlobalCache], (cache) => cache.fieldNameToDatabase);

export const selectFieldNameToBackend = createSelector([selectGlobalCache], (cache) => cache.fieldNameToBackend);

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
    [selectSchema, (_: RootState, entityName: EntityKeys) => entityName],
    (entities, entityName): EntityStateField[] => {
        const entity = entities[entityName];
        if (!entity) return [];
        
        return Object.values(entity.entityFields);
    }
);

export const selectField = createSelector(
    [selectSchema, (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params],
    (entities, params) => {
        const { entityName, fieldName } = params;
        const entity = entities[entityName];
        if (!entity) return {};
        
        const fieldId = `${entityName}__${fieldName}`;
        return entity.entityFields[fieldId] || {};
    }
);

// Primary key and display field selectors
export const selectEntityPrimaryKeyField = createSelector(
    [(state: RootState, entityName: EntityKeys) => selectEntityFields(state, entityName)],
    (fields): string | undefined => {
        const primaryKeyField = fields.find((field) => field.isPrimaryKey);
        return primaryKeyField ? primaryKeyField.fieldName : undefined;
    }
);

// Display field selector - needs correction
export const selectEntityDisplayField = createSelector(
    [
        (state: RootState, entityName: EntityKeys) => {
            const fields = selectEntityFields(state, entityName);
            return fields;
        },
    ],
    (fields): string | undefined => {
        const displayField = fields.find((field) => field.isDisplayField);
        const result = displayField ? displayField.name : undefined;
        return result;
    }
);

// Selector for primaryKeyMetadata
export const selectEntityPrimaryKeyMetadata = createSelector([selectEntity], (entity): PrimaryKeyMetadata | undefined => entity?.primaryKeyMetadata);

// Selector for displayFieldMetadata
export const selectEntityDisplayFieldMetadata = createSelector([selectEntity], (entity): DisplayFieldMetadata | undefined => entity?.displayFieldMetadata);

// Combined selector to get both primaryKeyMetadata and displayFieldMetadata
export const selectEntityMetadata = createSelector(
    [selectEntity],
    (entity): { primaryKeyMetadata?: PrimaryKeyMetadata; displayFieldMetadata?: DisplayFieldMetadata } => {
        if (!entity) return { primaryKeyMetadata: undefined, displayFieldMetadata: undefined };

        // Extract metadata fields directly from the entity
        const { primaryKeyMetadata, displayFieldMetadata } = entity;
        return { primaryKeyMetadata, displayFieldMetadata } as {
            primaryKeyMetadata?: PrimaryKeyMetadata;
            displayFieldMetadata?: DisplayFieldMetadata;
        };
    }
);

export const selectEntityFieldNameToDatabaseMap = createSelector(
    [selectFieldNameToDatabase, (_: RootState, entityName: EntityKeys) => entityName],
    (fieldNameToDatabase, entityName) => fieldNameToDatabase[entityName] || {}
);

// Relationship selectors
export const selectEntityRelationships = createSelector([selectEntity], (entity) => entity?.relationships || []);

export const selectRelatedEntities = createSelector([selectEntityRelationships, selectEntityNames], (relationships, entityNames) =>
    relationships.map((rel) => ({
        ...rel,
        relatedEntity: entityNames.find((name) => name === rel.relatedTable),
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
    [selectEntityNameToCanonical, (_: RootState, entityName: AllEntityNameVariations) => entityName],
    (toCanonicalMap, entityName): EntityKeys => toCanonicalMap[entityName] || (entityName as EntityKeys)
);

export const selectEntityFrontendName = selectEntityCanonicalName;

// Returns the name of the table in a Pretty Format for display
export const selectEntityPrettyName = createSelector(
    [selectEntityNameFormats, (_: RootState, entityName: EntityKeys) => entityName],
    (entityNameFormats, entityName) => entityNameFormats[entityName]?.['pretty'] as PrettyEntityName<EntityKeys>
);

const startsWithVowelSound = (word: string): boolean => {
    const vowelRegex = /^[aeiou]/i;
    return vowelRegex.test(word);
};

export const selectEntitySelectText = createSelector([selectEntityPrettyName], (prettyName) => {
    if (!prettyName) return 'Select a Record';
    const article = startsWithVowelSound(prettyName) ? 'an' : 'a';
    return `Select ${article} ${prettyName}`;
});

export const selectFormattedEntityOptions = createSelector(
    [(state: RootState) => state, selectEntityNames],
    (state, entityNames): EntitySelectOption<EntityKeys>[] => {
        return entityNames.map((entityName) => ({
            value: entityName,
            label: selectEntityPrettyName(state, entityName),
        }));
    }
);

export const selectEntityAnyName = createSelector(
    [selectEntityNameFormats, (_: RootState, params: { entityName: EntityKeys; format: NameFormat }) => params],
    (entityNameFormats, { entityName, format }) => entityNameFormats[entityName]?.[format] || entityName
);

// FIELD NAME CONVERSION SELECTORS
export const selectFieldDatabaseName = createSelector(
    [selectFieldNameToDatabase, (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params],
    (fieldToDatabase, { entityName, fieldName }): string => fieldToDatabase[entityName]?.[fieldName] || fieldName
);

export const selectFieldBackendName = createSelector(
    [selectFieldNameToBackend, (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params],
    (fieldToBackend, { entityName, fieldName }): string => fieldToBackend[entityName]?.[fieldName] || fieldName
);

// This converts FROM any format TO canonical
export const selectFieldFrontendName = createSelector(
    [selectFieldNameToCanonical, (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params],
    (toCanonicalMap, { entityName, fieldName }): string => toCanonicalMap[entityName]?.[fieldName] || fieldName
);

export const selectFieldNameMappingForEntity = createSelector(
    [selectFieldNameFormats, (_: RootState, entityName: EntityKeys) => entityName],
    (fieldFormats, entityName) => {
        return fieldFormats[entityName] || {};
    }
);

// Returns the nae of the field in a Pretty Format for display, such as a column header
export const selectFieldPrettyName = createSelector(
    [selectFieldNameFormats, (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params],
    (fieldFormats, { entityName, fieldName }) => fieldFormats[entityName]?.[fieldName]?.['pretty'] || fieldName
);

export const selectAllFieldPrettyNames = createSelector(
    [selectFieldNameFormats, (_: RootState, params: { entityName: EntityKeys }) => params],
    (fieldFormats, { entityName }) => {
        const entityFields = fieldFormats[entityName];
        if (!entityFields) {
            return {};
        }

        const prettyNames: Record<string, string> = {};
        Object.keys(entityFields).forEach((fieldName) => {
            prettyNames[fieldName] = entityFields[fieldName]?.['pretty'] || fieldName;
        });

        return prettyNames;
    }
);

export const selectFieldAnyName = createSelector(
    [selectFieldNameFormats, (_: RootState, params: { entityName: EntityKeys; fieldName: string; format: NameFormat }) => params],
    (fieldFormats, { entityName, fieldName, format }) => fieldFormats[entityName]?.[fieldName]?.[format] || fieldName
);

// SCHEMA SELECTORS
export const selectEntitySchema = createSelector(
    [selectEntities, (_: RootState, payload: { entityName: EntityKeys }) => payload],
    (entities, { entityName }) => entities[entityName]
);

export const selectFieldSchema = createSelector(
    [selectEntitySchema, (_: RootState, payload: { entityName: EntityKeys; fieldName: EntityFieldKeys<EntityKeys> }) => payload],
    (entitySchema, { fieldName }) => entitySchema?.entityFields?.[fieldName]
);

export type KeyMapping = { [oldKey: string]: string };

// Existing selector with console logs added
export const selectReplaceKeysInObject = createSelector(
    [(_: RootState, data: Record<string, any> | Record<string, any>[] | string) => data, (_: RootState, _data: any, keyMapping: KeyMapping) => keyMapping],
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
            if (keys.every((key) => !keyMapping?.[key])) return obj;

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
        (_: RootState, _data: any, keyMapping: KeyMapping) => keyMapping || {}, // Default to empty object if keyMapping is undefined
    ],
    (data, keyMapping) => {
        // console.log("Received data:", data);
        // console.log("Received keyMapping:", keyMapping);

        if (typeof data === 'string') {
            // console.log("Data is a string, performing direct key mapping.");
            return keyMapping[data] || data; // Safe access
        }

        const replaceKeys = (obj: Record<string, any> = {}): Record<string, any> => {
            // console.log("Replacing keys in object:", obj);
            const keys = Object.keys(obj);
            // Return same object if no keys need mapping
            if (keys.every((key) => !keyMapping[key])) return obj;

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
        (_: RootState, _data: any, _entityNameMapping: any, fieldNameMapping: KeyMapping) => fieldNameMapping,
    ],
    (data, entityNameMapping, fieldNameMapping) => {
        // If data is a string, process it through both mappings in sequence
        if (typeof data === 'string') {
            const entityConverted = entityNameMapping[data] || data;
            return fieldNameMapping[entityConverted] || entityConverted;
        }

        const entityConverted = selectReplaceKeysInObject({} as RootState, data, entityNameMapping);

        return selectReplaceKeysInObject({} as RootState, entityConverted, fieldNameMapping);
    }
);

// Then update the conversion selectors to use the memoized version
export const selectDatabaseConversion = createSelector(
    [selectEntityNameToDatabase, selectFieldNameToDatabase, (_: RootState, payload: { entityName: EntityKeys; data: any }) => payload],
    (entityMap, fieldMap, { entityName, data }) => selectConvertDataFormat({} as RootState, data, entityMap, fieldMap[entityName] || {})
);

export const selectBackendConversion = createSelector(
    [selectEntityNameToBackend, selectFieldNameToBackend, (_: RootState, payload: { entityName: EntityKeys; data: any }) => payload],
    (entityMap, fieldMap, { entityName, data }) => selectConvertDataFormat({} as RootState, data, entityMap, fieldMap[entityName] || {})
);

// Mapping selectors - these are basic and don't need to change
export const selectPrettyEntityMapping = createSelector([selectEntityNameFormats], (entityNameFormats) =>
    Object.entries(entityNameFormats).reduce((acc, [entity, formats]) => {
        acc[entity] = formats['pretty'] || entity;
        return acc;
    }, {} as Record<string, string>)
);

export const selectPrettyFieldMapping = createSelector(
    [selectFieldNameFormats, (_: RootState, entityName: EntityKeys) => entityName],
    (fieldFormats, entityName) =>
        Object.entries(fieldFormats[entityName] || {}).reduce((acc, [field, formats]) => {
            acc[field] = formats['pretty'] || field;
            return acc;
        }, {} as Record<string, string>)
);

// Main conversion selectors
export const selectPrettyConversion = createSelector(
    [
        (_: RootState, payload: { entityName: EntityKeys; data: any }) => payload.data,
        selectPrettyEntityMapping,
        (state: RootState, payload: { entityName: EntityKeys; data: any }) => selectPrettyFieldMapping(state, payload.entityName),
    ],
    (data, entityMap, fieldMap) => selectReplaceKeysInObject({} as RootState, selectReplaceKeysInObject({} as RootState, data, entityMap), fieldMap)
);

// =========================
// Mapping selectors - these are basic and don't need to change
export const selectAnyEntityMapping = createSelector([selectEntityNameFormats, (_: RootState, format: NameFormat) => format], (entityNameFormats, format) =>
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
        Object.entries(fieldFormats[entityName] || {}).reduce((acc, [field, formats]) => {
            acc[field] = formats[format] || field;
            return acc;
        }, {} as Record<string, string>)
);

export const selectAnyObjectFormatConversion = createSelector(
    [
        (_: RootState, payload: { entityName: EntityKeys; data: any; format: NameFormat }) => payload.data,
        (state: RootState, payload: { entityName: EntityKeys; data: any; format: NameFormat }) => selectAnyEntityMapping(state, payload.format),
        (state: RootState, payload: { entityName: EntityKeys; data: any; format: NameFormat }) =>
            selectAnyFieldMapping(state, payload.entityName, payload.format),
    ],
    (data, entityMap, fieldMap) => selectReplaceKeysInObject({} as RootState, selectReplaceKeysInObject({} as RootState, data, entityMap), fieldMap)
);

//==============================

export const selectUnknownToAnyObjectFormatConversion = createSelector(
    [
        (_: RootState, payload: { entityAlias: AllEntityNameVariations; data: any; targetFormat: NameFormat }) => payload.data,
        (state: RootState, payload: { entityAlias: AllEntityNameVariations; data: any; targetFormat: NameFormat }) =>
            selectEntityCanonicalName(state, payload.entityAlias),
        (state: RootState, payload: { entityAlias: AllEntityNameVariations; data: any; targetFormat: NameFormat }) => state,
        (_: RootState, payload: { entityAlias: AllEntityNameVariations; data: any; targetFormat: NameFormat }) => payload.targetFormat,
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
    [selectFieldNameToCanonical, (_: RootState, payload: ResponseConversionPayload) => payload],
    (fieldToCanonical: Record<EntityKeys, Record<string, string>>, { entityName, data }) => {
        if (!data) {
            return data;
        }
        const keyMapping: KeyMapping = fieldToCanonical[entityName] || {};
        // console.log('Key Mapping:', keyMapping);

        return selectReplaceKeysInObject({} as RootState, data, keyMapping);
    }
);

export const selectCanonicalConversion = createSelector(
    [selectFieldNameToCanonical, (_: RootState, payload: ResponseConversionPayload) => payload],
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
        (state: RootState, payload: QueryConversionPayload<EntityKeys>) => selectEntityDatabaseName(state, payload.entityName),
        (state: RootState, payload: QueryConversionPayload<EntityKeys>) => selectEntityFieldNameToDatabaseMap(state, payload.entityName),
        (_: RootState, payload: QueryConversionPayload<EntityKeys>) => payload.entityName,
        (_: RootState, payload: QueryConversionPayload<EntityKeys>) => payload.options,
    ],
    (databaseTableName: AnyEntityDatabaseTable, fieldMap, entityName, options) => {
        if (!options) {
            return {} as QueryOptions<typeof entityName>;
        }

        const completeFieldMap = {
            ...fieldMap,
            [options.tableName]: databaseTableName as AnyEntityDatabaseTable,
        };

        const processedFilters = options.filters
            ? (selectReplaceKeysInObject({} as RootState, options.filters, completeFieldMap) as Partial<Record<string, any>>)
            : undefined;

        const result: QueryOptionsReturn<typeof entityName> = {
            tableName: databaseTableName,

            ...(processedFilters && { filters: processedFilters }),

            ...(options.sorts && {
                sorts: options.sorts.map((sort) => ({
                    column: fieldMap[sort.column] || sort.column,
                    ascending: sort.ascending,
                })),
            }),

            ...(options.columns && {
                columns: options.columns.map((column) => fieldMap[column] || column),
            }),

            ...(typeof options.limit !== 'undefined' && { limit: options.limit }),
            ...(typeof options.offset !== 'undefined' && { offset: options.offset }),
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
        (state: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) => selectEntityFieldNameToDatabaseMap(state, payload.entityName),
        (state: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) => selectEntityDatabaseName(state, payload.entityName),
        (_: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) => payload.entityName,
        (_: RootState, payload: PayloadOptionsConversionPayload<EntityKeys>) => payload.options,
    ],
    (fieldMap, databaseTableName: AnyEntityDatabaseTable, entityName, options) => {
        if (!options) {
            return undefined;
        }
        const result: QueryOptionsReturn<typeof entityName> = {
            tableName: options.tableName ? databaseTableName : options.tableName,

            ...(options.filters && {
                filters: selectReplaceKeysInObject({} as RootState, options.filters, fieldMap) as Partial<Record<string, any>>,
            }),

            ...(options.sorts && {
                sorts: options.sorts.map((sort) => ({
                    column: fieldMap[sort.column] || sort.column,
                    ascending: sort.ascending,
                })),
            }),

            ...(options.columns && {
                columns: options.columns.map((column) => fieldMap[column] || column),
            }),

            ...(typeof options.limit !== 'undefined' && { limit: options.limit }),
            ...(typeof options.offset !== 'undefined' && { offset: options.offset }),
        };

        return result;
    }
);

export const selectUnifiedDatabaseObjectConversion = createSelector(
    [
        (state: RootState, options: FlexibleQueryOptions) => selectEntityCanonicalName(state, options.entityNameAnyFormat),

        (state: RootState, options: FlexibleQueryOptions) => selectEntityDatabaseName(state, selectEntityCanonicalName(state, options.entityNameAnyFormat)),

        (state: RootState, options: FlexibleQueryOptions) =>
            selectEntityFieldNameToDatabaseMap(state, selectEntityCanonicalName(state, options.entityNameAnyFormat)),

        (state: RootState, options: FlexibleQueryOptions) =>
            selectEntityPrimaryKeyMetadata(state, selectEntityCanonicalName(state, options.entityNameAnyFormat)),

        (state: RootState, options: FlexibleQueryOptions) => {
            const canonicalName = selectEntityCanonicalName(state, options.entityNameAnyFormat);
            const displayField = selectEntityDisplayField(state, canonicalName);
            return displayField;
        },

        (_: RootState, options: FlexibleQueryOptions) => options,
    ],
    (
        entityName: EntityKeys,
        tableName: AnyEntityDatabaseTable,
        fieldMap: Record<string, string>,
        primaryKeyMetadata: PrimaryKeyMetadata,
        frontendDisplayField: EntityFieldKeys<EntityKeys>,
        options: FlexibleQueryOptions
    ): UnifiedDatabaseObject => {
        const result: UnifiedDatabaseObject = {
            entityName,
            tableName,
            primaryKeyMetadata,
            frontendPks: primaryKeyMetadata.fields,
            databasePks: primaryKeyMetadata.database_fields,
            frontendDisplayField,
            databaseDisplayField: fieldMap[frontendDisplayField] || frontendDisplayField,
            entityNameAnyFormat: options.entityNameAnyFormat,
        };

        if (options.recordKeys) {
            result.recordKeys = options.recordKeys;
            // Add type assertion for parsedFrontendRecords
            result.parsedFrontendRecords = parseRecordKeys(options.recordKeys) as Record<AllEntityFieldKeys, string>[];

            if (result.parsedFrontendRecords) {
                result.parsedDatabaseRecords = result.parsedFrontendRecords.map((record) => {
                    const databaseRecord: Record<string, string> = {};
                    Object.entries(record).forEach(([key, value]) => {
                        databaseRecord[fieldMap[key] || key] = value;
                    });
                    return databaseRecord;
                });
            }
        }

        logger.log('debug', 'Record keys processed:', result.recordKeys);

        if (options.filters) {
            result.filters = selectReplaceKeysInObject({} as RootState, options.filters, fieldMap) as Partial<Record<string, unknown>>;
        }

        logger.log('debug', 'Filters processed:', result.filters);

        if (options.sorts) {
            result.sorts = options.sorts.map((sort) => ({
                column: (fieldMap[sort.column] || sort.column) as AllEntityFieldKeys,
                ascending: sort.ascending,
            }));
        }
        logger.log('debug', 'Sorts processed:', result.sorts);

        if (options.columns) {
            result.columns = options.columns.map((column) => fieldMap[column] || column);
        }

        logger.log('debug', 'Columns processed:', result.columns);

        if (typeof options.limit !== 'undefined') {
            result.limit = options.limit;
        }

        logger.log('debug', 'Limit processed:', result.limit);

        if (typeof options.offset !== 'undefined') {
            result.offset = options.offset;
        }

        logger.log('debug', 'Offset processed:', result.offset);

        if (options.data) {
            result.data = convertToDatabase(options.data, fieldMap);
        }

        let pksAndValues: Record<string, any> = {};

        if (options.matrxRecordId) {
            pksAndValues = parseMatrxRecordId(options.matrxRecordId);
        }

        const { primaryKeysAndValues, recordKeys } = result.databasePks.reduce(
            (acc, pk, index) => {
                const value = result.data?.[pk] ?? pksAndValues[pk];
                if (value !== undefined) {
                    acc.primaryKeysAndValues[pk] = value;
                    acc.recordKeyParts.push(`${pk}:${value}`);
                }
                if (index === result.databasePks.length - 1 && acc.recordKeyParts.length > 0) {
                    acc.recordKeys.push(acc.recordKeyParts.join('::'));
                }
                return acc;
            },
            {
                primaryKeysAndValues: {} as Record<string, any>,
                recordKeyParts: [] as string[],
                recordKeys: [] as string[],
            }
        );

        result.primaryKeysAndValues = primaryKeysAndValues;
        result.recordKeys = recordKeys;

        if (options.tempRecordId) {
            result.tempRecordId = options.tempRecordId;
        }

        logger.log('debug', 'Data processed:', result.data);
        logger.log('debug', 'Primary keys and values extracted:', primaryKeysAndValues);

        return result;
    }
);

const convertToDatabase = (data: unknown, fieldMap: Record<string, string>): Record<string, unknown> | Record<string, unknown>[] => {
    const isValuePresent = (value: unknown): boolean => {
        if (value === null || value === undefined) {
            return false;
        }

        if (typeof value === 'string' && value.trim() === '') {
            return false;
        }

        if (Array.isArray(value) && value.length === 0) {
            return false;
        }

        if (value && typeof value === 'object' && Object.keys(value).length === 0) {
            return false;
        }

        return true;
    };

    const convertSingleObject = (item: Record<string, unknown>): Record<string, unknown> => {
        const databaseFormatItem: Record<string, unknown> = {};
        Object.entries(item).forEach(([key, value]) => {
            if (isValuePresent(value)) {
                databaseFormatItem[fieldMap[key] || key] = value;
            }
        });
        return databaseFormatItem;
    };

    if (Array.isArray(data)) {
        return data.map((item) => convertSingleObject(item as Record<string, unknown>));
    }

    return convertSingleObject(data as Record<string, unknown>);
};

export const selectUnifiedDatabaseObjectConversion2 = createSelector(
    [
        (state: RootState, options: FlexibleQueryOptions) => selectEntityCanonicalName(state, options.entityNameAnyFormat),
        (state: RootState, options: FlexibleQueryOptions) => options,
        (state: RootState) => state,
    ],
    (entityName: EntityKeys, options: FlexibleQueryOptions, state: RootState): UnifiedDatabaseObject => {
        // Get all our dependencies using state and entityName
        const tableName = selectEntityDatabaseName(state, entityName) as AnyEntityDatabaseTable;
        const fieldMap = selectEntityFieldNameToDatabaseMap(state, entityName);
        const primaryKeyMetadata = selectEntityPrimaryKeyMetadata(state, entityName);
        const frontendDisplayField = selectEntityDisplayField(state, entityName) as AllEntityFieldKeys;

        const result: UnifiedDatabaseObject = {
            entityName,
            tableName,
            primaryKeyMetadata,
            frontendPks: primaryKeyMetadata.fields,
            databasePks: primaryKeyMetadata.database_fields,
            frontendDisplayField: frontendDisplayField,
            databaseDisplayField: fieldMap[frontendDisplayField] || frontendDisplayField,
            entityNameAnyFormat: options.entityNameAnyFormat,

        };

        if (options.recordKeys) {
            result.recordKeys = options.recordKeys;
            result.parsedFrontendRecords = parseRecordKeys(options.recordKeys) as Record<AllEntityFieldKeys, string>[];
        
            if (result.parsedFrontendRecords) {
                result.parsedDatabaseRecords = result.parsedFrontendRecords.map(record => {
                    const databaseRecord: Record<string, string> = {};
                    Object.entries(record).forEach(([key, value]) => {
                        databaseRecord[fieldMap[key] || key] = value;
                    });
                    return databaseRecord;
                });
            }
        }
        
        if (options.filters) {
            result.filters = selectReplaceKeysInObject(state, options.filters, fieldMap) as Partial<Record<string, unknown>>;
        }

        if (options.sorts) {
            result.sorts = options.sorts.map(sort => ({
                column: (fieldMap[sort.column] || sort.column) as AllEntityFieldKeys,
                ascending: sort.ascending
            }));
        }
        if (options.columns) {
            result.columns = options.columns.map((column) => fieldMap[column] || column);
        }

        if (typeof options.limit !== 'undefined') {
            result.limit = options.limit;
        }

        if (typeof options.offset !== 'undefined') {
            result.offset = options.offset;
        }

        if (options.data) {
            result.data = selectFrontendConversion(state, { entityName, data: options.data });
        }

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
    userId?: string;
}>;

export const selectUnifiedQueryDatabaseConversion = createSelector(
    [
        (state: RootState, payload: { entityName: EntityKeys; options?: UnifiedQueryOptions<EntityKeys> }) =>
            selectEntityDatabaseName(state, payload.entityName),
        (state: RootState, payload: { entityName: EntityKeys; options?: UnifiedQueryOptions<EntityKeys> }) =>
            selectEntityFieldNameToDatabaseMap(state, payload.entityName),
        selectEntityNameToDatabase,
        selectFieldNameToDatabase,
        (_: RootState, payload: { entityName: EntityKeys; options?: UnifiedQueryOptions<EntityKeys> }) => payload.entityName,
        (_: RootState, payload: { entityName: EntityKeys; options?: UnifiedQueryOptions<EntityKeys> }) => payload.options,
    ],
    (databaseTableName, mainFieldMap, entityNameToDatabase, fieldNameToDatabase, entityName, options) => {
        if (!options) {
            return undefined;
        }

        const processJoinTables = (
            joins?: Array<{
                table: string;
                on: string;
                columns?: Array<string>;
            }>
        ) => {
            if (!joins) return undefined;

            return joins.map((join) => {
                const joinedTableName = entityNameToDatabase[join.table] || join.table;
                const joinedTableFieldMap = fieldNameToDatabase[join.table] || {};

                return {
                    table: joinedTableName,
                    on: Object.entries(joinedTableFieldMap).reduce<string>(
                        (clause: string, [key, value]: [string, string]) => clause.replace(new RegExp(`\\b${key}\\b`, 'g'), value),
                        join.on
                    ),
                    ...(join.columns && {
                        columns: join.columns.map((column) => joinedTableFieldMap[column] || column),
                    }),
                };
            });
        };

        const processFullTextSearch = (fts?: { column: string; query: string }) => {
            if (!fts) return undefined;
            return {
                column: mainFieldMap[fts.column] || fts.column,
                query: fts.query,
            };
        };

        const result: UnifiedQueryOptions<typeof entityName> = {
            tableName: databaseTableName as typeof entityName,

            ...(options.filters && {
                filters: selectReplaceKeysInObject({} as RootState, options.filters, mainFieldMap) as Partial<Record<string, any>>,
            }),

            ...(options.sorts && {
                sorts: options.sorts.map((sort) => ({
                    column: mainFieldMap[sort.column] || sort.column,
                    ascending: sort.ascending,
                })),
            }),

            ...(options.columns && {
                columns: options.columns.map((column) => mainFieldMap[column] || column),
            }),

            ...(typeof options.limit !== 'undefined' && { limit: options.limit }),
            ...(typeof options.offset !== 'undefined' && { offset: options.offset }),
            ...(typeof options.distinct !== 'undefined' && { distinct: options.distinct }),
            ...(options.range && { range: options.range }),

            ...(options.fullTextSearch && {
                fullTextSearch: processFullTextSearch(options.fullTextSearch),
            }),

            ...(options.joinTables && {
                joinTables: processJoinTables(options.joinTables),
            }),

            ...(options.groupBy && {
                groupBy: options.groupBy.map((field) => mainFieldMap[field] || field),
            }),

            ...(options.having && {
                having: selectReplaceKeysInObject({} as RootState, options.having, mainFieldMap) as Partial<Record<string, any>>,
            }),

            ...(options.upsertConflictColumns && {
                upsertConflictColumns: options.upsertConflictColumns.map((column) => mainFieldMap[column] || column),
            }),
        };

        return result;
    }
);

