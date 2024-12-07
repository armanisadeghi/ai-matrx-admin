// lib/redux/entity/utils.ts

import {AllEntityFieldKeys, EntityData, EntityKeys} from "@/types/entityTypes";
import {
    EntityOperationFlags,
    EntityOperations,
    EntityState,
    FilterCondition,
    FilterState,
    MatrxRecordId,
    PrimaryKeyMetadata
} from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "./entityLogger";

const trace = "UTILS";
const utilsLogger = EntityLogger.createLoggerWithDefaults(trace, 'NoEntity');


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

export const createSelectionHelper = (selectedRecords: string[]) => ({
    isSelected: (recordKey: string) => selectedRecords.includes(recordKey),
    count: selectedRecords.length,
    isEmpty: selectedRecords.length === 0,
    toArray: () => [...selectedRecords],
    has: (recordKey: string) => selectedRecords.includes(recordKey),
});

/*
// Usage in component
const selection = createSelectionHelper(selectedRecords);
if (selection.has(recordKey)) {
    // do something
}
*/

// --- Selection Management ---
export interface SelectionState {
    selectedRecords: MatrxRecordId[];
    selectionMode: SelectionMode;
    activeRecord: MatrxRecordId | null;
    lastSelected?: MatrxRecordId;
}

export function getRecordIdByRecord<TEntity extends EntityKeys>(
    entityState: EntityState<TEntity>,
    record: EntityData<TEntity>
): MatrxRecordId | null {
    const entry = Object.entries(entityState.records).find(
        ([, value]) => value === record
    );
    return entry ? (entry[0] as MatrxRecordId) : null;
}

// Unsaved data management ========================================================


export const addToUnsavedRecords = (state, recordKey: MatrxRecordId) => {
    if (!state.records[recordKey]) {
        utilsLogger.log('warn', 'Attempted to add non-existent record to unsaved', { recordKey });
        return;
    }

    // Only copy if it doesn't exist in unsaved records
    if (!state.unsavedRecords[recordKey]) {
        state.unsavedRecords[recordKey] = { ...state.records[recordKey] };
        utilsLogger.log('debug', 'Added record to unsaved', { recordKey });
    }
};

export const removeFromUnsavedRecords = (state, recordKey: MatrxRecordId) => {
    if (state.unsavedRecords[recordKey]) {
        delete state.unsavedRecords[recordKey];
        utilsLogger.log('debug', 'Removed record from unsaved', { recordKey });
    }
};

export const clearUnsavedRecords = (state) => {
    state.unsavedRecords = {};
    utilsLogger.log('debug', 'Cleared all unsaved records');
};

export const generateTemporaryRecordId = (state) => {
    const prefix = 'new-record-';
    const existingTempIds = Object.keys(state.unsavedRecords)
        .filter(id => id.startsWith(prefix))
        .map(id => parseInt(id.replace(prefix, '')))
        .sort((a, b) => b - a);

    const nextNumber = (existingTempIds[0] || 0) + 1;
    return `${prefix}${nextNumber}`;
};

export const updateUnsavedRecord = (state, recordKey: MatrxRecordId, changes: Partial<EntityData<EntityKeys>>) => {
    if (state.unsavedRecords[recordKey]) {
        state.unsavedRecords[recordKey] = {
            ...state.unsavedRecords[recordKey],
            ...changes
        };
        state.flags.hasUnsavedChanges = true;
        if (!state.flags.operationMode) {
            state.flags.operationMode = 'update';
        }
        utilsLogger.log('debug', 'Updated unsaved record', { recordKey, changes });
    }
};

// Selection management ========================================================

export const addRecordToSelection = (state, recordKey: MatrxRecordId) => {
    console.log('addRecordToSelection called', {recordKey});

    if (!state.selection.selectedRecords.includes(recordKey)) {
        state.selection.selectedRecords.push(recordKey);
        addToUnsavedRecords(state, recordKey);  // Add this line
        updateSelectionMode(state, recordKey);
    } else {
        utilsLogger.log('debug', 'Record already in selection, no change:', {
            recordKey,
            currentSelection: state.selection.selectedRecords
        });
    }
};

