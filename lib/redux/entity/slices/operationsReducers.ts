import { PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntityOperationMode, EntityState, MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "../utils/entityLogger";
import { EntityModeManager } from "../utils/crudOpsManagement";
import { resetFlag } from "../utils/stateHelpUtils";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const operationsReducers = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    entityLogger: EntityLogger,
    modeManager: EntityModeManager
) => ({
    setOperationMode: (state: EntityState<TEntity>, action: PayloadAction<EntityOperationMode>) => {
        entityLogger.log(DEBUG, "setOperationMode", action.payload);
        const result = modeManager.changeMode(state, action.payload);
        if (!result.canProceed) {
            state.loading.error = {
                message: result.error || "Cannot change modes",
                code: 400,
            };
            return;
        }
    },

    addPendingOperation: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
        if (!state.pendingOperations.includes(action.payload)) {
            state.pendingOperations.push(action.payload);
        }
    },
    removePendingOperation: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
        state.pendingOperations = state.pendingOperations.filter((matrxRecordId) => matrxRecordId !== action.payload);
    },
    clearPendingOperations: (state: EntityState<TEntity>) => {
        state.pendingOperations = [];
    },

    cancelOperation: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "cancelOperation");
        const result = modeManager.changeMode(state, "view");
        if (result.canProceed) {
            resetFlag(state, state.flags.operationMode === "create" ? "CREATE" : "UPDATE");
        }
    },
});
