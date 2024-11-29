// lib/redux/entity/actions.ts

import {AllEntityFieldKeys, AllEntityNameVariations, EntityData, EntityKeys} from "@/types/entityTypes";
import {
    BatchOperationPayload,
    FilterPayload,
    MatrxRecordId,
    SortPayload,
    SubscriptionConfig,
    EntityMetadata,
    LoadingState,
    QuickReferenceRecord, EntityMetrics, EntityRecordArray, EntityRecordMap, EntityFlags,
    EntityError,
} from "@/lib/redux/entity/types/stateTypes";
import { UnifiedQueryOptions } from "@/lib/redux/schema/globalCacheSelectors";
import { QueryOptions } from "./sagas/sagaHelpers";


export type EntityRecordPayload<TEntity extends EntityKeys> = {
    data: EntityData<TEntity>;
    callbackId?: string;
};

export type EntityRecordArrayPayload<TEntity extends EntityKeys> = {
    data: EntityData<TEntity>[];
    callbackId?: string;
};

export type EntityRecordMapPayload<TEntity extends EntityKeys> = {
    data: Record<MatrxRecordId, EntityData<TEntity>>;
    callbackId?: string;
};

export interface FetchRecordsSuccessPayload<TEntity extends EntityKeys> {
    data: EntityRecordArray<TEntity>;
    page: number;
    pageSize: number;
    totalCount: number;
}

export type CreateRecordPayload<TEntity extends EntityKeys> = {
    data: Partial<EntityData<TEntity>>;
    callbackId?: string;
};

interface FlexibleQueryOptions {
    entityNameAnyFormat: AllEntityNameVariations;
    callback?: string;
    recordKeys?: MatrxRecordId[];

    matrxRecordId?: MatrxRecordId;

    filters?: Partial<Record<AllEntityFieldKeys, unknown>>;
    sorts?: Array<{
        column: AllEntityFieldKeys;
        ascending?: boolean;
        append?: boolean;
    }>;
    limit?: number;
    offset?: number;
    maxCount?: number;
    columns?: AllEntityFieldKeys[];
    data?: unknown | unknown[];
    page?: number;
    pageSize?: number;

    callbackId?: string;
}

export interface SortPayload {
    field: string;
    direction: 'asc' | 'desc';
    append?: boolean;
}


export interface FetchRecordsPayload {
    page: number;
    pageSize: number;
    callbackId?: string;
    options?: {
        maxCount?: number;
        filters?: FilterPayload;
        sort?: SortPayload;
    };
}

export type UpdateRecordPayload<TEntity extends EntityKeys> = {
    matrxRecordId: MatrxRecordId;
    data: Partial<EntityData<TEntity>>;
    callbackId?: string;
};

export type DeleteRecordPayload = {
    matrxRecordId: MatrxRecordId;
    callbackId?: string;
};

export type FetchAllPayload = {
    callbackId?: string;
};

export type FetchOnePayload = {
    matrxRecordId: MatrxRecordId;
    callbackId?: string;
};

export type FetchQuickReferencePayload = {
    maxRecords?: number;
    callbackId?: string;
};

export type ExecuteCustomQueryPayload = {
    query: UnifiedQueryOptions<EntityKeys>;
    callbackId?: string;
};

export interface EntityActions<TEntity extends EntityKeys> {
    // Fetch Actions
    fetchOne: (payload: FetchOnePayload) => void;
    fetchOneSuccess: (payload: EntityData<TEntity>) => void;

    fetchQuickReference: (payload?: FetchQuickReferencePayload) => void;
    setQuickReference: (payload: QuickReferenceRecord[]) => void;

    fetchRecords: (payload: FetchRecordsPayload) => void;
    fetchRecordsSuccess: (payload: FetchRecordsSuccessPayload<TEntity>) => void;

    fetchAll: (payload?: FetchAllPayload) => void;
    fetchAllSuccess: (payload: EntityData<TEntity>[]) => void;

