import { PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntityState, MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import {
    setLoading,
    setSuccess,
    handleSelectionForDeletedRecord,
    setNewActiveRecord,
    checkAndUpdateUnsavedChanges,
} from "@/lib/redux/entity/utils/stateHelpUtils";
import EntityLogger from "../utils/entityLogger";
import { DeleteRecordPayload } from "@/lib/redux/entity/actions";
import { EntityModeManager } from "../utils/crudOpsManagement";

const INFO = "info";
const DEBUG = "info";
const VERBOSE = "verbose";

export const crudReducers = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    entityLogger: EntityLogger,
    modeManager: EntityModeManager
) => ({
    deleteRecord: (state: EntityState<TEntity>, action: PayloadAction<DeleteRecordPayload>) => {
        entityLogger.log(DEBUG, "deleteRecord", action.payload);
        setLoading(state, "DELETE");
    },
    deleteRecordSuccess: (state: EntityState<TEntity>, action: PayloadAction<{ matrxRecordId: MatrxRecordId }>) => {
        const recordKey = action.payload.matrxRecordId;
        entityLogger.log(DEBUG, "deleteRecordSuccess", { recordKey });
        delete state.records[recordKey];
        handleSelectionForDeletedRecord(state, recordKey);

        // Let mode manager handle any necessary cleanup
        const result = modeManager.changeMode(state, "view");
        if (result.canProceed && state.selection.lastActiveRecord && state.records[state.selection.lastActiveRecord]) {
            setNewActiveRecord(state, state.selection.lastActiveRecord);
        }
        checkAndUpdateUnsavedChanges(state);

        setSuccess(state, "DELETE");
        state.flags.isModified = true;
    },
});
