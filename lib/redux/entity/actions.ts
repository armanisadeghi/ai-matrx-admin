import { EntityData, EntityKeys } from "@/types/entityTypes";
import {
    BatchOperationPayload,
    FilterPayload,
    MatrxRecordId,
    SortPayload,
    SubscriptionConfig,
    EntityMetadata,
    LoadingState,
    QuickReferenceRecord,
} from "@/lib/redux/entity/types";
import { UnifiedQueryOptions } from "@/lib/redux/schema/globalCacheSelectors";

// This interface defines all possible actions for an entity
export interface EntityActions<TEntity extends EntityKeys> {
    // Core Record Actions
    fetchRecords: (payload: {
        page: number;
        pageSize: number;
    }) => void;

    fetchQuickReference: () => void;

    fetchOne: (payload: {
        primaryKeyValues: Record<string, MatrxRecordId>;
    }) => void;

    fetchAll: () => void;

    executeCustomQuery: (payload: UnifiedQueryOptions<TEntity>) => void;

    createRecord: (payload: EntityData<TEntity>) => void;

    updateRecord: (payload: {
        primaryKeyValues: Record<string, MatrxRecordId>;
        data: Partial<EntityData<TEntity>>;
    }) => void;

    deleteRecord: (payload: {
        primaryKeyValues: Record<string, MatrxRecordId>;
    }) => void;

    // Success Actions
    fetchRecordsSuccess: (payload: {
        data: EntityData<TEntity>[];
        page: number;
        pageSize: number;
        totalCount: number;
    }) => void;

    fetchOneSuccess: (payload: EntityData<TEntity>) => void;

    fetchAllSuccess: (payload: EntityData<TEntity>[]) => void;

    executeCustomQuerySuccess: (payload: EntityData<TEntity>[]) => void;

    // Record Management
    setRecords: (payload: Record<string, EntityData<TEntity>>) => void;
    upsertRecords: (payload: EntityData<TEntity>[]) => void;
    removeRecords: (payload: EntityData<TEntity>[]) => void;

    // Selection Actions
    setSelection: (payload: {
        records: EntityData<TEntity>[];
        mode: 'single' | 'multiple' | 'none';
    }) => void;
    clearSelection: () => void;

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
    setFlags: (payload: {
        needsRefresh?: boolean;
        isModified?: boolean;
        hasUnsavedChanges?: boolean;
        isBatchOperationInProgress?: boolean;
    }) => void;

    // State Management
    refreshData: () => void;
    invalidateCache: () => void;
    resetState: () => void;
}

// Export action type for use in sagas and components
export type EntityActionType<TEntity extends EntityKeys> = ReturnType<EntityActions<TEntity>[keyof EntityActions<TEntity>]>;