    executeCustomQuery: (payload: ExecuteCustomQueryPayload) => void;
    executeCustomQuerySuccess: (payload: EntityData<TEntity>[]) => void;

    fetchSelectedRecords: (payload: QueryOptions<TEntity> & { callbackId?: string }) => void;
    fetchSelectedRecordsSuccess: (payload: EntityData<TEntity>[]) => void;

    createRecord: (payload: CreateRecordPayload<TEntity>) => void;
    createRecordSuccess: (payload: EntityData<TEntity>) => void;

    updateRecord: (payload: UpdateRecordPayload<TEntity>) => void;
    updateRecordSuccess: (payload: EntityData<TEntity>) => void;

    deleteRecord: (payload: DeleteRecordPayload) => void;
    deleteRecordSuccess: (payload: { matrxRecordId: MatrxRecordId }) => void;

    // Record Management Actions
    setRecords: (payload: Record<MatrxRecordId, EntityData<TEntity>>) => void;
    upsertRecords: (payload: EntityData<TEntity>[]) => void;
    removeRecords: (payload: EntityData<TEntity>[]) => void;

    // Selection Management
    setSelectionMode: (payload: SelectionMode) => void;
    setToggleSelectionMode: () => void;
    clearSelection: () => void;
    addToSelection: (payload: MatrxRecordId) => void;
    removeFromSelection: (payload: MatrxRecordId) => void;
    setActiveRecord: (payload: MatrxRecordId) => void;
    clearActiveRecord: () => void;
    getOrFetchSelectedRecords: (payload: MatrxRecordId[]) => void;

    // History Actions
    pushToHistory: (payload: {
        data: EntityData<TEntity> | EntityData<TEntity>[];
        previousData?: EntityData<TEntity> | EntityData<TEntity>[];
    }) => void;
    undo: () => void;
    redo: () => void;

    // Pagination Actions
    setPage: (payload: number) => void;
    setPageSize: (payload: number) => void;

    // Filter Actions
    setFilters: (payload: FilterPayload) => void;
    setSorting: (payload: SortPayload) => void;
    clearFilters: () => void;

    // Metadata Actions
    initializeEntityMetadata: (payload: EntityMetadata) => void;
    updateEntityMetadata: (payload: Partial<EntityMetadata>) => void;

    // Loading State Actions
    setLoading: (payload: boolean) => void;
    setError: (payload: LoadingState['error']) => void;

    // Subscription Actions
    setSubscription: (payload: Partial<SubscriptionConfig>) => void;

    // Flag Management Actions
    setFlags: (payload: EntityFlags) => void;

    // State Management Actions
    refreshData: () => void;
    invalidateCache: () => void;
    resetState: () => void;

    // Metrics Actions
    fetchMetrics: (payload?: { timeRange?: string; callbackId?: string }) => void;
    fetchMetricsSuccess: (payload: EntityMetrics) => void;
    setMetrics: (payload: Partial<EntityMetrics>) => void;
}



export interface SelectionPayload<TEntity extends EntityKeys> {
    records: EntityData<TEntity>[];
    mode: 'single' | 'multiple' | 'none';
}

export const isSelectionAction = (
    action: any
): action is { type: string; payload: SelectionPayload<any> } => {
    return (
        action.type.endsWith('/setSelection') &&
        'records' in action.payload &&
        'mode' in action.payload &&
        Array.isArray(action.payload.records) &&
        ['single', 'multiple', 'none'].includes(action.payload.mode)
    );
};


// // Export updated action type
// export type EntityActionType<TEntity extends EntityKeys> =
//     | { type: string; payload: SelectionPayload<TEntity> }
//     | { type: string; payload: FetchRecordsPayload }
//     | { type: string; payload: FetchOnePayload }
//     | { type: string; payload: EntityRecordArray<TEntity> }
//     | { type: string; payload: EntityRecordMap<TEntity> }
//     | { type: string };
