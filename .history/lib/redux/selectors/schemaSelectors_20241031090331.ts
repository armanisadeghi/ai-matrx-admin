import {RootState} from "@/lib/redux/store";
import { GlobalCacheState, SchemaEntity, SchemaField } from "@/types/schema";
import {createSelector} from "reselect";
import {useSelector} from "react-redux";
import { EntityKeys } from '@/types/entityTypes';
import {useMemo} from "react";
import {QueryOptions} from "@/utils/supabase/api-wrapper";


const selectGlobalCache = (state: RootState): GlobalCacheState => state.globalCache;

export const selectSchema = createSelector(
  [selectGlobalCache],
  (cache) => cache.schema
);

export const selectEntityNames = createSelector(
  [selectGlobalCache],
  (cache) => cache.entityNames
);

export const selectEntities = createSelector(
  [selectGlobalCache],
  (cache) => cache.entities
);

export const selectFields = createSelector(
  [selectGlobalCache],
  (cache) => cache.fields
);

export const selectFieldsByEntity = createSelector(
  [selectGlobalCache],
  (cache) => cache.fieldsByEntity
);

export const selectIsInitialized = createSelector(
  [selectGlobalCache],
  (cache) => cache.isInitialized
);

export const makeSelectEntity = () =>
    createSelector(
      [selectEntities, (_: RootState, entityName: EntityKeys) => entityName],
      (entities, entityName): SchemaEntity | undefined => entities[entityName]
    );

  export const makeSelectEntityFields = () =>
    createSelector(
      [
        selectFields,
        selectFieldsByEntity,
        (_: RootState, entityName: EntityKeys) => entityName
      ],
      (fields, fieldsByEntity, entityName): SchemaField[] => {
        const fieldIds = fieldsByEntity[entityName] || [];
        return fieldIds.map(id => fields[id]).filter(Boolean);  // make sure this 'id' isn't an actual id field.
      }
    );

    export const selectEntityNameMaps = createSelector(
        [selectGlobalCache],
        (cache) => ({
          toDatabase: cache.entityNameToDatabase,
          toBackend: cache.entityNameToBackend,
          toCanonical: cache.entityNameToCanonical
        })
      );

      export const makeSelectEntityNameConversion = () =>
        createSelector(
          [
            selectEntityNameMaps,
            (_: RootState, entityName: EntityKeys, targetFormat: 'database' | 'backend' | 'canonical') => ({
              entityName,
              targetFormat
            })
          ],
          (maps, { entityName, targetFormat }) => {
            switch (targetFormat) {
              case 'database':
                return maps.toDatabase[entityName];
              case 'backend':
                return maps.toBackend[entityName];
              case 'canonical':
                return maps.toCanonical[entityName];
              default:
                return entityName;
            }
          }
        );



export const selectAllEntities = (state: RootState) =>
    state.globalCache.entities;

export const selectAllFields = (state: RootState) =>
    state.globalCache.fields;

export const selectAllFieldsByEntity = (state: RootState) =>
    state.globalCache.fieldsByEntity;

// Single entity/field selectors
export const selectEntity = (state: RootState, entityName: EntityKeys) =>
    state.globalCache.entities[entityName];

export const selectEntityFields = (state: RootState, entityName: EntityKeys) =>
    state.globalCache.fieldsByEntity[entityName] || [];

export const selectField = (state: RootState, entityName: EntityKeys, fieldName: string) => {
    const fieldId = `${entityName}__${fieldName}`;
    return state.globalCache.fields[fieldId];
};

// Entity name conversions
export const selectEntityDatabaseName = (state: RootState, entityName: EntityKeys) =>
    state.globalCache.entityNameToDatabase[entityName];

export const selectEntityBackendName = (state: RootState, entityName: EntityKeys) =>
    state.globalCache.entityNameToBackend[entityName];

export const selectEntityCanonicalName = (state: RootState, entityName: EntityKeys) =>
    state.globalCache.entityNameToCanonical[entityName];

// Format selectors for applets
export const selectEntityFormat = (
    state: RootState,
    entityName: EntityKeys,
    format: string
) => state.globalCache.entityNameFormats[entityName]?.[format];


