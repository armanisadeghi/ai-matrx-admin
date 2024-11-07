// lib/redux/entity/types.ts

import { EntityKeys, EntityData } from "@/types/entityTypes";

// --- Basic Types ---
export type MatrxRecordId = string;


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
    selectedRecords: string[];  // Changed from Set<string> to string[]
    activeRecord: EntityData<TEntity> | null;
    selectionMode: 'single' | 'multiple' | 'none';
    lastSelected?: string;
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
interface CacheState {
    lastFetched: Record<string, string>;  // dates as ISO strings
    staleTime: number;
    stale: boolean;
    prefetchedPages: number[];  // Changed from Set<number> to number[]
    invalidationTriggers: string[];  // Changed from Set<string> to string[]
}


// --- Quick Reference Cache ---
export interface QuickReferenceRecord {
    primaryKeyValues: Record<MatrxRecordId, string>; // Changed from MatrxRecordId to string back to MatrxRecordId as a string
    displayValue: string;
    metadata?: {
        lastModified?: string; // Already correct as string
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
    timestamp: string; // Already correct
    operation: 'create' | 'update' | 'delete' | 'bulk';
    data: EntityData<TEntity> | EntityData<TEntity>[];
    previousData?: EntityData<TEntity> | EntityData<TEntity>[];
    metadata?: {
        user?: string;
        reason?: string;
        batchId?: string;
        primaryKeyValues?: Record<string, string>; // Changed from unknown to string for consistency
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

// records: Record<MatrxRecordId, EntityData<TEntity>>; Changed from MatrxRecordId to string for consistent serialization (Back to MatrxRecordId as string)

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
    metrics: EntityMetrics;
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

