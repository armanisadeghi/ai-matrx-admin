import {EntityData, EntityKeys} from "@/types/entityTypes";
import {
    BatchOperationPayload,
    EntityMetadata,
    FilterPayload,
    MatrxRecordId,
    SortPayload, SubscriptionConfig
} from "@/lib/redux/entity/types";
import {UnifiedQueryOptions} from "@/lib/redux/schema/globalCacheSelectors";

export interface EntityActions<TEntity extends EntityKeys> {
    // Core Record Actions
    fetchRecords: (payload: { page?: number; pageSize?: number }) => void;
    fetchQuickReference: () => void;
    createRecord: (payload: EntityData<TEntity>) => void;
    updateRecord: (payload: { id: MatrxRecordId; data: Partial<EntityData<TEntity>> }) => void;  // TODO: Correct ID
    deleteRecord: (payload: MatrxRecordId) => void;
    batchOperation: (payload: BatchOperationPayload<TEntity>) => void;

    // New Actions
    fetchOne: (payload: { id: MatrxRecordId }) => void;  // TODO: Correct ID
    fetchAll: () => void;
    executeCustomQuery: (payload: UnifiedQueryOptions<TEntity>) => void;

    // Selection Actions
    setSelection: (payload: { records: MatrxRecordId[]; mode: 'single' | 'multiple' | 'none' }) => void;
    clearSelection: () => void;

    // Pagination Actions
    setPage: (payload: number) => void;
    setPageSize: (payload: number) => void;

    // Filter Actions
    setFilters: (payload: FilterPayload) => void;
    setSorting: (payload: SortPayload) => void;
    clearFilters: () => void;

    // History Actions
    undo: () => void;
    redo: () => void;

    // Metadata Actions
    initializeEntityMetadata: (payload: EntityMetadata) => void;
    updateEntityMetadata: (payload: Partial<EntityMetadata>) => void;

    // Subscription Actions
    setSubscription: (payload: Partial<SubscriptionConfig>) => void;

    // State Management
    refreshData: () => void;
    invalidateCache: () => void;
    resetState: () => void;
}
