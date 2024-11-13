// lib/redux/entity/actions.ts

import { EntityData, EntityKeys } from "@/types/entityTypes";
import {
    BatchOperationPayload,
    FilterPayload,
    MatrxRecordId,
    SortPayload,
    SubscriptionConfig,
    EntityMetadata,
    LoadingState,
    QuickReferenceRecord, EntityMetrics, EntityRecordArray, EntityRecordMap, EntityFlags,
} from "@/lib/redux/entity/types";
import { UnifiedQueryOptions } from "@/lib/redux/schema/globalCacheSelectors";
import { QueryOptions } from "./sagas";


export interface FetchRecordsPayload {
    page: number;
    pageSize: number;
    options?: {
        maxCount?: number;
        filters?: FilterPayload;
        sort?: SortPayload;
    };
}

export interface FetchOnePayload {
    primaryKeyValues: Record<string, MatrxRecordId>;
}

export interface FetchRecordsSuccessPayload<TEntity extends EntityKeys> {
    data: EntityRecordArray<TEntity>;
    page: number;
    pageSize: number;
    totalCount: number;
}



// This interface defines all possible actions for an entity
export interface EntityActions<TEntity extends EntityKeys> {

    fetchRecords: (payload: FetchRecordsPayload) => void;
    fetchQuickReference: (payload?: { maxRecords?: number }) => void;
    fetchOne: (payload: FetchOnePayload) => void;
    fetchAll: () => void;
    executeCustomQuery: (payload: UnifiedQueryOptions<TEntity>) => void;


    createRecord: (payload: EntityData<TEntity>) => void;

    updateRecord: (payload: {
        primaryKeyValues: Record<string, any>;
        data: Partial<EntityData<TEntity>>;
    }) => void;

    deleteRecord: (payload: {
        primaryKeyValues: Record<string, any>;
    }) => void;

    fetchRecordsSuccess: (payload: {
        data: EntityData<TEntity>[];
        page: number;
        pageSize: number;
        totalCount: number;
    }) => void;

    fetchOneSuccess: (payload: EntityData<TEntity>) => void;


    getOrFetchSelectedRecords: (payload: { recordIds: MatrxRecordId[] }) => void,
    fetchSelectedRecords: (payload: QueryOptions<TEntity>) => void,
    fetchSelectedRecordsSuccess: (payload: EntityData<TEntity>[]) => void;

    fetchAllSuccess: (payload: EntityData<TEntity>[]) => void;

    executeCustomQuerySuccess: (payload: EntityData<TEntity>[]) => void;

    // Record Management
    setRecords: (payload: Record<MatrxRecordId, EntityData<TEntity>>) => void;
    upsertRecords: (payload: EntityData<TEntity>[]) => void;
    removeRecords: (payload: EntityData<TEntity>[]) => void;

    // Selection Actions
    setSelection: (payload: {
        records: EntityData<TEntity>[];
        mode: 'single' | 'multiple' | 'none';
    }) => void;

    clearSelection: () => void;
    addToSelection: (payload: MatrxRecordId) => void;
    removeFromSelection: (payload: EntityData<TEntity>) => void;
    toggleSelection: (payload: EntityData<TEntity>) => void;


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

    // Quick Reference Actions
    setQuickReference: (payload: QuickReferenceRecord[]) => void;

    // Metadata Actions
    initializeEntityMetadata: (payload: EntityMetadata) => void;
    updateEntityMetadata: (payload: Partial<EntityMetadata>) => void;

    // Loading State Actions
    setLoading: (payload: boolean) => void;
    setError: (payload: LoadingState['error']) => void;

    // Subscription Actions
    setSubscription: (payload: Partial<SubscriptionConfig>) => void;

    // Flag Management
    setFlags: (payload: EntityFlags) => void;

    // State Management
    refreshData: () => void;
    invalidateCache: () => void;
    resetState: () => void;

    // Metrics Actions
    fetchMetrics: (payload?: { timeRange?: string }) => void;
    fetchMetricsSuccess: (payload: EntityMetrics) => void;
    setMetrics: (payload: Partial<EntityMetrics>) => void;
}

export interface SelectionPayload<TEntity extends EntityKeys> {
    records: EntityData<TEntity>[];
    mode: 'single' | 'multiple' | 'none';
}

export interface SingleRecordPayload<TEntity extends EntityKeys> {
    record: EntityData<TEntity>;
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


// Export updated action type
export type EntityActionType<TEntity extends EntityKeys> =
    | { type: string; payload: SelectionPayload<TEntity> }
    | { type: string; payload: FetchRecordsPayload }
    | { type: string; payload: FetchOnePayload }
    | { type: string; payload: EntityRecordArray<TEntity> }
    | { type: string; payload: EntityRecordMap<TEntity> }
    | { type: string };
