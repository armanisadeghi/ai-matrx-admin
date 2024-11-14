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
    EntityError,
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
    matrxRecordId: MatrxRecordId;
}

export interface FetchRecordsSuccessPayload<TEntity extends EntityKeys> {
    data: EntityRecordArray<TEntity>;
    page: number;
    pageSize: number;
    totalCount: number;
}

export interface OperationCallbacks<T = void> {
    onSuccess?: (result: T) => void;
    onError?: (error: EntityError) => void;
}

export type WithCallbacks<Payload, Result = void> = Payload & OperationCallbacks<Result>;


// This interface defines all possible actions for an entity
export interface EntityActions<TEntity extends EntityKeys> {

    fetchOne: (payload: WithCallbacks<FetchOnePayload, EntityData<TEntity>>) => void;
    fetchOneSuccess: (payload: EntityData<TEntity>) => void;

    fetchQuickReference: (payload?: WithCallbacks<{ maxRecords?: number }, QuickReferenceRecord[]>) => void;
    setQuickReference: (payload: QuickReferenceRecord[]) => void;


    fetchRecords: (payload: WithCallbacks<FetchRecordsPayload, EntityData<TEntity>[]>) => void;

    fetchAll: (payload?: WithCallbacks<{}, EntityData<TEntity>[]>) => void;
    executeCustomQuery: (payload: WithCallbacks<UnifiedQueryOptions<TEntity>, EntityData<TEntity>[]>) => void;

    createRecord: (payload: WithCallbacks<EntityData<TEntity>, EntityData<TEntity>>) => void;

    updateRecord: (payload: WithCallbacks<{
        matrxRecordId: MatrxRecordId;
        data: Partial<EntityData<TEntity>>;
    }, EntityData<TEntity>>) => void;

    deleteRecord: (payload: WithCallbacks<{
        matrxRecordId: MatrxRecordId;
    }, void>) => void;

    fetchRecordsSuccess: (payload: {
        data: EntityData<TEntity>[];
        page: number;
        pageSize: number;
        totalCount: number;
    }) => void;



    fetchAllSuccess: (payload: EntityData<TEntity>[]) => void;

    executeCustomQuerySuccess: (payload: EntityData<TEntity>[]) => void;

    // Record Management
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
    fetchSelectedRecords: (payload: WithCallbacks<QueryOptions<TEntity>, EntityData<TEntity>[]>) => void;
    fetchSelectedRecordsSuccess: (payload: EntityData<TEntity>[]) => void;


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

    // Flag Management
    setFlags: (payload: EntityFlags) => void;

    // State Management
    refreshData: () => void;
    invalidateCache: () => void;
    resetState: () => void;

    // Metrics Actions
    fetchMetrics: (payload?: WithCallbacks<{ timeRange?: string }, EntityMetrics>) => void;
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
