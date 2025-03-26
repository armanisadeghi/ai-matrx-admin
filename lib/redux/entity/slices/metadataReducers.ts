import { PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntityState, EntityMetadata } from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "../utils/entityLogger";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const metadataReducers = <TEntity extends EntityKeys>(entityKey: TEntity, entityLogger: EntityLogger) => ({
    initializeEntityMetadata: (state: EntityState<TEntity>, action: PayloadAction<EntityMetadata>) => {
        entityLogger.log(DEBUG, "initializeEntityMetadata", action.payload);
        state.entityMetadata = action.payload;
    },

    updateEntityMetadata: (state: EntityState<TEntity>, action: PayloadAction<Partial<EntityMetadata>>) => {
        entityLogger.log(DEBUG, "updateEntityMetadata", action.payload);
        state.entityMetadata = {
            ...state.entityMetadata,
            ...action.payload,
        };
    },
});