// Field name conversions (require both entity and field name)
export const selectFieldDatabaseName = (
    state: RootState,
    entityName: EntityKeys,
    fieldName: string
) => state.globalCache.fieldNameToDatabase[entityName]?.[fieldName];

export const selectFieldBackendName = (
    state: RootState,
    entityName: EntityKeys,
    fieldName: string
) => state.globalCache.fieldNameToBackend[entityName]?.[fieldName];

export const selectFieldCanonicalName = (
    state: RootState,
    entityName: EntityKeys,
    fieldName: string
) => state.globalCache.fieldNameToCanonical[entityName]?.[fieldName];

// Field format selector
export const selectFieldFormat = (
    state: RootState,
    entityName: EntityKeys,
    fieldName: string,
    format: string
) => state.globalCache.fieldNameFormats[entityName]?.[fieldName]?.[format];

// Field type selectors
export const selectPrimaryKeyField = createSelector(
    [selectEntityFields],
    (fields) => fields.find(field => field.isPrimaryKey)
);

export const selectDisplayField = createSelector(
    [selectEntityFields],
    (fields) => fields.find(field => field.isDisplayField)
);









// Relationship selectors
export const selectEntityRelationships = (state: RootState, entityName: EntityNameOfficial) =>
    state.globalCache.entities[entityName]?.relationships || [];

export const selectRelatedEntities = createSelector(
    [selectEntity, selectEntityNames],
    (entity, allEntityNames) => {
        if (!entity?.relationships) return [];
        return entity.relationships.map(rel => ({
            ...rel,
            relatedEntity: allEntityNames.find(name => name === rel.relatedTable)
        }));
    }
);


// Utility selectors
export const selectEntityPrimaryKey = (state: RootState, entityName: string) =>
    state.globalCache.fields[entityName]?.find(field => field.isPrimaryKey);

export const selectEntityDisplayField = (state: RootState, entityName: string) =>
    state.globalCache.fields[entityName]?.find(field => field.isDisplayField);



// Basic selectors to get mappings
const selectFieldMappingsForEntity = (state: RootState, entityName: EntityKeys) => ({
    dbToCanonical: state.globalCache.fieldNameToCanonical[entityName] || {},
    canonicalToDb: state.globalCache.fieldNameToDatabase[entityName] || {}
});

// Create memoized selectors for basic conversions
export const makeDbToCanonicalSelector = () =>
    createSelector(
        [
            selectFieldMappingsForEntity,
            (_state: RootState, _entityName: EntityKeys, data: any) => data
        ],
        (mappings, data) => replaceKeysInObject(data, mappings.dbToCanonical)
    );

export const makeCanonicalToDbSelector = () =>
    createSelector(
        [
            selectFieldMappingsForEntity,
            (_state: RootState, _entityName: EntityKeys, data: any) => data
        ],
        (mappings, data) => replaceKeysInObject(data, mappings.canonicalToDb)
    );

// Specialized selector for QueryOptions conversion
export const makeQueryOptionsToDbSelector = () =>
    createSelector(
        [
            selectFieldMappingsForEntity,
            (_state: RootState, _entityName: EntityKeys, options: QueryOptions<any>) => options
        ],
        (mappings, options) => {
            if (!options) return options;

            return {
                ...options,
                // Convert filter fields
                filters: options.filters
                         ? replaceKeysInObject(options.filters, mappings.canonicalToDb)
                         : undefined,
                // Convert sort columns
                sorts: options.sorts?.map(sort => ({
                    ...sort,
                    column: mappings.canonicalToDb[sort.column] || sort.column
                })),
                // Convert selected columns
                columns: options.columns?.map(
                    column => mappings.canonicalToDb[column] || column
                )
            };
        }
    );

// Convenience hooks for use in components
export const useDbToCanonical = <T>(entityName: EntityKeys, data: T) => {
    const convertToCanonical = useMemo(makeDbToCanonicalSelector, []);
    return useSelector((state: RootState) =>
        convertToCanonical(state, entityName, data)
    );
};

export const useCanonicalToDb = <T>(entityName: EntityKeys, data: T) => {
    const convertToDb = useMemo(makeCanonicalToDbSelector, []);
    return useSelector((state: RootState) =>
        convertToDb(state, entityName, data)
    );
};

