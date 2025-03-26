import { PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import {
    EntityState,
    FilterPayload,
    SortPayload,
} from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "../utils/entityLogger";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const paginationReducers = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    entityLogger: EntityLogger,
) => ({

    setPage: (state: EntityState<TEntity>, action: PayloadAction<number>) => {
        entityLogger.log(DEBUG, "setPage", action.payload);
        state.pagination.page = action.payload;
        state.flags.needsRefresh = true;
    },

    setPageSize: (state: EntityState<TEntity>, action: PayloadAction<number>) => {
        entityLogger.log(DEBUG, "setPageSize", action.payload);
        state.pagination.pageSize = action.payload;
        state.pagination.page = 1;
        state.flags.needsRefresh = true;
    },

    // Filter Management
    setFilters: (state: EntityState<TEntity>, action: PayloadAction<FilterPayload>) => {
        const { conditions, replace, temporary } = action.payload;
        entityLogger.log(DEBUG, "setFilters", action.payload);

        if (replace) {
            state.filters.conditions = conditions;
        } else {
            state.filters.conditions = [...state.filters.conditions, ...conditions];
        }
        if (!temporary) {
            state.flags.needsRefresh = true;
        }
    },

    setSorting: (state: EntityState<TEntity>, action: PayloadAction<SortPayload>) => {
        const { field, direction, append } = action.payload;
        const newSort = { field, direction };
        entityLogger.log(DEBUG, "setSorting", action.payload);

        if (append) {
            state.filters.sort.push(newSort);
        } else {
            state.filters.sort = [newSort];
        }
        state.flags.needsRefresh = true;
    },

    clearFilters: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "clearFilters");
        state.filters.conditions = [];
        state.filters.sort = [];
        state.flags.needsRefresh = true;
    },
});
