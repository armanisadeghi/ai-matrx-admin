// lib/redux/entity/utils.ts

import { AllEntityFieldKeys, EntityData, EntityKeys } from '@/types/entityTypes';
import {
    EntityOperationFlags,
    EntityOperationMode,
    EntityOperations,
    EntityState,
    FilterCondition,
    FilterState,
    MatrxRecordId,
    PrimaryKeyMetadata,
} from '@/lib/redux/entity/types/stateTypes';
import EntityLogger from './entityLogger';

// EntityLogger.addFeatureToFilter("utils");

const utilsLogger = EntityLogger.createLoggerWithDefaults('UTILS', 'NoEntity', 'utils');

export const setLoading = <TEntity extends EntityKeys>(state: EntityState<TEntity>, operation: EntityOperations, reverseLoading: boolean = false) => {
    const flagKey = `${operation}_STATUS` as keyof EntityOperationFlags;

    const preState = {
        operation: operation,
        initialized: state.loading.initialized,
        loading: state.loading.loading,
        error: state.loading.error,
        reverseLoading: reverseLoading,
    };

    utilsLogger.log('debug', `stateHelpUtils.ts setLoading Setting loading state for operation:`, preState);

    // Ensure initialization
    if (!state.loading.initialized) {
        utilsLogger.log('warn', 'stateHelpUtils.ts setLoading called but state.loading.initialized is false.');
        state.loading.initialized = true;
        state.loading.loading = false;
        state.loading.error = null;
        state.loading.lastOperation = null;
    }

    // Check if operation is valid
    if (!(flagKey in state.flags.operationFlags)) {
        utilsLogger.log('debug', `Invalid operation: ${operation}`, 'setLoading');
        return false;
    }

    // Check if we're already loading
    if (state.loading.loading) {
        utilsLogger.log('debug', `stateHelpUtils.ts setLoading Setting loading state while already loading. Current operation:`, state.loading.lastOperation);
        return false;
    }

    state.loading.operationId = crypto.randomUUID();
    state.loading.loading = true;
    state.loading.error = null;
    state.loading.lastOperation = operation;
    state.flags.operationFlags[flagKey] = 'LOADING';

    if (reverseLoading) {
        state.loading.loading = false;
    }

    const postState = {
        operation: operation,
        initialized: state.loading.initialized,
        loading: state.loading.loading,
        error: state.loading.error,
        reverseLoading: reverseLoading,
    };

    utilsLogger.log('debug', `stateHelpUtils.ts setLoading Finished:`, postState);

    return true;
};

export const setSuccess = <TEntity extends EntityKeys>(state: EntityState<TEntity>, operation: EntityOperations) => {
    const flagKey = `${operation}_STATUS` as keyof EntityOperationFlags;

    // Validate operation
    if (!(flagKey in state.flags.operationFlags)) {
        utilsLogger.log('debug', `Invalid operation flag: ${operation}`, 'setSuccess');
        return false;
    }

    // Validate state transition
    if (!state.loading.loading) {
        utilsLogger.log('debug', `Cannot set success when not in loading state: ${operation}`, 'setSuccess');
        return false;
    }

    if (state.loading.lastOperation !== operation) {
        utilsLogger.log('debug', `Operation mismatch. Expected ${operation} but found ${state.loading.lastOperation}`, 'setSuccess');
        return false;
    }

    // Set success state
    state.loading.loading = false;
    state.loading.error = null;
    state.flags.operationFlags[flagKey] = 'SUCCESS';
    return true;
};

