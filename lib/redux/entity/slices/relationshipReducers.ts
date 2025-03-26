import { PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntityState, FilterPayload, SortPayload } from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "../utils/entityLogger";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export type RuntimeFilter = {
    field: string;
    operator: "eq" | "neq";
    value: unknown;
};

export type RuntimeSort = {
    field: string;
    direction: "asc" | "desc";
};

// // --- Main Slice State ---
// export interface EntityState<TEntity extends EntityKeys> {
//     entityMetadata: EntityMetadata; // Field info is here: entityMetadata.fields has this: EntityStateField[]
//     records: Record<MatrxRecordId, EntityData<TEntity>>
//     unsavedRecords: Record<MatrxRecordId, Partial<EntityData<TEntity>>>;
//     pendingOperations: MatrxRecordId[]; // Array instead of Set
//     quickReference: QuickReferenceState;
//     selection: SelectionState;
//     pagination: PaginationState;
//     loading: LoadingState;
//     cache: CacheState;
//     history: HistoryState<TEntity>;
//     filters: FilterState;
//     subscription: SubscriptionConfig;
//     flags: EntityFlags;
//     metrics: EntityMetrics;

//     parentEntityField?: string;
//     activeParentId?: string;
//     runtimeFilters?: RuntimeFilter[];
//     runtimeSort?: RuntimeSort;
// }

export const relationshipReducers = <TEntity extends EntityKeys>(entityKey: TEntity, entityLogger: EntityLogger) => ({
    setParentEntityField: (state: EntityState<TEntity>, action: PayloadAction<string>) => {
        entityLogger.log(DEBUG, "setParentEntityField", action.payload);
        state.parentEntityField = action.payload;
    },

    setActiveParentId: (state: EntityState<TEntity>, action: PayloadAction<string>) => {
        entityLogger.log(DEBUG, "setActiveParentId", action.payload);
        state.activeParentId = action.payload;
    },

    setRuntimeFilters: (state: EntityState<TEntity>, action: PayloadAction<RuntimeFilter[]>) => {
        entityLogger.log(DEBUG, "setRuntimeFilters", action.payload);
        state.runtimeFilters = action.payload;
    },

    addRuntimeFilter: (state: EntityState<TEntity>, action: PayloadAction<RuntimeFilter>) => {
        entityLogger.log(DEBUG, "addRuntimeFilter", action.payload);
        state.runtimeFilters = [...state.runtimeFilters, action.payload];
    },

    setRuntimeSort: (state: EntityState<TEntity>, action: PayloadAction<RuntimeSort>) => {
        entityLogger.log(DEBUG, "setRuntimeSort", action.payload);
        state.runtimeSort = action.payload;
    },

    clearRuntimeFilters: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "clearRuntimeFilters");
        state.runtimeFilters = [];
    },

    clearRuntimeSort: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "clearRuntimeSort");
        state.runtimeSort = undefined;
    },

    clearParentEntityField: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "clearParentEntityField");
        state.parentEntityField = undefined;
    },

    clearActiveParentId: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "clearActiveParentId");
        state.activeParentId = undefined;
    },

    clearAllRuntime: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "clearAllRuntime");
        state.runtimeFilters = [];
        state.runtimeSort = undefined;
        state.parentEntityField = undefined;
        state.activeParentId = undefined;
    },
});
