// lib/redux/entity/utils.ts

import {AllEntityFieldKeys, EntityData, EntityKeys} from "@/types/entityTypes";
import {
    EntityOperationFlags,
    EntityState,
    FilterCondition,
    FilterState,
    MatrxRecordId,
    PrimaryKeyMetadata
} from "@/lib/redux/entity/types";
import EntityLogger from "./entityLogger";

const trace = "UTILS";
const utilsLogger = EntityLogger.createLoggerWithDefaults(trace, 'NoEntity');

export type FlagStatusOptions = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

export type EntityOperations =
    | 'FETCH'
    | 'FETCH_ONE'
    | 'FETCH_QUICK_REFERENCE'
    | 'FETCH_RECORDS'
    | 'FETCH_ALL'
    | 'FETCH_PAGINATED'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'CUSTOM';

export const setLoading = <TEntity extends EntityKeys>(
    state: EntityState<TEntity>,
    operation: EntityOperations
) => {
    const flagKey = `${operation}_STATUS` as keyof EntityOperationFlags;

    if (!state.loading.initialized) {
        utilsLogger.log('error', 'Loading state is not initialized. Expected `initialized` to be true.', 'setLoading');
    }

    if (flagKey in state.flags.operationFlags) {
        state.loading.loading = true;
        state.loading.error = null;
        state.loading.lastOperation = operation;
        state.flags.operationFlags[flagKey] = 'LOADING';
    } else {
        utilsLogger.log('error', `Invalid operation: ${operation}`, 'setLoading');
    }
};


export const setSuccess = <TEntity extends EntityKeys>(
    state: EntityState<TEntity>,
    operation: EntityOperations
) => {
    const flagKey = `${operation}_STATUS` as keyof EntityOperationFlags;

    if (!state.loading.loading) {
        utilsLogger.log(
            'warn',
            `Expected loading state to be true before setting success for operation: ${operation}`,
            'setSuccess'
        );
    }

    // Expectations Check: Ensure no existing errors
    if (state.loading.error !== null) {
        utilsLogger.log(
            'warn',
            `Unexpected error state found before setting success for operation: ${operation}. Error: ${state.loading.error}`,
            'setSuccess'
        );
    }

    // Expectations Check: Ensure last operation matches the current one
    if (state.loading.lastOperation !== operation) {
        utilsLogger.log(
            'warn',
            `Last operation mismatch. Expected ${operation} but found ${state.loading.lastOperation}`,
            'setSuccess'
        );
    }

    // Ensure flagKey is valid before proceeding
    if (flagKey in state.flags.operationFlags) {
        state.loading.loading = false;
        state.loading.error = null;
        state.loading.lastOperation = operation;

        state.flags.operationFlags[flagKey] = 'SUCCESS';
    } else {
        utilsLogger.log('error', `Invalid operation flag: ${operation}`, 'setSuccess');
    }
};


export const resetFlag = <TEntity extends EntityKeys>(
    state: EntityState<TEntity>,
    operation: EntityOperations
) => {
    const flagKey = `${operation}_STATUS` as keyof EntityOperationFlags;

    if (flagKey in state.flags.operationFlags) {
        if (state.flags.operationFlags[flagKey] === 'SUCCESS') {
            state.flags.operationFlags[flagKey] = 'IDLE';
        } else {
            utilsLogger.log('error', `Attempted to reset flag that was not set to SUCCESS: ${operation}`, 'resetFlag');
        }
    } else {
        utilsLogger.log('error', `Invalid operation for resetFlag: ${operation}`, 'resetFlag');
    }
};

export interface SelectionSummary {
    count: number;
    hasSelection: boolean;
    hasSingleSelection: boolean;
    hasMultipleSelection: boolean;
    activeRecord: MatrxRecordId | null;
    mode: SelectionMode;
}

export type SelectionMode = 'single' | 'multiple' | 'none';

// --- Selection Management ---
export interface SelectionState {
    selectedRecords: MatrxRecordId[];
    selectionMode: SelectionMode;
    activeRecord: MatrxRecordId | null;
    lastSelected?: MatrxRecordId;
}


export const addRecordToSelection = (state, recordKey: MatrxRecordId) => {
    if (!state.selection.selectedRecords.includes(recordKey)) {
        state.selection.selectedRecords.push(recordKey);
        updateSelectionMode(state);
    }
};


export const removeRecordFromSelection = (state, recordKey: MatrxRecordId) => {
    state.selection.selectedRecords = state.selection.selectedRecords.filter(
        key => key !== recordKey
    );
    if (state.selection.lastSelected === recordKey) {
        state.selection.lastSelected = state.selection.selectedRecords[state.selection.selectedRecords.length - 1];
    }
    updateSelectionMode(state);
};

export const removeActiveRecord = (state) => {
    state.selection.lastActiveRecord = state.selection.activeRecord;
    state.selection.activeRecord = null;
}

export const findBestActiveRecord = (state) => {
    return state.selection.lastActiveRecord || state.selection.selectedRecords[0] || state.selection.lastSelected;
}

export const setNewActiveRecord = (state, recordKey) => {
    state.selection.lastActiveRecord = state.selection.activeRecord;
    state.selection.activeRecord = recordKey;

    if (!state.selection.selectedRecords.includes(recordKey)) {
        state.selection.selectedRecords = [recordKey];
    }
}

export const updateSelectionMode = (state) => {
    if (state.selection.selectedRecords.length === 1) {
        switchToSingleSelectionMode(state);
    } else if (state.selection.selectedRecords.length > 1) {
        switchToMultipleSelectionMode(state);
    } else {
        state.selection.selectionMode = 'none';
    }
};

