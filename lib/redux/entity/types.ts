// lib/redux/entity/types.ts

import {DataStructure, FieldDataOptionsType} from "@/types/AutomationSchemaTypes";


import {EntityKeys, EntityData, AllEntityFieldKeys, AnyEntityDatabaseTable} from "@/types/entityTypes";

// --- Basic Types ---
export type MatrxRecordId = string;
export type EntityRecord<TEntity extends EntityKeys> = EntityData<TEntity>;
export type EntityRecordMap<TEntity extends EntityKeys> = Record<MatrxRecordId, EntityData<TEntity>>;
export type EntityRecordArray<TEntity extends EntityKeys> = EntityData<TEntity>[];


type PrimaryKeyType = 'single' | 'composite' | 'none';

export interface PrimaryKeyMetadata {
    type: PrimaryKeyType;
    fields: AllEntityFieldKeys[];
    database_fields: string[];
    where_template: Record<string, null>;
}

export interface DisplayFieldMetadata {
    fieldName: AllEntityFieldKeys | null;
    databaseFieldName: string | null;
}

export interface EntityStateField {
    name: AllEntityFieldKeys;
    displayName: string;
    isPrimaryKey: boolean;
    isDisplayField?: boolean;
    dataType: FieldDataOptionsType;
    isArray: boolean;
    structure: DataStructure;
    isNative: boolean;
    defaultComponent?: string;
    componentProps: ComponentProps;
    isRequired: boolean;
    maxLength: number;
    defaultValue: any;
    defaultGeneratorFunction: string;
    validationFunctions: string[];
    exclusionRules: string[];
    enumValues: string[];
    entityName: EntityKeys;
    databaseTable: AnyEntityDatabaseTable;
    description: string;
}


export interface EntityMetadata {
    displayName: string;
    schemaType: string;
    primaryKeyMetadata: PrimaryKeyMetadata;
    displayFieldMetadata: DisplayFieldMetadata;
    displayField?: string;
    fields: EntityStateField[];
}

export type ComponentProps = {
    variant: string;
    placeholder: string;
    size: string;
    textSize: string;
    textColor: string;
    rows: string;
    animation: string;
    fullWidthValue: string;
    fullWidth: string;
    disabled: string;
    className: string;
    type: string;
    onChange: string;
    formatString: string;
    minDate: string;
    maxDate: string;
    [key: string]: string;
};

// --- Pagination State ---
export interface PaginationState {
    pageIndex: number;
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    maxCount?: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

// --- Loading and Error Management ---
export interface LoadingState {
    loading: boolean;
    initialized: boolean;
    error: {
        message: string;
        code?: number;
        details?: unknown;
    } | null;
    lastOperation?: 'fetch' | 'create' | 'update' | 'delete' | 'custom' | null;
}

export interface EntityError {
    message: string;
    code?: number;
    details?: unknown;
    lastOperation?: 'fetch' | 'create' | 'update' | 'delete' | 'custom' | null;
}


// --- Cache Management ---
interface CacheState {
    lastFetched: Record<string, string>;  // dates as ISO strings
    staleTime: number;
    stale: boolean;
    prefetchedPages: number[];  // Changed from Set<number> to number[]
    invalidationTriggers: string[];  // Changed from Set<string> to string[]
}


// --- Quick Reference Cache ---
export interface QuickReferenceRecord {
    recordKey: MatrxRecordId;
    primaryKeyValues: Record<AllEntityFieldKeys, any>;
    displayValue: string;
    metadata?: {
        lastModified?: string;
        createdBy?: string;
        status?: string;
    };
}

export interface QuickReferenceState {
    records: QuickReferenceRecord[];
    lastUpdated: string;
    totalAvailable: number;
    fetchComplete: boolean;
}


// --- History Management ---
export interface HistoryEntry<TEntity extends EntityKeys> {
    timestamp: string;
    operation: 'create' | 'update' | 'delete' | 'bulk';
    data: EntityRecord<TEntity> | EntityRecordArray<TEntity>;
    previousData?: EntityRecord<TEntity> | EntityRecordArray<TEntity>;
    metadata?: {
        user?: string;
        reason?: string;
        batchId?: string;
        primaryKeyValues?: Record<string, MatrxRecordId>;
    };
}


export interface HistoryState<TEntity extends EntityKeys> {
    past: HistoryEntry<TEntity>[];
    future: HistoryEntry<TEntity>[];
    maxHistorySize: number;
    lastSaved?: string;
}

// --- Query and Filter Types ---
type ComparisonOperator =
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'like'
    | 'ilike'
    | 'in'
    | 'between';

export interface FilterCondition {
    field: string;
    operator: ComparisonOperator;
    value: unknown;
    or?: FilterCondition[];
    and?: FilterCondition[];
}

export interface FilterState {
    conditions: FilterCondition[];
    sort: Array<{
        field: string;
        direction: 'asc' | 'desc';
    }>;
    search?: string;
    savedFilters?: Record<string, FilterCondition[]>;
}

export interface FilterPayload {
    conditions: FilterCondition[];
    replace?: boolean;
    temporary?: boolean;
}

export interface SortPayload {
    field: string;
    direction: 'asc' | 'desc';
    append?: boolean;
}

// --- Real-time Subscriptions ---
export interface SubscriptionConfig {
    enabled: boolean;
    events: Array<'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE'>;
    filters?: FilterCondition[];
    debounceMs?: number;
    batchUpdates?: boolean;
}

// records: Record<MatrxRecordId, EntityData<TEntity>>; Changed from MatrxRecordId to string for consistent serialization (Back to MatrxRecordId as string)

interface combinedQuickReferenceState {
    records: {
        primaryKeyValues: Record<string, MatrxRecordId>;
        displayValue: string;
        metadata?: {
            lastModified?: string;
            createdBy?: string;
            status?: string;
        };
    }[];
    lastUpdated: string;
    totalAvailable: number;
    fetchComplete: boolean;
}

interface CombinedEntityMetadata {
    displayName: string;
    schemaType: string;
    primaryKeyMetadata: {
        type: 'single' | 'composite' | 'none';
        fields: string[];
        database_fields: string[];
        where_template: Record<string, null>;
    };
    DisplayFieldMetadata: {
        fieldName: string;
        databaseFieldName: string;
    }
    displayField?: string;
    fields: {
        name: string;
        displayName: string;
        isPrimaryKey: boolean;
        isDisplayField: boolean;
        dataType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'undefined' | 'any' | 'function' | 'date';
        isArray: boolean;
        structure: 'single' | 'array' | 'object' | 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
        isNative: boolean;
        defaultComponent: string | null;
        componentProps: Record<string, unknown>;
        isRequired: boolean;
        maxLength: number | null;
        defaultValue: any;
        defaultGeneratorFunction: string | null;
        validationFunctions: string[] | null;
        exclusionRules: string[] | null;
        databaseTable: string | null;
    }[];
}

interface SimplifiedEntityState {
    records: Record<MatrxRecordId, Record<string, unknown>>;

