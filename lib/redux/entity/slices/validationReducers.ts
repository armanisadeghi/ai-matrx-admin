import { PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import {
    EntityState,
} from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "../utils/entityLogger";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const validationReducers = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    entityLogger: EntityLogger,
) => ({
    setValidated: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "setValidated");
        state.flags.isValidated = true;
    },

    resetValidated: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "resetValidated");
        state.flags.isValidated = false;
    },

    invalidateRecord: (state: EntityState<TEntity>, action: PayloadAction<string>) => {
        const recordKey = action.payload;
        entityLogger.log(DEBUG, "invalidateRecord", { recordKey });

        if (state.records[recordKey]) {
            state.cache.invalidationTriggers.push(recordKey);
            state.cache.stale = true;
        }
    },
});