export const switchToSingleSelectionMode = (state) => {
    state.selection.activeRecord = findBestActiveRecord(state);
    state.selection.selectedRecords = [state.selection.activeRecord];
    state.selection.selectionMode = 'single';
}

export const switchToMultipleSelectionMode = (state) => {
    state.selection.selectionMode = 'multiple';
    removeActiveRecord(state);
}

export const switchToNoSelectionMode = (state) => {
    state.selection.selectionMode = 'none';
    removeSelections(state);
}

export const setSpecificSelectionMode = (state, mode) => {
    if (mode === 'single') {
        switchToSingleSelectionMode(state);
    } else if (mode === 'multiple') {
        switchToMultipleSelectionMode(state);
    } else {
        switchToNoSelectionMode(state);
    }
}

export const toggleSelectionMode = (state) => {
    if (state.selection.selectionMode === 'single' || state.selection.selectionMode === 'none') {
        switchToMultipleSelectionMode(state);
    } else if (state.selection.selectionMode === 'multiple') {
        switchToSingleSelectionMode(state);
    }
};

export const removeSelections = (state) => {
    if (state.selection.selectedRecords.length > 0) {
        state.selection.lastSelected = state.selection.selectedRecords[0]
    }
    state.selection.selectedRecords = [];
    state.selection.selectionMode = 'none';
    removeActiveRecord(state);
}

export const handleSelectionForDeletedRecord = (state, recordKey) => {
    if (state.selection.selectedRecords.includes(recordKey)) {
        removeRecordFromSelection(state, recordKey);
    }
    if (state.selection.activeRecord === recordKey) {
        removeActiveRecord(state);
    }
}

export const setStateIsModified = (state) => {
    state.flags.isModified = true;
    state.flags.isValidated = false;
}

export const resetStateIsModified = (state) => {
    state.flags.isModified = false;
}


export const setError = (state, action) => {
    state.loading.loading = false;
    state.loading.error = {
        message: action.payload?.message || 'An error occurred',
        code: action.payload?.code,
        details: action.payload?.details,
    };
};

export const clearError = (state) => {
    state.loading.loading = false;
    state.loading.error = null;
};


// --- Cache Management ---
export interface CacheState {
    lastFetched: Record<AllEntityFieldKeys, unknown>;
    staleTime: number;
    stale: boolean;
    prefetchedPages: number[];
    invalidationTriggers: string[];
}


/**
 * Key Management Utilities
 */
export const isMatrxRecordId = (input: unknown): boolean => {
    if (typeof input !== 'string') {
        return false;
    }
    const keyPattern = /^\w+:[^:]+(::\w+:[^:]+)*$/;
    return keyPattern.test(input);
};

export const createMatrxRecordId = (
    metadata: PrimaryKeyMetadata,
    record: Record<AllEntityFieldKeys, unknown>
): MatrxRecordId => {
    return metadata.database_fields
        .map((field, index) => {
            const frontendField = metadata.fields[index];
            const value = record[frontendField];
            return `${field}:${value}`;
        })
        .join('::');
};

export const createMultipleMatrxRecordIds = (
    metadata: PrimaryKeyMetadata,
    records: Record<AllEntityFieldKeys, unknown>[]
): MatrxRecordId[] => {
    return records.map((record) => {
        return createMatrxRecordId(metadata, record);
    });
};

export const parseMatrxRecordId = (
    key: MatrxRecordId
): Record<AllEntityFieldKeys, unknown> => {
    return key.split('::').reduce((acc, pair) => {
        const [field, value] = pair.split(':');

        if (field && value !== undefined) {
            acc[field as AllEntityFieldKeys] = value;
        } else {
            throw new Error(`Invalid format in record key part: ${pair}`);
        }

        return acc;
    }, {} as Record<AllEntityFieldKeys, unknown>);
};

export const parseMultipleMatrxRecordIds = (
    keys: MatrxRecordId[]
): Record<AllEntityFieldKeys, unknown>[] => {
    return keys.map((key) => {
        return parseRecordKey(key);
    });
};


export const createRecordKey = (metadata: PrimaryKeyMetadata, record: any): MatrxRecordId => {
    utilsLogger.log('debug', 'createRecordKey called', {record});
    utilsLogger.log('debug', 'Metadata:', {metadata});
    const key = metadata.database_fields
        .map((field, index) => {
            const frontendField = metadata.fields[index];
            const value = record[frontendField];

            if (value === undefined) {
                utilsLogger.log('error', `Missing value for primary key field: ${frontendField}`, 'createRecordKey');
            }
            return `${field}:${value}`;
        })
        .join('::');
    utilsLogger.log('debug', 'Generated record key:', {key});
    return key;
};


export const parseRecordKey = (key: MatrxRecordId): Record<AllEntityFieldKeys, unknown> => {
    return key.split('::').reduce((acc, pair) => {
        const [field, value] = pair.split(':');
        if (field && value !== undefined) {
            acc[field] = value;
        } else {
            throw new Error(`Invalid format in record key part: ${pair}`);
        }
        return acc;
    }, {} as Record<AllEntityFieldKeys, unknown>);
};


export const parseRecordKeys = (keys: MatrxRecordId[]): Record<AllEntityFieldKeys, unknown>[] => {
    return keys.map((key) => {
        return parseRecordKey(key);
    });
};

export function isEntityData<TEntity extends EntityKeys>(
    input: unknown,
    fields: Record<keyof EntityData<TEntity>, unknown>
): input is EntityData<TEntity> {
    if (typeof input !== 'object' || input === null) return false;

    return Object.keys(fields).every((key) => {
        return key in (input as Record<string, unknown>);
    });
}


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
