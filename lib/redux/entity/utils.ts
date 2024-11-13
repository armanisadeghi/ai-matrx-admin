// lib/redux/entity/utils.ts

import { EntityData, EntityKeys } from "@/types/entityTypes";
import { FilterState, MatrxRecordId, PrimaryKeyMetadata, FilterCondition } from "@/lib/redux/entity/types";
import EntityLogger from "./entityLogger";

/**
 * Key Management Utilities
 */


export const createRecordKey = (metadata: PrimaryKeyMetadata, record: any): MatrxRecordId => {
    EntityLogger.log('debug', 'createRecordKey called', 'createRecordKey', { record });
    EntityLogger.log('debug', 'Metadata:', 'createRecordKey', { metadata });
    const key = metadata.database_fields
        .map((field, index) => {
            const frontendField = metadata.fields[index];
            const value = record[frontendField];

            if (value === undefined) {
                EntityLogger.log('error', `Missing value for primary key field: ${frontendField}`, 'createRecordKey');
            }
            return `${field}:${value}`;
        })
        .join('::');
    EntityLogger.log('info', 'Generated record key:', '---createRecordKey---', { key });
    return key;
};


export const parseRecordKey = (key: MatrxRecordId): Record<string, string> => {
    return key.split('::').reduce((acc, pair) => {
        const [field, value] = pair.split(':');
        if (field && value !== undefined) {
            acc[field] = value;
        } else {
            EntityLogger.log(
                'error',
                `Invalid format in record key part: ${pair}`,
                'parseRecordKey',
                { key }
            );
            throw new Error(`Invalid format in record key part: ${pair}`);
        }
        return acc;
    }, {} as Record<string, string>);
};

export const createRecordKeys = (metadata: PrimaryKeyMetadata, records: any[]): MatrxRecordId[] => {
    return records.map((record) => {
        return createRecordKey(metadata, record);
    });
};

export const parseRecordKeys = (keys: MatrxRecordId[]): Record<string, string>[] => {
    return keys.map((key) => {
        return parseRecordKey(key);
    });
};


/**
 * Primary Key Validation and Handling
 */
export const hasPrimaryKeyValues = (
    metadata: PrimaryKeyMetadata,
    record: any
): boolean => {
    return metadata.fields.every(field => {
        const hasValue = record[field] !== undefined;
        if (!hasValue && process.env.NODE_ENV === 'development') {
            console.warn(`Missing primary key value for field: ${field}`);
        }
        return hasValue;
    });
};

export const createWhereClause = (
    metadata: PrimaryKeyMetadata,
    record: any
): Record<string, unknown> => {
    const clause: Record<string, unknown> = {};

    metadata.database_fields.forEach((dbField, index) => {
        const frontendField = metadata.fields[index];
        const value = record[frontendField];

        if (value === undefined && process.env.NODE_ENV === 'development') {
            console.warn(`Missing value for where clause field: ${frontendField}`);
        }

        clause[dbField] = value;
    });

    return clause;
};

/**
 * Filter Operations
 */
const evaluateCondition = (value: any, condition: FilterCondition): boolean => {
    switch (condition.operator) {
        case 'eq':
            return value === condition.value;
        case 'neq':
            return value !== condition.value;
        case 'gt':
            return value > condition.value;
        case 'gte':
            return value >= condition.value;
        case 'lt':
            return value < condition.value;
        case 'lte':
            return value <= condition.value;
        case 'like':
            return String(value).includes(String(condition.value));
        case 'ilike':
            return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'in':
            return Array.isArray(condition.value) && condition.value.includes(value);
        case 'between':
            return Array.isArray(condition.value) &&
                value >= condition.value[0] &&
                value <= condition.value[1];
        default:
            console.warn(`Unknown operator: ${condition.operator}`);
            return true;
    }
};

const compareValues = (a: any, b: any, direction: 'asc' | 'desc'): number => {
    if (a === b) return 0;

    const comparison = a < b ? -1 : 1;
    return direction === 'asc' ? comparison : -comparison;
};

export const applyFilters = <TEntity extends EntityKeys>(
    records: EntityData<TEntity>[],
    filters: FilterState
): EntityData<TEntity>[] => {
    let result = [...records];

    // Apply filter conditions
    if (filters.conditions.length > 0) {
        result = result.filter(record =>
            filters.conditions.every(condition => evaluateCondition(record[condition.field], condition))
        );
    }

    // Apply sorting
    if (filters.sort.length > 0) {
        result.sort((a, b) => {
            for (const sort of filters.sort) {
                const aVal = a[sort.field];
                const bVal = b[sort.field];
                const comparison = compareValues(aVal, bVal, sort.direction);
                if (comparison !== 0) return comparison;
            }
            return 0;
        });
    }

    return result;
};

/**
 * Type Guards and Validation
 */
export const isSerializableValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return true;
    if (Array.isArray(value)) return value.every(isSerializableValue);
    if (typeof value === 'object') {
        return Object.values(value).every(isSerializableValue);
    }
    return false;
};

// Export type for external use
export type SerializableRecord = Record<string, string | number | boolean | null | undefined>;
