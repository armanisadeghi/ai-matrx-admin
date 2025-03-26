import { PayloadAction } from "@reduxjs/toolkit";
import { Draft } from "immer";
import { EntityKeys } from "@/types/entityTypes";
import { EntityState, HistoryEntry, MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { createRecordKey } from "@/lib/redux/entity/utils/stateHelpUtils";
import EntityLogger from "../utils/entityLogger";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const historyReducers = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    entityLogger: EntityLogger,
) => ({

    pushToHistory: (state: EntityState<TEntity>, action: PayloadAction<Draft<HistoryEntry<TEntity>>>) => {
        entityLogger.log(DEBUG, "pushToHistory", action.payload);
        state.history.past.push(action.payload);
        if (state.history.past.length > state.history.maxHistorySize) {
            state.history.past.shift();
        }
        state.history.future = [];
        state.history.lastSaved = new Date().toISOString();
    },

    undo: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "undo");
        const lastEntry = state.history.past.pop();
        if (lastEntry) {
            state.history.future.push(lastEntry);
            const { primaryKeyMetadata } = state.entityMetadata;

            if (Array.isArray(lastEntry.previousData)) {
                lastEntry.previousData.forEach((record) => {
                    const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, record);
                    state.records[recordKey] = record;
                });
            } else if (lastEntry.previousData) {
                const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, lastEntry.previousData);
                state.records[recordKey] = lastEntry.previousData;
            }
            state.flags.isModified = true;
            state.flags.hasUnsavedChanges = true;
        }
    },

    redo: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "redo");
        const nextEntry = state.history.future.pop();
        if (nextEntry) {
            state.history.past.push(nextEntry);
            const { primaryKeyMetadata } = state.entityMetadata;

            if (Array.isArray(nextEntry.data)) {
                nextEntry.data.forEach((record) => {
                    const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, record);
                    state.records[recordKey] = record;
                });
            } else {
                const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, nextEntry.data);
                state.records[recordKey] = nextEntry.data;
            }
            state.flags.isModified = true;
            state.flags.hasUnsavedChanges = true;
        }
    },
});
