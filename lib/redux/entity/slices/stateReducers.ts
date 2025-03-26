import { PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntityState, LoadingState, SubscriptionConfig, EntityMetrics } from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "../utils/entityLogger";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const stateReducers = <TEntity extends EntityKeys>(entityKey: TEntity, entityLogger: EntityLogger) => ({
    setLoading: (state: EntityState<TEntity>, action: PayloadAction<boolean>) => {
        entityLogger.log(DEBUG, "setLoading", action.payload);
        state.loading.loading = action.payload;
        if (!action.payload) {
            state.loading.lastOperation = undefined;
        }
    },

    setError: (state: EntityState<TEntity>, action: PayloadAction<LoadingState["error"]>) => {
        entityLogger.log("error", "setError", action.payload);
        state.loading.error = action.payload;
        state.loading.loading = false;
    },

    // Subscription Management
    setSubscription: (state: EntityState<TEntity>, action: PayloadAction<Partial<SubscriptionConfig>>) => {
        entityLogger.log(DEBUG, "setSubscription", action.payload);
        state.subscription = {
            ...state.subscription,
            ...action.payload,
        };
    },

    // Flag Management
    setFlags: (state: EntityState<TEntity>, action: PayloadAction<Partial<EntityState<TEntity>["flags"]>>) => {
        entityLogger.log(DEBUG, "setFlags", action.payload);
        state.flags = {
            ...state.flags,
            ...action.payload,
        };
    },

    // Add the action to fetch metrics
    fetchMetrics: (state: EntityState<TEntity>, action: PayloadAction<{ timeRange?: string }>) => {
        entityLogger.log(DEBUG, "fetchMetrics", action.payload);
        state.loading.loading = true;
        state.loading.error = null;
    },

    // Add the success handler
    fetchMetricsSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityMetrics>) => {
        entityLogger.log(DEBUG, "fetchMetricsSuccess", action.payload);
        state.metrics = action.payload;
        state.loading.loading = false;
    },

    // Add the set metrics action
    setMetrics: (state: EntityState<TEntity>, action: PayloadAction<Partial<EntityMetrics>>) => {
        entityLogger.log(DEBUG, "setMetrics", action.payload);
        state.metrics = {
            ...state.metrics,
            ...action.payload,
            lastUpdated: new Date().toISOString(),
        };
    },

    // State Management
    refreshData: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "refreshData");
        state.flags.needsRefresh = true;
    },

    invalidateCache: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "invalidateCache");
        state.cache.stale = true;
    },
});
