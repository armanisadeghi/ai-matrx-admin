import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntityState } from "@/lib/redux/entity/types/stateTypes";
import { clearError, setError, setLoading, setSuccess } from "@/lib/redux/entity/utils/stateHelpUtils";
import EntityLogger from "./utils/entityLogger";
import { EntityModeManager } from "./utils/crudOpsManagement";
import { getOrFetchSelectedRecordsThunk } from "./thunks";
import { fetchReducers } from "./slices/fetchReducers";
import { crudReducers } from "./slices/crudReducers";
import { selectionReducers } from "./slices/selectionReducers";
import { updateReducers } from "./slices/updateReducers";
import { historyReducers } from "./slices/historyReducers";
import { paginationReducers } from "./slices/paginationReducers";
import { operationsReducers } from "./slices/operationsReducers";
import { stateReducers } from "./slices/stateReducers";
import { creationReducers } from "./slices/creationReducers";
import { recordsReducers } from "./slices/recordsReducers";
import { metadataReducers } from "./slices/metadataReducers";
import { validationReducers } from "./slices/validationReducers";
import { relationshipReducers } from "./slices/relationshipReducers";
import { customReducers } from "./slices/customReducers";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const createEntitySlice = <TEntity extends EntityKeys>(entityKey: TEntity, initialState: EntityState<TEntity>) => {
    const entityLogger = EntityLogger.createLoggerWithDefaults(`Entity Slice`, entityKey.toUpperCase());
    const modeManager = new EntityModeManager(entityKey);

    const slice = createSlice({
        name: `ENTITIES/${entityKey.toUpperCase()}`,
        initialState,
        reducers: {
            ...fetchReducers(entityKey, entityLogger),
            ...creationReducers(entityKey, entityLogger, modeManager),
            ...crudReducers(entityKey, entityLogger, modeManager),
            ...selectionReducers(entityKey, entityLogger),
            ...updateReducers(entityKey, modeManager),
            ...historyReducers(entityKey, entityLogger),
            ...paginationReducers(entityKey, entityLogger),
            ...operationsReducers(entityKey, entityLogger, modeManager),
            ...stateReducers(entityKey, entityLogger),
            ...recordsReducers(entityKey, entityLogger),
            ...metadataReducers(entityKey, entityLogger),
            ...validationReducers(entityKey, entityLogger),
            ...relationshipReducers(entityKey, entityLogger),
            ...customReducers(entityKey, entityLogger),

            resetState: () => initialState,
        },

        extraReducers: (builder) => {
            builder
                .addCase(getOrFetchSelectedRecordsThunk.pending, (state) => {
                    entityLogger.log(DEBUG, "getOrFetchSelectedRecordsThunk pending");
                    setLoading(state, "GET_OR_FETCH_RECORDS");
                })
                .addCase(getOrFetchSelectedRecordsThunk.fulfilled, (state) => {
                    entityLogger.log(DEBUG, "getOrFetchSelectedRecordsThunk fulfilled");
                    setSuccess(state, "GET_OR_FETCH_RECORDS");
                    clearError(state);
                })
                .addCase(getOrFetchSelectedRecordsThunk.rejected, (state, action) => {
                    entityLogger.log("error", "getOrFetchSelectedRecordsThunk rejected", action.error);
                    setError(state, {
                        payload: {
                            message: action.error.message || "An error occurred during fetch by record IDs.",
                            code: action.error.code,
                        },
                    });
                })

                .addMatcher(
                    (action) => action.type.endsWith("/rejected"),
                    (state, action: PayloadAction<{ message?: string; code?: number; details?: any }>) => {
                        entityLogger.log("error", "Rejected action", action.payload);
                        setError(state, action);
                    }
                )
                .addMatcher(
                    (action) => action.type.endsWith("/fulfilled"),
                    (state) => {
                        entityLogger.log(DEBUG, "Fulfilled action");
                        clearError(state);
                    }
                );
        },
    });

    return {
        reducer: slice.reducer,
        actions: slice.actions,
    };
};

export type EntitySlice<TEntity extends EntityKeys> = ReturnType<typeof createEntitySlice<TEntity>>;
export type EntityActions<TEntity extends EntityKeys> = EntitySlice<TEntity>["actions"];
