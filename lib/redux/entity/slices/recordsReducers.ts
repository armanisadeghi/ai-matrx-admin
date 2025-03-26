import { PayloadAction } from "@reduxjs/toolkit";
import { Draft } from "immer";
import { EntityData, EntityKeys } from "@/types/entityTypes";
import { EntityState, MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "../utils/entityLogger";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const recordsReducers = <TEntity extends EntityKeys>(entityKey: TEntity, entityLogger: EntityLogger) => ({
    setRecords: (state: EntityState<TEntity>, action: PayloadAction<Record<string, Draft<EntityData<TEntity>>>>) => {
        entityLogger.log(DEBUG, "setRecords", action.payload);
        state.records = action.payload;
        state.loading.lastOperation = "FETCH";
        const cacheKey = state.entityMetadata.primaryKeyMetadata.database_fields.join("::");
        state.cache.lastFetched[cacheKey] = new Date().toISOString();
        state.cache.stale = false;
    },

    upsertRecords: (state: EntityState<TEntity>, action: PayloadAction<{ recordKey: MatrxRecordId; record: EntityData<TEntity> }[]>) => {
        action.payload.forEach(({ recordKey, record }) => {
            state.records[recordKey] = {
                ...(state.records[recordKey] || {}),
                ...record,
            };
        });

        state.flags.isModified = true;
        state.flags.hasUnsavedChanges = true;
    },

    removeRecords: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId[]>) => {
        entityLogger.log(DEBUG, "removeRecords", action.payload);

        action.payload.forEach((recordKey) => {
            delete state.records[recordKey];
        });

        state.quickReference.records = state.quickReference.records.filter(
            (quickRefRecord) => !action.payload.includes(quickRefRecord.recordKey)
        );

        state.flags.isModified = true;
        state.flags.hasUnsavedChanges = true;
    },
});