// Saga-specific selectors
export const selectDatabaseConversion = (state: RootState, payload: any) => {
    const { entityName, options } = payload;
    if (!options) return payload;

    const convertToDb = makeQueryOptionsToDbSelector();
    const convertedOptions = convertToDb(state, entityName, options);

    return {
        ...payload,
        options: convertedOptions
    };
};

export const selectFrontendConversion = (state: RootState, response: any) => {
    if (!response?.entityName) return response;

    const convertToCanonical = makeDbToCanonicalSelector();
    return convertToCanonical(state, response.entityName, response.data || response);
};




export const makeEntityNamesToDatabaseSelector = () =>
    createSelector(
        [
            (state: RootState) => state.globalCache.entityNameToDatabase,
            (_state: RootState, entityNames: EntityKeys[]) => entityNames
        ],
        (mapping, entityNames) =>
            entityNames.map(name => mapping[name])
    );



/*
// Usage examples:
// Single name:
const dbName = useEntityDatabaseName('userPreferences');  // returns 'user_preferences'

// Multiple names:
const dbNames = useEntityDatabaseNames(['userPreferences', 'registeredFunction']);
*/





/*
Available Selectors and Their Usage

selectConvertObjectToEntityName: Converts entity names to their canonical form based on entityNameToCanonical in your Redux state.
selectConvertFieldNames: Converts field names to their canonical form for a specific entity based on fieldNameToCanonical.
selectConvertEntityNameFormat: Converts entity names to a specified format (e.g., frontend, backend, etc.).
selectConvertFieldNameFormat: Converts field names to a specified format for a specific entity.
getSchema: Retrieves the automation schema from your Redux state.
isSchemaInitialized: Checks if the schema is initialized in your Redux state.
 */

export const getSchema = (state: RootState) => state.schema.automationSchema;
export const getEntityFormats = (state: RootState) => state.schema.entityNameFormats;
export const getFieldFormats = (state: RootState) => state.schema.fieldNameFormats;
export const isSchemaInitialized = (state: RootState) => state.schema.isInitialized;




// Entity Name to Canonical Conversion Selector (Single Value)
export const selectValueVariationToEntityName = (state: RootState) => {
    const keyMapping = state.schema.entityNameToCanonical;
    if (!keyMapping) return null;

    return (data: string) => replaceKeysInString(data, keyMapping);
};

// Field Name to Canonical Conversion Selector (Single Value)
export const selectValueVariationToEntityFieldName = (state: RootState, entityName: string) => {
    const keyMapping = state.schema.fieldNameToCanonical?.[entityName];
    if (!keyMapping) return null;

    return (data: string) => replaceKeysInString(data, keyMapping);
};



export const selectObjectVariationToEntityNames = (state: RootState) => {
    const keyMapping = state.schema.entityNameToCanonical;
    if (!keyMapping) return null;

    return <T extends Record<string, any>>(data: T | T[]) =>
        replaceKeysInObject(data, keyMapping);
};


export const selectObjectVariationToEntityFieldNames = (state: RootState, entityName: string) => {
    const keyMapping = state.schema.fieldNameToCanonical?.[entityName];
    if (!keyMapping) return null;

    return <T extends Record<string, any>>(data: T | T[]) =>
        replaceKeysInObject(data, keyMapping);
};


export const selectValueToEntityVariation = (state: RootState, format: string) => {
    const formatMap = selectEntityNameFormatMap(state, format);
    if (!formatMap) return null;

    return (data: string) => replaceKeysInString(data, formatMap);
};

export const selectValueToFieldVariation = (state: RootState, entityName: string, format: string) => {
    const formatMap = selectFieldNameFormatMap(state, entityName, format);
    if (!formatMap) return null;

    return (data: string) => replaceKeysInString(data, formatMap);
};



export const selectConvertEntityNameFormat = (state: RootState, format: string) => {
    const formatMap = selectEntityNameFormatMap(state, format);
    if (!formatMap) return null;

    return <T extends Record<string, any>>(data: T | T[]) =>
        replaceKeysInObject(data, formatMap);
};

