import {EntityData, EntityKeys} from "@/types/entityTypes";
import {FilterState, MatrxRecordId, PrimaryKeyMetadata} from "@/lib/redux/entity/types";

export const getRecordId = <TEntity extends EntityKeys>(
    record: EntityData<TEntity>,
    primaryKeyField: string
): MatrxRecordId => {
    return record[primaryKeyField] as MatrxRecordId;
};

export const createRecordKey = (metadata: PrimaryKeyMetadata, record: any): string => {
    return metadata.database_fields
        .map(field => `${field}:${record[metadata.fields[metadata.database_fields.indexOf(field)]]}`)
        .join('::');
};


// Helper function to check if all primary key values exist in a record
export const hasPrimaryKeyValues = (
    metadata: PrimaryKeyMetadata,
    record: any
): boolean => {
    return metadata.fields.every(field => record[field] !== undefined);
};

// Helper function to create where clause
export const createWhereClause = (metadata: PrimaryKeyMetadata, record: any): Record<string, unknown> => {
    return metadata.database_fields.reduce((clause, dbField, index) => {
        const frontendField = metadata.fields[index];
        clause[dbField] = record[frontendField];
        return clause;
    }, {} as Record<string, unknown>);
};

// Utility functions for primary key handling
export const createCompositeKey = (record: any, primaryKeyFields: string[]): string => {
    return primaryKeyFields
        .map(field => String(record[field]))
        .join('::');
};

export const parseCompositeKey = (compositeKey: string): string[] => {
    return compositeKey.split('::');
};

export const applyFilters = <TEntity extends EntityKeys>(
    records: EntityData<TEntity>[],
    filters: FilterState
): EntityData<TEntity>[] => {
    let result = [...records];

    // Apply filter conditions
    if (filters.conditions.length > 0) {
        result = result.filter(record =>
            filters.conditions.every(condition => {
                const value = record[condition.field];
                switch (condition.operator) {
                    case 'eq': return value === condition.value;
                    case 'neq': return value !== condition.value;
                    case 'gt': return value > condition.value;
                    case 'gte': return value >= condition.value;
                    case 'lt': return value < condition.value;
                    case 'lte': return value <= condition.value;
                    case 'like': return String(value).includes(String(condition.value));
                    case 'ilike': return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
                    case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
                    case 'between': return Array.isArray(condition.value) &&
                        value >= condition.value[0] && value <= condition.value[1];
                    default: return true;
                }
            })
        );
    }

    // Apply sorting
    if (filters.sort.length > 0) {
        result.sort((a, b) => {
            for (const sort of filters.sort) {
                const aVal = a[sort.field];
                const bVal = b[sort.field];
                if (aVal === bVal) continue;
                return sort.direction === 'asc'
                       ? (aVal < bVal ? -1 : 1)
                       : (aVal < bVal ? 1 : -1);
            }
            return 0;
        });
    }

    return result;
};

