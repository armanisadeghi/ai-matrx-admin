// lib\redux\selectors\schemaSelectors.ts

import { RootState } from "@/lib/redux/store";
import { GlobalCacheState, SchemaEntity, SchemaField } from "@/types/schema";
import { createSelector } from "reselect";
import { useSelector } from "react-redux";
import { EntityKeys } from "@/types/entityTypes";
import { useMemo } from "react";
import { QueryOptions } from "@/utils/supabase/api-wrapper";

// Base selector
const selectGlobalCache = (state: RootState): GlobalCacheState => state.globalCache;

// Basic state selectors
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

// Format Maps
export const selectEntityFormats = createSelector(
  [selectGlobalCache],
  (cache) => cache.entityNameFormats
);

export const selectFieldFormats = createSelector(
  [selectGlobalCache],
  (cache) => cache.fieldNameFormats
);

// Optimized conversion maps for common formats
export const selectCommonFormatMaps = createSelector(
  [selectGlobalCache],
  (cache) => ({
    entityToDatabase: cache.entityNameToDatabase,
    entityToBackend: cache.entityNameToBackend,
    entityToCanonical: cache.entityNameToCanonical,
    fieldToDatabase: cache.fieldNameToDatabase,
    fieldToBackend: cache.fieldNameToBackend,
    fieldToCanonical: cache.fieldNameToCanonical
  })
);

// Generic format conversion selectors
export const makeSelectEntityFormat = () =>
  createSelector(
    [
      selectEntityFormats,
      selectCommonFormatMaps,
      (_: RootState, params: { entityName: EntityKeys; format: string }) => params
    ],
    (formats, commonMaps, { entityName, format }) => {
      // Check common formats first for optimized path
      switch (format) {
        case 'database':
          return commonMaps.entityToDatabase[entityName];
        case 'backend':
          return commonMaps.entityToBackend[entityName];
        case 'frontend':
        case 'canonical':
          return commonMaps.entityToCanonical[entityName];
        default:
          // Fall back to generic format conversion
          return formats[entityName]?.[format];
      }
    }
  );

export const makeSelectFieldFormat = () =>
  createSelector(
    [
      selectFieldFormats,
      selectCommonFormatMaps,
      (_: RootState, params: { entityName: EntityKeys; fieldName: string; format: string }) => params
    ],
    (formats, commonMaps, { entityName, fieldName, format }) => {
      // Check common formats first for optimized path
      switch (format) {
        case 'database':
          return commonMaps.fieldToDatabase[entityName]?.[fieldName];
        case 'backend':
          return commonMaps.fieldToBackend[entityName]?.[fieldName];
        case 'frontend':
        case 'canonical':
          return commonMaps.fieldToCanonical[entityName]?.[fieldName];
        default:
          // Fall back to generic format conversion
          return formats[entityName]?.[fieldName]?.[format];
      }
    }
  );

// Optimized selectors for common conversions
export const makeSelectEntityToDatabase = () =>
  createSelector(
    [selectCommonFormatMaps, (_: RootState, entityName: EntityKeys) => entityName],
    (maps, entityName) => maps.entityToDatabase[entityName]
  );

export const makeSelectEntityToBackend = () =>
  createSelector(
    [selectCommonFormatMaps, (_: RootState, entityName: EntityKeys) => entityName],
    (maps, entityName) => maps.entityToBackend[entityName]
  );

export const makeSelectEntityToFrontend = () =>
  createSelector(
    [selectCommonFormatMaps, (_: RootState, entityName: EntityKeys) => entityName],
    (maps, entityName) => maps.entityToCanonical[entityName]
  );