export const removeRecordFromSelection = (state, recordKey: MatrxRecordId) => {
    state.selection.selectedRecords = state.selection.selectedRecords.filter(
        key => key !== recordKey
    );
    removeFromUnsavedRecords(state, recordKey);

    if (state.selection.lastSelected === recordKey) {
        const newLastSelected = state.selection.selectedRecords[state.selection.selectedRecords.length - 1];
        state.selection.lastSelected = newLastSelected;
        utilsLogger.log('debug', 'Updated lastSelected after removal:', {
            oldLastSelected: recordKey,
            newLastSelected
        });
    }
    updateSelectionMode(state);
};

export const removeActiveRecord = (state) => {
    const oldActiveRecord = state.selection.activeRecord;
    state.selection.lastActiveRecord = oldActiveRecord;
    state.selection.activeRecord = null;
    utilsLogger.log('debug', 'Removed active record:', {
        previousActive: oldActiveRecord,
        newLastActive: state.selection.lastActiveRecord
    });
}

export const findBestActiveRecord = (state) => {
    const result = state.selection.lastActiveRecord || state.selection.selectedRecords[0] || state.selection.lastSelected;
    utilsLogger.log('debug', 'Found best active record:', {
        result,
        considered: {
            lastActiveRecord: state.selection.lastActiveRecord,
            firstSelectedRecord: state.selection.selectedRecords[0],
            lastSelected: state.selection.lastSelected
        }
    });
    return result;
}

export const setNewActiveRecord = (state, recordKey) => {
    if (state.selection.activeRecord === recordKey) {
        utilsLogger.log('debug', 'Skipping setNewActiveRecord - record already active:', {
            recordKey
        });
        return;
    }

    const oldActiveRecord = state.selection.activeRecord;
    state.selection.lastActiveRecord = oldActiveRecord;
    state.selection.activeRecord = recordKey;
    utilsLogger.log('debug', 'Set new active record:', {
        oldActive: oldActiveRecord,
        newActive: recordKey,
        newLastActive: state.selection.lastActiveRecord
    });

    if (!state.selection.selectedRecords.includes(recordKey)) {
        const oldSelection = [...state.selection.selectedRecords];
        state.selection.selectedRecords = [recordKey];
        utilsLogger.log('debug', 'Updated selection for new active record:', {
            oldSelection,
            newSelection: state.selection.selectedRecords
        });
    }
}

export const updateSelectionMode = (state, recordKey = null) => {
    utilsLogger.log('debug', 'Updating selection mode. With or without Record Key. Got: ', {recordKey});
    if (state.selection.selectedRecords.length === 1) {
        utilsLogger.log('debug', 'Switching to single selection mode');
        switchToSingleSelectionMode(state, recordKey);
    } else if (state.selection.selectedRecords.length > 1) {
        utilsLogger.log('debug', 'Switching to multiple selection mode');
        switchToMultipleSelectionMode(state);
    } else {
        utilsLogger.log('debug', 'Switching to no selection mode');
        state.selection.selectionMode = 'none';
    }
};

export const switchToSingleSelectionMode = (state, recordKey = null) => {
    utilsLogger.log('debug', 'Starting switchToSingleSelectionMode. Got recordKey: ', {recordKey});

    if (recordKey !== null) {
        utilsLogger.log('debug', 'Using provided recordKey as active record: ', {recordKey});
        state.selection.activeRecord = recordKey;
    } else {
        utilsLogger.log('debug', 'No recordKey provided, finding best active record');
        state.selection.activeRecord = findBestActiveRecord(state);
    }

    utilsLogger.log('debug', 'Setting selected records to active record: ', {activeRecord: state.selection.activeRecord});
    state.selection.selectedRecords = [state.selection.activeRecord];

    utilsLogger.log('debug', 'Setting selection mode to single');
    state.selection.selectionMode = 'single';
}

export const switchToMultipleSelectionMode = (state) => {
    state.selection.selectionMode = 'multiple';
    console.log('switchToMultipleSelectionMode called');
    removeActiveRecord(state);
}

export const switchToNoSelectionMode = (state) => {
    state.selection.selectionMode = 'none';
    console.log('switchToNoSelectionMode called');
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
    clearUnsavedRecords(state);
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
        console.log('handleSelectionForDeletedRecord called to delete', {recordKey});
    }
    removeFromUnsavedRecords(state, recordKey);
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
