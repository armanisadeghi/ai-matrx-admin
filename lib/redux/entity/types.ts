import { EntityKeys, EntityData } from "@/types/entityTypes";

// --- Basic Types ---
export type MatrxRecordId = string | number;


type PrimaryKeyType = 'single' | 'composite' | 'none';

export interface PrimaryKeyMetadata {
    type: PrimaryKeyType;
    fields: string[];
    database_fields: string[];
    where_template: Record<string, null>;
}

// Updated EntityMetadata
export interface EntityMetadata {
    displayName: string;
    schemaType: string;
    primaryKeyMetadata: PrimaryKeyMetadata;
    fields: Array<{
        name: string;
        displayName: string;
        isPrimary?: boolean;
        isDisplayField?: boolean;
    }>;
}



// --- Selection Management ---
export interface SelectionState<TEntity extends EntityKeys> {
    selectedRecords: Set<MatrxRecordId>;
    activeRecord: EntityData<TEntity> | null;
    selectionMode: 'single' | 'multiple' | 'none';
    lastSelected?: MatrxRecordId;
}

// --- Pagination State ---
export interface PaginationState {
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
    lastOperation?: 'fetch' | 'create' | 'update' | 'delete' | 'custom' |null;
}

// --- Cache Management ---
export interface CacheState {
    lastFetched: Record<string, string>;
    staleTime: number;
    stale: boolean;
    prefetchedPages: Set<number>;
    invalidationTriggers: Set<string>;
}

// --- Quick Reference Cache ---
export interface QuickReferenceRecord {
    primaryKeyValues: Record<string, MatrxRecordId>;
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
    data: EntityData<TEntity> | EntityData<TEntity>[];
    previousData?: EntityData<TEntity> | EntityData<TEntity>[];
    metadata?: {
        user?: string;
        reason?: string;
        batchId?: string;
        primaryKeyValues?: Record<string, unknown>; // Store the PK values for reference
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

// --- Real-time Subscriptions ---
export interface SubscriptionConfig {
    enabled: boolean;
    events: Array<'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE'>;
    filters?: FilterCondition[];
    debounceMs?: number;
    batchUpdates?: boolean;
}

// --- Main Slice State ---
export interface EntityState<TEntity extends EntityKeys> {
    // Core Data
    records: Record<MatrxRecordId, EntityData<TEntity>>;

    // Metadata
    entityMetadata: EntityMetadata;

    // Quick Reference
    quickReference: QuickReferenceState;

    // State Management
    selection: SelectionState<TEntity>;
    pagination: PaginationState;
    loading: LoadingState;
    cache: CacheState;
    history: HistoryState<TEntity>;

    // Query Management
    filters: FilterState;

    // Real-time Management
    subscription: SubscriptionConfig;

    // Optimization Flags
    flags: {
        needsRefresh: boolean;
        isModified: boolean;
        hasUnsavedChanges: boolean;
        isBatchOperationInProgress: boolean;
    };
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

// Updated RecordOperation
export interface RecordOperation<TEntity extends EntityKeys> {
    primaryKeyMetadata: PrimaryKeyMetadata;
    record: EntityData<TEntity>;
}

// Updated BatchOperationPayload
export interface BatchOperationPayload<TEntity extends EntityKeys> {
    operation: 'create' | 'update' | 'delete';
    records: EntityData<TEntity>[];
    primaryKeyMetadata: PrimaryKeyMetadata;
    options?: {
        skipHistory?: boolean;
        batchSize?: number;
        onProgress?: (progress: number) => void;
    };
}
