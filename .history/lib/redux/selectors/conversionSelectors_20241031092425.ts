// lib/redux/selectors/conversionSelectors.ts
import { RootState } from "@/lib/redux/store";
import { createSelector } from "@reduxjs/toolkit";
import { EntityKeys, EntityRecord, EntityFieldKeys } from "@/types/entityTypes";
import { QueryOptions } from "@/utils/supabase/api-wrapper";
import { select } from "@nextui-org/theme";
import { useAppSelector } from "../hooks";

// Type for the conversion maps
type ConversionMaps = {
  entityToDatabase: Record<EntityKeys, string>;
  entityToBackend: Record<EntityKeys, string>;
  entityToCanonical: Record<EntityKeys, string>;
  fieldToDatabase: Record<EntityKeys, Record<string, string>>;
  fieldToBackend: Record<EntityKeys, Record<string, string>>;
  fieldToCanonical: Record<EntityKeys, Record<string, string>>;
};

// Selector to get all conversion maps
const selectConversionMaps = (state: RootState): ConversionMaps => ({
  entityToDatabase: state.globalCache.entityNameToDatabase,
  entityToBackend: state.globalCache.entityNameToBackend,
  entityToCanonical: state.globalCache.entityNameToCanonical,
  fieldToDatabase: state.globalCache.fieldNameToDatabase,
  fieldToBackend: state.globalCache.fieldNameToBackend,
  fieldToCanonical: state.globalCache.fieldNameToCanonical,
});

// Selector for database name conversion
export const selectEntityDatabaseName = createSelector(
  [selectConversionMaps, (_: RootState, entityKey: EntityKeys) => entityKey],
  (maps, entityKey): string => maps.entityToDatabase[entityKey] || entityKey
);

// Selector for converting query options to database format
export const selectDatabaseConversion = createSelector(
  [
    selectConversionMaps,
    (_: RootState, payload: { entityName: EntityKeys; options?: QueryOptions<any> }) => payload
  ],
  (maps, payload): QueryOptions<any> => {
    const { entityName, options } = payload;
    if (!options) return {};

    const fieldMap = maps.fieldToDatabase[entityName] || {};

    return {
      ...options,
      filters: options.filters
        ? Object.entries(options.filters).reduce<Record<string, any>>((acc, [key, value]) => ({
            ...acc,
            [fieldMap[key] || key]: value
          }), {})
        : undefined,
      sorts: options.sorts?.map(sort => ({
        column: fieldMap[sort.column] || sort.column,
        ascending: sort.ascending
      })),
      columns: options.columns?.map(field => fieldMap[field] || field),
      limit: options.limit,
      offset: options.offset
    };
  }
);

// Frontend conversion selector (uses canonical)
export const selectFrontendConversion = createSelector(
  [
    selectConversionMaps,
    (_: RootState, payload: { entityName: EntityKeys; data: any }) => payload
  ],
  (maps, { entityName, data }) => {
    if (!data) return data;

    const fieldMap = maps.fieldToCanonical[entityName] || {};
    
    // If data is an array, convert each item
    if (Array.isArray(data)) {
      return data.map(item => convertObjectFields(item, fieldMap));
    }
    
    // Otherwise convert single object
    return convertObjectFields(data, fieldMap);
  }
);

// Helper function to convert object fields
function convertObjectFields(
  obj: Record<string, any>,
  fieldMap: Record<string, string>
): Record<string, any> {
  return Object.entries(obj).reduce<Record<string, any>>((acc, [key, value]) => {
    const convertedKey = fieldMap[key] || key;
    acc[convertedKey] = value;
    return acc;
  }, {});
}

// Hooks for use in components
export const useEntityDatabaseName = (entityKey: EntityKeys) => {
  return useAppSelector((state: RootState) => selectEntityDatabaseName(state, entityKey));
};

export const useFieldDatabaseName = (entityKey: EntityKeys, fieldKey: EntityFieldKeys<typeof entityKey>) => {
  return useAppSelector((state: RootState) => 
    state.globalCache.fieldNameToDatabase[entityKey]?.[fieldKey] || fieldKey
  );
};

// Saga helper function
export function* convertQuery<TEntity extends EntityKeys>(
  entityKey: TEntity,
  options?: QueryOptions<TEntity>
): Generator<any, QueryOptions<TEntity>, any> {
  if (!options) return {};

  const conversion = yield select(selectDatabaseConversion, {
    entityName: entityKey,
    options
  });

  return conversion;
}

