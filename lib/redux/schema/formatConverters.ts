// lib/redux/schema/formatConverters.ts
import { RootState } from "@/lib/redux/store";
import { EntityKeys, FieldDatabaseColumn } from "@/types/entityTypes";
import {
    selectEntityNameToDatabase,
    selectEntityNameToBackend,
    selectEntityNameToCanonical,
    selectFieldNameToDatabase,
    selectFieldNameToBackend,
    selectFieldNameToCanonical,
    selectEntityNameFormats,
    selectFieldNameFormats
} from './globalCacheSelectors';
import {convertDataFormat, replaceKeysInObject} from './utils';
import {NameFormat} from "@/types/AutomationSchemaTypes";

// =============== Replaced with selectors ===============



export function convertToFormat<T extends Record<string, any>>(
    state: RootState,
    entityName: EntityKeys,
    data: T | T[],
    format: NameFormat
): T | T[] {
    switch (format) {
        case 'database': {
            const entityMap = selectEntityNameToDatabase(state);
            const fieldMap = selectFieldNameToDatabase(state)[entityName] || {};
            return convertDataFormat(data, entityMap, fieldMap);
        }

        case 'backend': {
            const entityMap = selectEntityNameToBackend(state);
            const fieldMap = selectFieldNameToBackend(state)[entityName] || {};
            return convertDataFormat(data, entityMap, fieldMap);
        }

        case 'frontend': {
            const entityMap = selectEntityNameToCanonical(state);
            const fieldMap = selectFieldNameToCanonical(state)[entityName] || {};
            return convertDataFormat(data, entityMap, fieldMap);
        }

        default: {
            // Use format maps for other formats
            const entityFormats = selectEntityNameFormats(state)[entityName] || {};
            const fieldFormats = selectFieldNameFormats(state)[entityName] || {};

            const entityMapping = Object.entries(entityFormats).reduce((acc, [key, value]) => {
                if (format === key) acc[entityName] = value;
                return acc;
            }, {} as Record<string, string>);

            const fieldMapping = Object.entries(fieldFormats).reduce((acc, [fieldName, formatMap]) => {
                const value = formatMap[format];
                if (value) acc[fieldName] = value;
                return acc;
            }, {} as Record<string, string>);

            return convertDataFormat(data, entityMapping, fieldMapping);
        }
    }
}


export function convertObjectToDatabase<T extends Record<string, any>>(
    state: RootState,
    entityName: EntityKeys,
    data: T | T[]
): T | T[] {
    const entityMap = selectEntityNameToDatabase(state);
    const fieldMap = selectFieldNameToDatabase(state)[entityName] || {};
    return convertDataFormat(data, entityMap, fieldMap);
}

export function convertObjectToBackend<T extends Record<string, any>>(
    state: RootState,
    entityName: EntityKeys,
    data: T | T[]
): T | T[] {
    const entityMap = selectEntityNameToBackend(state);
    const fieldMap = selectFieldNameToBackend(state)[entityName] || {};
    return convertDataFormat(data, entityMap, fieldMap);
}

export function convertObjectToFrontend<T extends Record<string, any>>(
    state: RootState,
    entityName: EntityKeys,
    data: T | T[]
): T | T[] {
    const entityMap = selectEntityNameToCanonical(state);
    const fieldMap = selectFieldNameToCanonical(state)[entityName] || {};
    return convertDataFormat(data, entityMap, fieldMap);
}

// Alias for convertObjectToFrontend
export const convertObjectToCanonical = convertObjectToFrontend;

export function convertObjectToPretty<T extends Record<string, any>>(
    state: RootState,
    entityName: EntityKeys,
    data: T | T[]
): T | T[] {
    const entityFormats = selectEntityNameFormats(state);
    const fieldFormats = selectFieldNameFormats(state);

    const entityMap = Object.entries(entityFormats).reduce((acc, [entity, formats]) => {
        acc[entity] = formats['pretty'] || entity;
        return acc;
    }, {} as Record<string, string>);

    const fieldMap = Object.entries(fieldFormats[entityName] || {}).reduce((acc, [field, formats]) => {
        acc[field] = formats['pretty'] || field;
        return acc;
    }, {} as Record<string, string>);

    return convertDataFormat(data, entityMap, fieldMap);
}





// DATABASE CONVERSIONS

export function convertQueryToDatabase<T extends Record<string, any>>(
    state: RootState,
    entityName: EntityKeys,
    query: T
): T {
    const fieldMap = selectFieldNameToDatabase(state)[entityName] || {};

    return {
        ...query,
        filters: query.filters ? replaceKeysInObject(query.filters, fieldMap) : undefined,
        sorts: query.sorts?.map(sort => ({
            ...sort,
            column: fieldMap[sort.column] || sort.column
        })),
        columns: query.columns?.map(column => fieldMap[column] || column)
    } as T;
}