    quickReference: {
        records: {
            primaryKeyValues: Record<string, MatrxRecordId>;
            displayValue: string;
            recordKey: string;
            metadata?: {
                lastModified?: string;
                createdBy?: string;
                status?: string;
            };
        }[];
        lastUpdated: string;
        totalAvailable: number;
        fetchComplete: boolean;
    };

    selection: {
        selectedRecords: MatrxRecordId[];
        selectionMode: 'single' | 'multiple' | 'none';
        activeRecord: Record<string, unknown> | null;
        lastSelected?: MatrxRecordId;
    }

    entityMetadata: {
        displayName: string;
        schemaType: string;
        primaryKeyMetadata: {
            type: 'single' | 'composite' | 'none';
            fields: string[];
            database_fields: string[];
            where_template: Record<string, null>;
        };
        DisplayFieldMetadata: {
            fieldName: string;
            databaseFieldName: string;
        }
        displayField?: string;
        fields: {
            name: string;
            displayName: string;
            isPrimaryKey: boolean;
            isDisplayField: boolean;
            dataType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'undefined' | 'any' | 'function' | 'date';
            isArray: boolean;
            structure: 'single' | 'array' | 'object' | 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
            isNative: boolean;
            defaultComponent: string | null;
            componentProps: Record<string, unknown>;
            isRequired: boolean;
            maxLength: number | null;
            defaultValue: any;
            defaultGeneratorFunction: string | null;
            validationFunctions: string[] | null;
            exclusionRules: string[] | null;
            databaseTable: string | null;
            entityName: string;
        }[];
    };
}

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


// --- Main Slice State ---
export interface EntityState<TEntity extends EntityKeys> {
    // Metadata
    entityMetadata: EntityMetadata;  // Field info is here: entityMetadata.fields has this: EntityStateField[]

    // Core Data
    records: Record<MatrxRecordId, EntityData<TEntity>>;   // Data is here

    // Quick Reference
    quickReference: QuickReferenceState;  // Quick reference data is here

    // State Management
    selection: SelectionState;
    pagination: PaginationState;
    loading: LoadingState;
    cache: CacheState;
    history: HistoryState<TEntity>;

    // Query Management
    filters: FilterState;

    // Real-time Management
    subscription: SubscriptionConfig;

    flags: EntityFlags;

    metrics: EntityMetrics;
}

export interface EntityFlags {
    needsRefresh?: boolean;
    isModified?: boolean;
    hasUnsavedChanges?: boolean;
    isBatchOperationInProgress?: boolean;
    isValidated?: boolean;
    fetchOneSuccess?: boolean;
    fetchOneStatus?: 'success' | 'error' | 'loading' | 'idle';
}


export interface RecordOperation<TEntity extends EntityKeys> {
    primaryKeyMetadata: PrimaryKeyMetadata;
    record: EntityRecord<TEntity>;
}


export interface BatchOperationPayload<TEntity extends EntityKeys> {
    operation: 'create' | 'update' | 'delete';
    records: EntityRecordArray<TEntity>;
    primaryKeyMetadata: PrimaryKeyMetadata;
    options?: {
        skipHistory?: boolean;
        batchSize?: number;
        onProgress?: (progress: number) => void;
    };
}


// Add these interfaces to your types file
export interface EntityMetrics {
    operationCounts: {
        creates: number;
        updates: number;
        deletes: number;
        timeline: Array<{
            timestamp: string;
            creates: number;
            updates: number;
            deletes: number;
        }>;
    };
    performanceMetrics: {
        responseTimes: Array<{
            timestamp: string;
            avgResponseTime: number;
            p95ResponseTime: number;
        }>;
        throughput: Array<{
            timestamp: string;
            reads: number;
            writes: number;
        }>;
    };
    cacheStats: {
        hitRate: Array<{
            timestamp: string;
            hitRate: number;
        }>;
        size: Array<{
            timestamp: string;
            size: number;
        }>;
        totalHits: number;
        totalMisses: number;
        evictions: number;
        memoryUsage: string;
    };
    errorRates: {
        timeline: Array<{
            timestamp: string;
            errorRate: number;
        }>;
        distribution: Array<{
            errorType: string;
            count: number;
        }>;
        recent: Array<{
            timestamp: string;
            type: string;
            message: string;
            details?: any;
        }>;
    };
    lastUpdated: string;
}