export const resetFlag = <TEntity extends EntityKeys>(state: EntityState<TEntity>, operation: EntityOperations) => {
    const flagKey = `${operation}_STATUS` as keyof EntityOperationFlags;

    if (!(flagKey in state.flags.operationFlags)) {
        utilsLogger.log('error', `Invalid operation for resetFlag: ${operation}`, 'resetFlag');
        return false;
    }

    // Allow reset from any non-IDLE state
    if (state.flags.operationFlags[flagKey] !== 'IDLE') {
        state.flags.operationFlags[flagKey] = 'IDLE';

        // If this was the last operation and we're not loading something else,
        // clear the loading state
        if (state.loading.lastOperation === operation && !state.loading.loading) {
            state.loading.lastOperation = null;
        }
        return true;
    }

    return false;
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

export const createSelectionHelper = (selectedRecords: MatrxRecordId[]) => ({
    isSelected: (recordKey: MatrxRecordId) => selectedRecords.includes(recordKey),
    count: selectedRecords.length,
    isEmpty: selectedRecords.length === 0,
    toArray: () => [...selectedRecords],
    has: (recordKey: MatrxRecordId) => selectedRecords.includes(recordKey),
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

export function getRecordIdByRecord<TEntity extends EntityKeys>(entityState: EntityState<TEntity>, record: EntityData<TEntity>): MatrxRecordId | null {
    const entry = Object.entries(entityState.records).find(([, value]) => value === record);
    const allRecords = Object.entries(entityState.records);
    return entry ? (entry[0] as MatrxRecordId) : null;
}

// Unsaved data management ========================================================

export const addToUnsavedRecords = (state: EntityState<EntityKeys>, recordKey: MatrxRecordId) => {
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

export const checkAndUpdateUnsavedChanges = <TEntity extends EntityKeys>(state: EntityState<TEntity>) => {
    const hasUnsavedRecords = Object.keys(state.unsavedRecords).length > 0;

    if (!hasUnsavedRecords && state.flags.hasUnsavedChanges) {
        state.flags.hasUnsavedChanges = false;
        utilsLogger.log('debug', 'Cleared unsaved changes flag');
    } else if (hasUnsavedRecords && !state.flags.hasUnsavedChanges) {
        state.flags.hasUnsavedChanges = true;
        utilsLogger.log('debug', 'Set unsaved changes flag');
    }
};

export const removeFromUnsavedRecords = <TEntity extends EntityKeys>(state: EntityState<TEntity>, recordKey: MatrxRecordId) => {
    if (state.unsavedRecords[recordKey]) {
        delete state.unsavedRecords[recordKey];
        utilsLogger.log('debug', 'Removed record from unsaved', { recordKey });
        checkAndUpdateUnsavedChanges(state);
    }
};

export const clearUnsavedRecords = <TEntity extends EntityKeys>(state: EntityState<TEntity>) => {
    state.unsavedRecords = {};
    state.flags.hasUnsavedChanges = false;
    utilsLogger.log('debug', 'Cleared all unsaved records');
};

export const generateTemporaryRecordId = (state: EntityState<EntityKeys>) => {
    const prefix = 'new-record-';
    const existingTempIds = Object.keys(state.unsavedRecords)
        .filter((id) => id.startsWith(prefix))
        .map((id) => parseInt(id.replace(prefix, '')))
        .sort((a, b) => b - a);

    const nextNumber = (existingTempIds[0] || 0) + 1;
    return `${prefix}${nextNumber}`;
};

export const updateUnsavedRecord = (state: EntityState<EntityKeys>, recordKey: MatrxRecordId, changes: Partial<EntityData<EntityKeys>>) => {
    if (state.unsavedRecords[recordKey]) {
        state.unsavedRecords[recordKey] = {
            ...state.unsavedRecords[recordKey],
            ...changes,
        };
        state.flags.hasUnsavedChanges = true;
        if (!state.flags.operationMode) {
            state.flags.operationMode = 'update';
        }
        utilsLogger.log('debug', 'Updated unsaved record', { recordKey, changes });
    }
};

// Selection management ========================================================

export const addRecordToSelection = (state: EntityState<EntityKeys>, entityKey: EntityKeys, recordKey: MatrxRecordId) => {
    if (!state.selection.selectedRecords.includes(recordKey)) {
        state.selection.selectedRecords.push(recordKey);
        addToUnsavedRecords(state, recordKey);
        updateSelectionMode(state, recordKey);
    } else {
        utilsLogger.log('debug', 'Record already in selection, no change:', {
            recordKey,
            currentSelection: state.selection.selectedRecords,
        });
    }
};

export const removeRecordFromSelection = (state: EntityState<EntityKeys>, recordKey: MatrxRecordId) => {
    state.selection.selectedRecords = state.selection.selectedRecords.filter((key) => key !== recordKey);
    removeFromUnsavedRecords(state, recordKey);

    if (state.selection.lastSelected === recordKey) {
        const newLastSelected = state.selection.selectedRecords[state.selection.selectedRecords.length - 1];
        state.selection.lastSelected = newLastSelected;
        utilsLogger.log('debug', 'Updated lastSelected after removal:', {
            oldLastSelected: recordKey,
            newLastSelected,
        });
    }
    updateSelectionMode(state);
};

export const removeActiveRecord = (state: EntityState<EntityKeys>) => {
    const oldActiveRecord = state.selection.activeRecord;
    state.selection.lastActiveRecord = oldActiveRecord;
    state.selection.activeRecord = null;
    utilsLogger.log('debug', 'Removed active record:', {
        previousActive: oldActiveRecord,
        newLastActive: state.selection.lastActiveRecord,
    });
};

export const findBestActiveRecord = (state: EntityState<EntityKeys>) => {
    const result = state.selection.lastActiveRecord || state.selection.selectedRecords[0] || state.selection.lastSelected;
    utilsLogger.log('debug', 'Found best active record:', {
        result,
        considered: {
            lastActiveRecord: state.selection.lastActiveRecord,
            firstSelectedRecord: state.selection.selectedRecords[0],
            lastSelected: state.selection.lastSelected,
        },
    });
    return result;
};

// BIG CHANGE ======= ACTIVE RECORD DOES NOT CLEAR SELECTIONS NOW =================

export const setNewActiveRecord = (state: EntityState<EntityKeys>, recordKey: MatrxRecordId) => {
    // Early return if the record is already active
    if (state.selection.activeRecord === recordKey) {
        return;
    }

    // Update active record tracking
    const oldActiveRecord = state.selection.activeRecord;
    state.selection.lastActiveRecord = oldActiveRecord;
    state.selection.activeRecord = recordKey;

    // Add to selections if not already included
    if (!state.selection.selectedRecords.includes(recordKey)) {
        state.selection.selectedRecords.push(recordKey);
    }
};

export const updateSelectionMode = (state: EntityState<EntityKeys>, recordKey: MatrxRecordId = null) => {
    utilsLogger.log('debug', 'Updating selection mode. With or without Record Key. Got: ', { recordKey });
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

export const switchToSingleSelectionMode = (state: EntityState<EntityKeys>, recordKey: MatrxRecordId = null) => {
    utilsLogger.log('debug', 'Starting switchToSingleSelectionMode. Got recordKey: ', { recordKey });

    if (recordKey !== null) {
        utilsLogger.log('debug', 'Using provided recordKey as active record: ', { recordKey });
        state.selection.activeRecord = recordKey;
    } else {
        utilsLogger.log('debug', 'No recordKey provided, finding best active record');
        state.selection.activeRecord = findBestActiveRecord(state);
    }

    utilsLogger.log('debug', 'Setting selected records to active record: ', { activeRecord: state.selection.activeRecord });
    state.selection.selectedRecords = [state.selection.activeRecord];

    utilsLogger.log('debug', 'Setting selection mode to single');
    state.selection.selectionMode = 'single';
};

export const switchToMultipleSelectionMode = (state: EntityState<EntityKeys>) => {
    state.selection.selectionMode = 'multiple';
    console.log('switchToMultipleSelectionMode called');
    removeActiveRecord(state);
};

export const switchToNoSelectionMode = (state: EntityState<EntityKeys>) => {
    state.selection.selectionMode = 'none';
    console.log('switchToNoSelectionMode called');
    removeSelections(state);
};

export const setSpecificSelectionMode = (state: EntityState<EntityKeys>, mode) => {
    if (mode === 'single') {
        switchToSingleSelectionMode(state);
    } else if (mode === 'multiple') {
        switchToMultipleSelectionMode(state);
    } else {
        switchToNoSelectionMode(state);
    }
};

export const toggleSelectionMode = (state: EntityState<EntityKeys>) => {
    if (state.selection.selectionMode === 'single' || state.selection.selectionMode === 'none') {
        switchToMultipleSelectionMode(state);
    } else if (state.selection.selectionMode === 'multiple') {
        switchToSingleSelectionMode(state);
    }
};

export const removeSelections = (state: EntityState<EntityKeys>) => {
    if (state.selection.selectedRecords.length > 0) {
        state.selection.lastSelected = state.selection.selectedRecords[0];
    }
    clearUnsavedRecords(state);
    state.selection.selectedRecords = [];
    state.selection.selectionMode = 'none';
    removeActiveRecord(state);
};

export const handleSelectionForDeletedRecord = (state: EntityState<EntityKeys>, recordKey: MatrxRecordId) => {
    if (state.selection.selectedRecords.includes(recordKey)) {
        removeRecordFromSelection(state, recordKey);
    }
    if (state.selection.activeRecord === recordKey) {
        removeActiveRecord(state);
        console.log('handleSelectionForDeletedRecord called to delete', { recordKey });
    }
    removeFromUnsavedRecords(state, recordKey);
};

export const setStateIsModified = (state: EntityState<EntityKeys>) => {
    state.flags.isModified = true;
    state.flags.isValidated = false;
};

export const resetStateIsModified = (state: EntityState<EntityKeys>) => {
    state.flags.isModified = false;
};

export const setError = (state: EntityState<EntityKeys>, action) => {
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

export const createMatrxRecordId = (metadata: PrimaryKeyMetadata, record: Record<AllEntityFieldKeys, unknown>): MatrxRecordId => {
    return metadata.database_fields
        .map((field, index) => {
            const frontendField = metadata.fields[index];
            const value = record[frontendField];
            return `${field}:${value}`;
        })
        .join('::');
};

export const createMultipleMatrxRecordIds = (metadata: PrimaryKeyMetadata, records: Record<AllEntityFieldKeys, unknown>[]): MatrxRecordId[] => {
    return records.map((record) => {
        return createMatrxRecordId(metadata, record);
    });
};

export const parseMatrxRecordId = (key: MatrxRecordId): Record<AllEntityFieldKeys, unknown> => {
    return key.split('::').reduce((acc, pair) => {
        const [field, value] = pair.split(':');

        if (field && value !== undefined) {
            acc[field as AllEntityFieldKeys] = value;
        } else {
            throw new Error(`parseMatrxRecordId Invalid format in record key part: ${pair}`);
        }

        return acc;
    }, {} as Record<AllEntityFieldKeys, unknown>);
};

export const parseMultipleMatrxRecordIds = (keys: MatrxRecordId[]): Record<AllEntityFieldKeys, unknown>[] => {
    return keys.map((key) => {
        return parseRecordKey(key);
    });
};

export const createRecordKey = (metadata: PrimaryKeyMetadata, record: any): MatrxRecordId => {
    utilsLogger.log('debug', 'createRecordKey called', { record }, undefined, 'recordKey');
    utilsLogger.log('debug', 'Metadata:', { metadata }, undefined, 'recordKey');

    const key = metadata.database_fields
        .map((field, index) => {
            const frontendField = metadata.fields[index];
            const value = record[frontendField];

            if (value === undefined) {
                utilsLogger.log('error', `Missing value for primary key field: ${frontendField}`, { field: frontendField }, undefined, 'recordKey');
            }
            return `${field}:${value}`;
        })
        .join('::');

    utilsLogger.log('debug', 'Generated record key:', { key }, undefined, 'recordKey');
    return key;
};

export const parseRecordKey = (key: MatrxRecordId): Record<AllEntityFieldKeys, unknown> => {
    return key.split('::').reduce((acc, pair) => {
        const [field, value] = pair.split(':');
        if (field && value !== undefined) {
            acc[field] = value;
        } else {
            throw new Error(`parseRecordKey Invalid format in record key part: ${pair}`);
        }
        return acc;
    }, {} as Record<AllEntityFieldKeys, unknown>);
};

export const parseRecordKeys = (keys: MatrxRecordId[]): Record<AllEntityFieldKeys, unknown>[] => {
    return keys.map((key) => {
        return parseRecordKey(key);
    });
};

export function isEntityData<TEntity extends EntityKeys>(input: unknown, fields: Record<keyof EntityData<TEntity>, unknown>): input is EntityData<TEntity> {
    if (typeof input !== 'object' || input === null) return false;

    return Object.keys(fields).every((key) => {
        return key in (input as Record<string, unknown>);
    });
}

/**
 * Primary Key Validation and Handling
 */
export const hasPrimaryKeyValues = (metadata: PrimaryKeyMetadata, record: any): boolean => {
    return metadata.fields.every((field) => {
        const hasValue = record[field] !== undefined;
        if (!hasValue && process.env.NODE_ENV === 'development') {
            console.warn(`Missing primary key value for field: ${field}`);
        }
        return hasValue;
    });
};

export const createWhereClause = (metadata: PrimaryKeyMetadata, record: any): Record<string, unknown> => {
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
            return Array.isArray(condition.value) && value >= condition.value[0] && value <= condition.value[1];
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

export const applyFilters = <TEntity extends EntityKeys>(records: EntityData<TEntity>[], filters: FilterState): EntityData<TEntity>[] => {
    let result = [...records];

    // Apply filter conditions
    if (filters.conditions.length > 0) {
        result = result.filter((record) => filters.conditions.every((condition) => evaluateCondition(record[condition.field], condition)));
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

export interface SingleRecordContext {
    type: 'single';
    activeRecordId: MatrxRecordId;
    unsavedChanges: Record<string, any>;
    operationMode: EntityOperationMode;
}

export interface MultiSelectSingleChangeContext {
    type: 'multiSelectSingle';
    selectedRecordIds: MatrxRecordId[];
    activeRecordId: MatrxRecordId;
    unsavedChanges: Record<string, any>;
    operationMode: EntityOperationMode;
}

export interface MultiSelectMultiChangeContext {
    type: 'multiSelectMulti';
    selectedRecordIds: MatrxRecordId[];
    changedRecords: Map<MatrxRecordId, Record<string, any>>;
    operationMode: EntityOperationMode;
    batchId?: string; // For tracking related changes
}

export type OperationContextType = SingleRecordContext | MultiSelectSingleChangeContext | MultiSelectMultiChangeContext;

export interface OperationContextState {
    contextType: OperationContextType['type'];
    context: OperationContextType;
    relationshipMap?: Map<string, Set<MatrxRecordId>>; // For tracking related records
}

export function determineOperationContext(state: EntityState<EntityKeys>, operation: EntityOperationMode): OperationContextType {
    const hasMultipleSelected = state.selection.selectedRecords.length > 1;
    const hasMultipleChanges = Object.keys(state.unsavedRecords).length > 1;

    if (!hasMultipleSelected) {
        return {
            type: 'single',
            activeRecordId: state.selection.activeRecord,
            unsavedChanges: state.unsavedRecords[state.selection.activeRecord] || {},
            operationMode: operation,
        };
    }

    if (hasMultipleSelected && !hasMultipleChanges) {
        return {
            type: 'multiSelectSingle',
            selectedRecordIds: state.selection.selectedRecords,
            activeRecordId: state.selection.activeRecord,
            unsavedChanges: state.unsavedRecords[state.selection.activeRecord] || {},
            operationMode: operation,
        };
    }

    return {
        type: 'multiSelectMulti',
        selectedRecordIds: state.selection.selectedRecords,
        changedRecords: new Map(Object.entries(state.unsavedRecords)),
        operationMode: operation,
    };
}

export function handleOperationModeChange(state: EntityState<EntityKeys>, newMode: EntityOperationMode) {
    const context = determineOperationContext(state, newMode);

    switch (context.type) {
        case 'single':
            return handleSingleRecordOperation(state, context);

        case 'multiSelectSingle':
            return handleMultiSelectSingleChange(state, context);

        case 'multiSelectMulti':
            return handleComplexMultiRecordOperation(state, context);
    }
}

export function validateOperationTransition(currentContext: OperationContextType, newMode: EntityOperationMode): boolean {
    if (currentContext.type === 'multiSelectMulti') {
        // Complex validation for multi-record changes
        return validateComplexStateTransition(currentContext, newMode);
    }

    // Simple validation for other cases
    return validateBasicStateTransition(currentContext, newMode);
}

export function handleSingleRecordOperation(state: EntityState<EntityKeys>, context: SingleRecordContext): EntityState<EntityKeys> {
    const { activeRecordId, unsavedChanges, operationMode } = context;

    switch (operationMode) {
        case 'create':
            utilsLogger.log('debug', 'handleCreateOperation called (Not Implemented)', 'handleSingleRecordOperation');
            return state; // Temporary return until implemented

        case 'update':
            utilsLogger.log('debug', 'handleUpdateOperation called (Not Implemented)', 'handleSingleRecordOperation');
            return state;

        case 'delete':
            utilsLogger.log('debug', 'handleDeleteOperation called (Not Implemented)', 'handleSingleRecordOperation');
            return state;

        case 'view':
            return state;

        default:
            utilsLogger.log('error', 'Invalid operation mode for single record operation', 'handleSingleRecordOperation');
            return state;
    }
}

export function handleMultiSelectSingleChange(state: EntityState<EntityKeys>, context: MultiSelectSingleChangeContext) {
    const { selectedRecordIds, activeRecordId, unsavedChanges, operationMode } = context;

    switch (operationMode) {
        case 'create':
            // return handleCreateOperation(state, activeRecordId, unsavedChanges);
            utilsLogger.log('debug', 'handleCreateOperation called (Not Implemented)', 'handleMultiSelectSingleChange');

        case 'update':
            // return handleUpdateOperation(state, activeRecordId, unsavedChanges);
            utilsLogger.log('debug', 'handleUpdateOperation called (Not Implemented)', 'handleMultiSelectSingleChange');

        case 'delete':
            // return handleDeleteOperation(state, activeRecordId);
            utilsLogger.log('debug', 'handleDeleteOperation called (Not Implemented)', 'handleMultiSelectSingleChange');

        default:
            utilsLogger.log('error', 'Invalid operation mode for multi-select single record operation', 'handleMultiSelectSingleChange');
            return;
    }
}

export function handleComplexMultiRecordOperation(state: EntityState<EntityKeys>, context: MultiSelectMultiChangeContext) {
    const { selectedRecordIds, changedRecords, operationMode } = context;

    switch (operationMode) {
        case 'create':
            // return handleCreateOperation(state, activeRecordId, unsavedChanges);
            utilsLogger.log('debug', 'handleCreateOperation called (Not Implemented)', 'handleComplexMultiRecordOperation');

        case 'update':
            // return handleUpdateOperation(state, activeRecordId, unsavedChanges);
            utilsLogger.log('debug', 'handleUpdateOperation called (Not Implemented)', 'handleComplexMultiRecordOperation');

        case 'delete':
            // return handleDeleteOperation(state, activeRecordId);
            utilsLogger.log('debug', 'handleDeleteOperation called (Not Implemented)', 'handleComplexMultiRecordOperation');

        default:
            utilsLogger.log('error', 'Invalid operation mode for complex multi-record operation', 'handleComplexMultiRecordOperation');
            return;
    }
}

export function validateBasicStateTransition(context: OperationContextType, newMode: EntityOperationMode): boolean {
    const { operationMode } = context;

    switch (newMode) {
        case 'create':
            return operationMode !== 'create';

        case 'update':
            return operationMode !== 'delete';

        case 'delete':
            return operationMode !== 'create';

        default:
            return false;
    }
}

export function validateComplexStateTransition(context: MultiSelectMultiChangeContext, newMode: EntityOperationMode): boolean {
    const { operationMode } = context;

    switch (newMode) {
        case 'create':
            return operationMode !== 'create';

        case 'update':
            return operationMode !== 'delete';

        case 'delete':
            return operationMode !== 'create';

        default:
            return false;
    }
}