// 5. Field Name Format Map Selector
export const selectFieldNameFormatMap = (state: RootState, entityName: string, format: string): KeyMapping | null => {
    const fieldFormats = state.schema.fieldNameFormats?.[entityName];
    if (!fieldFormats) return null;

    const formatMap: KeyMapping = {};
    Object.entries(fieldFormats).forEach(([canonicalField, formats]) => {
        if (formats[format]) {
            formatMap[canonicalField] = formats[format];
        }
    });
    return formatMap;
};

// 6. Convert Field Name Format Selector
export const selectConvertFieldNameFormat = (state: RootState, entityName: string, format: string) => {
    const formatMap = selectFieldNameFormatMap(state, entityName, format);
    if (!formatMap) return null;

    return <T extends Record<string, any>>(data: T | T[]) =>
        replaceKeysInObject(data, formatMap);
};

export const selectEntityNameFormatMap = (state: RootState, format: string): KeyMapping | null => {
    const entityNameFormats = state.schema.entityNameFormats;
    if (!entityNameFormats) return null;

    const formatMap: KeyMapping = {};
    Object.entries(entityNameFormats).forEach(([canonicalName, formats]) => {
        if (formats[format]) {
            formatMap[canonicalName] = formats[format];
        }
    });
    return formatMap;
};

type KeyMapping = { [oldKey: string]: string };


function replaceKeysInObject<T extends Record<string, any>>(
    data: T | T[],
    keyMapping: KeyMapping
): T | T[] {
    const replaceKeys = (obj: T): T => {
        return Object.keys(obj).reduce((acc, key) => {
            const newKey = keyMapping[key] || key;
            (acc as Record<string, any>)[newKey] = obj[key];
            return acc;
        }, {} as T);
    };

    if (Array.isArray(data)) {
        return data.map(replaceKeys);
    }

    return replaceKeys(data);
}

function replaceKeysInString(data: string, keyMapping: KeyMapping): string {
    return Object.keys(keyMapping).reduce((acc, key) => {
        const regex = new RegExp(key, 'g');
        return acc.replace(regex, keyMapping[key]);
    }, data);
}


// Converts data to the 'database' format for both applets and fields
export function toDatabaseFormat<T extends Record<string, any>>(state: RootState, entityName: string, data: T | T[]): T | T[] {
    const convertEntityName = selectConvertEntityNameFormat(state, "database");
    const convertFieldName = selectConvertFieldNameFormat(state, entityName, "database");

    let convertedData = data;
    if (convertEntityName) convertedData = convertEntityName(convertedData);
    if (convertFieldName) convertedData = convertFieldName(convertedData);

    return convertedData;
}

// Converts data to the 'frontend' format for both applets and fields, using canonical names
export function toFrontendFormat<T extends Record<string, any>>(state: RootState, entityName: string, data: T | T[]): T | T[] {
    const convertEntityName = selectObjectVariationToEntityNames(state);
    const convertFieldName = selectObjectVariationToEntityFieldNames(state, entityName);

    let convertedData = data;
    if (convertEntityName) convertedData = convertEntityName(convertedData);
    if (convertFieldName) convertedData = convertFieldName(convertedData);

    return convertedData;
}

// Converts data to the 'pretty' format for both applets and fields
export function toPrettyFormat<T extends Record<string, any>>(state: RootState, entityName: string, data: T | T[]): T | T[] {
    const convertEntityName = selectConvertEntityNameFormat(state, "pretty");
    const convertFieldName = selectConvertFieldNameFormat(state, entityName, "pretty");

    let convertedData = data;
    if (convertEntityName) convertedData = convertEntityName(convertedData);
    if (convertFieldName) convertedData = convertFieldName(convertedData);

    return convertedData;
}

// Converts data to the 'sqlFunctionRef' format for both applets and fields
export function toSqlFunctionRefFormat<T extends Record<string, any>>(state: RootState, entityName: string, data: T | T[]): T | T[] {
    const convertEntityName = selectConvertEntityNameFormat(state, "sqlFunctionRef");
    const convertFieldName = selectConvertFieldNameFormat(state, entityName, "sqlFunctionRef");

    let convertedData = data;
    if (convertEntityName) convertedData = convertEntityName(convertedData);
    if (convertFieldName) convertedData = convertFieldName(convertedData);

    return convertedData;
}
