import {EntityData, EntityKeys} from "@/types/entityTypes";
import {RootState} from "@/lib/redux/store";
import {EntityMetadata, LoadingState, FilterState, MatrxRecordId, QuickReferenceRecord} from "@/lib/redux/entity/types";
import {PaginationState} from "@tanstack/table-core";

export interface EntitySelectors<TEntity extends EntityKeys> {
    // Core Data Selectors
    selectAllRecords: (state: RootState) => Record<MatrxRecordId, EntityData<TEntity>>;
    selectRecordById: (state: RootState, id: MatrxRecordId) => EntityData<TEntity> | undefined;
    selectRecordsByIds: (state: RootState, ids: MatrxRecordId[]) => EntityData<TEntity>[];

    // Quick Reference Selectors
    selectQuickReference: (state: RootState) => QuickReferenceRecord[];
    selectQuickReferenceById: (state: RootState, id: MatrxRecordId) => QuickReferenceRecord | undefined;

    // Selection Selectors
    selectSelectedRecords: (state: RootState) => EntityData<TEntity>[];
    selectActiveRecord: (state: RootState) => EntityData<TEntity> | null;
    selectSelectionMode: (state: RootState) => 'single' | 'multiple' | 'none';

    // Pagination Selectors
    selectPaginationInfo: (state: RootState) => PaginationState;
    selectCurrentPage: (state: RootState) => EntityData<TEntity>[];

    // Filter Selectors
    selectCurrentFilters: (state: RootState) => FilterState;
    selectFilteredRecords: (state: RootState) => EntityData<TEntity>[];

    // State Selectors
    selectLoadingState: (state: RootState) => LoadingState;
    selectError: (state: RootState) => LoadingState['error'];
    selectIsStale: (state: RootState) => boolean;
    selectHasUnsavedChanges: (state: RootState) => boolean;

    // Metadata Selectors
    selectEntityMetadata: (state: RootState) => EntityMetadata;
    selectPrimaryKeyField: (state: RootState) => string;
    selectDisplayField: (state: RootState) => string;
}