export const makeSelectFieldToDatabase = () =>
  createSelector(
    [
      selectCommonFormatMaps,
      (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params
    ],
    (maps, { entityName, fieldName }) => maps.fieldToDatabase[entityName]?.[fieldName]
  );

export const makeSelectFieldToBackend = () =>
  createSelector(
    [
      selectCommonFormatMaps,
      (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params
    ],
    (maps, { entityName, fieldName }) => maps.fieldToBackend[entityName]?.[fieldName]
  );

export const makeSelectFieldToFrontend = () =>
  createSelector(
    [
      selectCommonFormatMaps,
      (_: RootState, params: { entityName: EntityKeys; fieldName: string }) => params
    ],
    (maps, { entityName, fieldName }) => maps.fieldToCanonical[entityName]?.[fieldName]
  );

// Query conversion selectors
export const makeQueryOptionsConversion = () =>
  createSelector(
    [
      selectCommonFormatMaps,
      (_: RootState, params: { entityName: EntityKeys; options: QueryOptions<any>; format: string }) => params
    ],
    (maps, { entityName, options, format }) => {
      if (!options) return options;

      let fieldMap: Record<string, string> | undefined;
      
      // Use optimized paths for common formats
      switch (format) {
        case 'database':
          fieldMap = maps.fieldToDatabase[entityName];
          break;
        case 'backend':
          fieldMap = maps.fieldToBackend[entityName];
          break;
        case 'frontend':
        case 'canonical':
          fieldMap = maps.fieldToCanonical[entityName];
          break;
        default:
          // For custom formats, we'd need to implement a more complex mapping logic
          // that uses the fieldNameFormats structure
          return options;
      }

      if (!fieldMap) return options;

      return {
        ...options,
        filters: options.filters
          ? Object.entries(options.filters).reduce((acc, [key, value]) => ({
              ...acc,
              [fieldMap?.[key] || key]: value
            }), {})
          : undefined,
        sorts: options.sorts?.map(sort => ({
          ...sort,
          column: fieldMap?.[sort.column] || sort.column
        })),
        columns: options.columns?.map(
          column => fieldMap?.[column] || column
        )
      };
    }
  );

// Utility hooks for common conversions
export const useEntityToDatabase = (entityName: EntityKeys) => {
  const select = useMemo(makeSelectEntityToDatabase, []);
  return useSelector(state => select(state, entityName));
};

export const useEntityToBackend = (entityName: EntityKeys) => {
  const select = useMemo(makeSelectEntityToBackend, []);
  return useSelector(state => select(state, entityName));
};

export const useEntityToFrontend = (entityName: EntityKeys) => {
  const select = useMemo(makeSelectEntityToFrontend, []);
  return useSelector(state => select(state, entityName));
};

export const useFieldToDatabase = (entityName: EntityKeys, fieldName: string) => {
  const select = useMemo(makeSelectFieldToDatabase, []);
  return useSelector(state => select(state, { entityName, fieldName }));
};

export const useFieldToBackend = (entityName: EntityKeys, fieldName: string) => {
  const select = useMemo(makeSelectFieldToBackend, []);
  return useSelector(state => select(state, { entityName, fieldName }));
};

export const useFieldToFrontend = (entityName: EntityKeys, fieldName: string) => {
  const select = useMemo(makeSelectFieldToFrontend, []);
  return useSelector(state => select(state, { entityName, fieldName }));
};

// Generic format conversion hooks
export const useEntityFormat = (entityName: EntityKeys, format: string) => {
  const select = useMemo(makeSelectEntityFormat, []);
  return useSelector(state => select(state, { entityName, format }));
};

export const useFieldFormat = (entityName: EntityKeys, fieldName: string, format: string) => {
  const select = useMemo(makeSelectFieldFormat, []);
  return useSelector(state => select(state, { entityName, fieldName, format }));
};






// previous implementation 


export const selectAllEntities = (state: RootState) =>
  state.globalCache.entities;

export const selectAllFields = (state: RootState) => state.globalCache.fields;

export const selectAllFieldsByEntity = (state: RootState) =>
  state.globalCache.fieldsByEntity;

// Single entity/field selectors
export const selectEntity = (state: RootState, entityName: EntityKeys) =>
  state.globalCache.entities[entityName];

export const selectEntityFields = (state: RootState, entityName: EntityKeys) =>
  state.globalCache.fieldsByEntity[entityName] || [];

export const selectField = (
  state: RootState,
  entityName: EntityKeys,
  fieldName: string
) => {
  const fieldId = `${entityName}__${fieldName}`;
  return state.globalCache.fields[fieldId];
};

// Entity name conversions
export const selectEntityDatabaseName = (
  state: RootState,
  entityName: EntityKeys
) => state.globalCache.entityNameToDatabase[entityName];

export const selectEntityBackendName = (
  state: RootState,
  entityName: EntityKeys
) => state.globalCache.entityNameToBackend[entityName];

export const selectEntityCanonicalName = (
  state: RootState,
  entityName: EntityKeys
) => state.globalCache.entityNameToCanonical[entityName];

// Format selectors for entities
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
  (fields) => fields.find((field) => field.isPrimaryKey)
);

export const selectDisplayField = createSelector(
  [selectEntityFields],
  (fields) => fields.find((field) => field.isDisplayField)
);

// Relationship selectors
export const selectEntityRelationships = (
  state: RootState,
  entityName: EntityNameOfficial
) => state.globalCache.entities[entityName]?.relationships || [];

export const selectRelatedEntities = createSelector(
  [selectEntity, selectEntityNames],
  (entity, allEntityNames) => {
    if (!entity?.relationships) return [];
    return entity.relationships.map((rel) => ({
      ...rel,
      relatedEntity: allEntityNames.find((name) => name === rel.relatedTable),
    }));
  }
);

// Utility selectors
export const selectEntityPrimaryKey = (state: RootState, entityName: string) =>
  state.globalCache.fields[entityName]?.find((field) => field.isPrimaryKey);

export const selectEntityDisplayField = (
  state: RootState,
  entityName: string
) =>
  state.globalCache.fields[entityName]?.find((field) => field.isDisplayField);

// Basic selectors to get mappings
const selectFieldMappingsForEntity = (
  state: RootState,
  entityName: EntityKeys
) => ({
  dbToCanonical: state.globalCache.fieldNameToCanonical[entityName] || {},
  canonicalToDb: state.globalCache.fieldNameToDatabase[entityName] || {},
});

// Create memoized selectors for basic conversions
export const makeDbToCanonicalSelector = () =>
  createSelector(
    [
      selectFieldMappingsForEntity,
      (_state: RootState, _entityName: EntityKeys, data: any) => data,
    ],
    (mappings, data) => replaceKeysInObject(data, mappings.dbToCanonical)
  );

export const makeCanonicalToDbSelector = () =>
  createSelector(
    [
      selectFieldMappingsForEntity,
      (_state: RootState, _entityName: EntityKeys, data: any) => data,
    ],
    (mappings, data) => replaceKeysInObject(data, mappings.canonicalToDb)
  );

// Specialized selector for QueryOptions conversion
export const makeQueryOptionsToDbSelector = () =>
  createSelector(
    [
      selectFieldMappingsForEntity,
      (
        _state: RootState,
        _entityName: EntityKeys,
        options: QueryOptions<any>
      ) => options,
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
        sorts: options.sorts?.map((sort) => ({
          ...sort,
          column: mappings.canonicalToDb[sort.column] || sort.column,
        })),
        // Convert selected columns
        columns: options.columns?.map(
          (column) => mappings.canonicalToDb[column] || column
        ),
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
    options: convertedOptions,
  };
};

export const selectFrontendConversion = (state: RootState, response: any) => {
  if (!response?.entityName) return response;

  const convertToCanonical = makeDbToCanonicalSelector();
  return convertToCanonical(
    state,
    response.entityName,
    response.data || response
  );
};

export const makeEntityNamesToDatabaseSelector = () =>
  createSelector(
    [
      (state: RootState) => state.globalCache.entityNameToDatabase,
      (_state: RootState, entityNames: EntityKeys[]) => entityNames,
    ],
    (mapping, entityNames) => entityNames.map((name) => mapping[name])
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
export const getEntityFormats = (state: RootState) =>
  state.schema.entityNameFormats;
export const getFieldFormats = (state: RootState) =>
  state.schema.fieldNameFormats;
export const isSchemaInitialized = (state: RootState) =>
  state.schema.isInitialized;

// Entity Name to Canonical Conversion Selector (Single Value)
export const selectValueVariationToEntityName = (state: RootState) => {
  const keyMapping = state.schema.entityNameToCanonical;
  if (!keyMapping) return null;

  return (data: string) => replaceKeysInString(data, keyMapping);
};

// Field Name to Canonical Conversion Selector (Single Value)
export const selectValueVariationToEntityFieldName = (
  state: RootState,
  entityName: string
) => {
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

export const selectObjectVariationToEntityFieldNames = (
  state: RootState,
  entityName: string
) => {
  const keyMapping = state.schema.fieldNameToCanonical?.[entityName];
  if (!keyMapping) return null;

  return <T extends Record<string, any>>(data: T | T[]) =>
    replaceKeysInObject(data, keyMapping);
};

export const selectValueToEntityVariation = (
  state: RootState,
  format: string
) => {
  const formatMap = selectEntityNameFormatMap(state, format);
  if (!formatMap) return null;

  return (data: string) => replaceKeysInString(data, formatMap);
};

export const selectValueToFieldVariation = (
  state: RootState,
  entityName: string,
  format: string
) => {
  const formatMap = selectFieldNameFormatMap(state, entityName, format);
  if (!formatMap) return null;

  return (data: string) => replaceKeysInString(data, formatMap);
};

export const selectConvertEntityNameFormat = (
  state: RootState,
  format: string
) => {
  const formatMap = selectEntityNameFormatMap(state, format);
  if (!formatMap) return null;

  return <T extends Record<string, any>>(data: T | T[]) =>
    replaceKeysInObject(data, formatMap);
};

// 5. Field Name Format Map Selector
export const selectFieldNameFormatMap = (
  state: RootState,
  entityName: string,
  format: string
): KeyMapping | null => {
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
export const selectConvertFieldNameFormat = (
  state: RootState,
  entityName: string,
  format: string
) => {
  const formatMap = selectFieldNameFormatMap(state, entityName, format);
  if (!formatMap) return null;

  return <T extends Record<string, any>>(data: T | T[]) =>
    replaceKeysInObject(data, formatMap);
};

export const selectEntityNameFormatMap = (
  state: RootState,
  format: string
): KeyMapping | null => {
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
    const regex = new RegExp(key, "g");
    return acc.replace(regex, keyMapping[key]);
  }, data);
}

// Converts data to the 'database' format for both entities and fields
export function toDatabaseFormat<T extends Record<string, any>>(
  state: RootState,
  entityName: string,
  data: T | T[]
): T | T[] {
  const convertEntityName = selectConvertEntityNameFormat(state, "database");
  const convertFieldName = selectConvertFieldNameFormat(
    state,
    entityName,
    "database"
  );

  let convertedData = data;
  if (convertEntityName) convertedData = convertEntityName(convertedData);
  if (convertFieldName) convertedData = convertFieldName(convertedData);

  return convertedData;
}

// Converts data to the 'frontend' format for both entities and fields, using canonical names
export function toFrontendFormat<T extends Record<string, any>>(
  state: RootState,
  entityName: string,
  data: T | T[]
): T | T[] {
  const convertEntityName = selectObjectVariationToEntityNames(state);
  const convertFieldName = selectObjectVariationToEntityFieldNames(
    state,
    entityName
  );

  let convertedData = data;
  if (convertEntityName) convertedData = convertEntityName(convertedData);
  if (convertFieldName) convertedData = convertFieldName(convertedData);

  return convertedData;
}

// Converts data to the 'pretty' format for both entities and fields
export function toPrettyFormat<T extends Record<string, any>>(
  state: RootState,
  entityName: string,
  data: T | T[]
): T | T[] {
  const convertEntityName = selectConvertEntityNameFormat(state, "pretty");
  const convertFieldName = selectConvertFieldNameFormat(
    state,
    entityName,
    "pretty"
  );

  let convertedData = data;
  if (convertEntityName) convertedData = convertEntityName(convertedData);
  if (convertFieldName) convertedData = convertFieldName(convertedData);

  return convertedData;
}

// Converts data to the 'sqlFunctionRef' format for both entities and fields
export function toSqlFunctionRefFormat<T extends Record<string, any>>(
  state: RootState,
  entityName: string,
  data: T | T[]
): T | T[] {
  const convertEntityName = selectConvertEntityNameFormat(
    state,
    "sqlFunctionRef"
  );
  const convertFieldName = selectConvertFieldNameFormat(
    state,
    entityName,
    "sqlFunctionRef"
  );

  let convertedData = data;
  if (convertEntityName) convertedData = convertEntityName(convertedData);
  if (convertFieldName) convertedData = convertFieldName(convertedData);

  return convertedData;
}
