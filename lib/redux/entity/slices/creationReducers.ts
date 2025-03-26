import { PayloadAction } from "@reduxjs/toolkit";
import { EntityData, EntityKeys } from "@/types/entityTypes";
import { EntityState } from "@/lib/redux/entity/types/stateTypes";
import {
    createRecordKey,
    setLoading,
    setSuccess,
    setNewActiveRecord,
    removeFromUnsavedRecords,
} from "@/lib/redux/entity/utils/stateHelpUtils";
import EntityLogger from "../utils/entityLogger";
import { CreateRecordPayload, createRecordSuccessPayload, DirectCreateRecordPayload } from "@/lib/redux/entity/actions";
import { EntityModeManager } from "../utils/crudOpsManagement";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const creationReducers = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    entityLogger: EntityLogger,
    modeManager: EntityModeManager
) => ({
    startRecordCreation: (state: EntityState<TEntity>, action: PayloadAction<{ count?: number; tempId?: string }>) => {
        entityLogger.log(DEBUG, "startRecordCreation", action.payload);
        const result = modeManager.changeMode(state, "create", action.payload.tempId);
        if (!result.canProceed) {
            state.loading.error = {
                message: result.error || "Cannot start creation",
                code: 400,
            };
            return;
        }
        // Since we are only STARTING the process, there is nothing to load so we use 'reverseLoading' = true
        setLoading(state, "CREATE", true);
    },

    startRecordCreationWithData: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            tempId: string; // Making this required since we need it for the record
            initialData: Partial<EntityData<TEntity>>; // Making this required since this is the purpose of this action
        }>
    ) => {
        entityLogger.log(DEBUG, "startRecordCreationWithData", action.payload);
        const { tempId, initialData } = action.payload;

        const result = modeManager.changeMode(state, "create", tempId);
        if (!result.canProceed) {
            state.loading.error = {
                message: result.error || "Cannot start creation",
                code: 400,
            };
            return;
        }

        setLoading(state, "CREATE", true);

        state.unsavedRecords[tempId] = initialData;
        state.flags.hasUnsavedChanges = true;
        state.flags.operationMode = "create";
    },
    startCreateWithInitialData: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            tempId: string;
            initialData: Partial<EntityData<TEntity>>;
        }>
    ) => {
        entityLogger.log(DEBUG, "startCreateWithInitialData Action Payload: ", action.payload);
        const { tempId, initialData } = action.payload;
        setLoading(state, "CREATE", true);

        // Create a new object reference with all previous records preserved
        state.unsavedRecords = {
            ...state.unsavedRecords,
            [tempId]: initialData,
        };

        state.flags.hasUnsavedChanges = true;
        state.flags.operationMode = "create";
        entityLogger.log(DEBUG, "startCreateWithInitialData Unsaved Record: ", state.unsavedRecords[tempId]);
        entityLogger.log(DEBUG, "All Unsaved Records: ", state.unsavedRecords);
    },

    startBatchRecordCreation: (
        state: EntityState<TEntity>,
        action: PayloadAction<
            Array<{
                tempId: string;
                initialData: Partial<EntityData<TEntity>>;
            }>
        >
    ) => {
        entityLogger.log(DEBUG, "startBatchRecordCreation", action.payload);

        if (!action.payload.length) {
            return;
        }

        const result = modeManager.changeMode(state, "create");
        if (!result.canProceed) {
            state.loading.error = {
                message: result.error || "Cannot start batch creation",
                code: 400,
            };
            return;
        }

        setLoading(state, "CREATE", true);

        action.payload.forEach(({ tempId, initialData }) => {
            state.unsavedRecords[tempId] = initialData;
        });

        state.flags.hasUnsavedChanges = true;
        state.flags.operationMode = "create";
    },

    createRecord: (state: EntityState<TEntity>, action: PayloadAction<CreateRecordPayload>) => {
        entityLogger.log(DEBUG, "createRecord", action.payload);
        const tempRecordId = action.payload.tempRecordId;
        const recordData = state.unsavedRecords[tempRecordId];

        if (!recordData) {
            entityLogger.log("error", "No unsaved data found for temp record", tempRecordId);
            return;
        }
        setLoading(state, "CREATE");
    },
    createRecordSuccess: (state: EntityState<TEntity>, action: PayloadAction<createRecordSuccessPayload>) => {
        entityLogger.log(DEBUG, "createRecordSuccess", action.payload);

        const tempId = action.payload.tempRecordId;
        const data = action.payload.data;

        entityLogger.log(DEBUG, "--- All Unsaved Records Before Record Insertion: ", state.unsavedRecords);

        state.pendingOperations = state.pendingOperations.filter((matrxRecordId) => matrxRecordId !== tempId);
        removeFromUnsavedRecords(state, tempId);

        const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, data);
        state.records[recordKey] = data;

        if (state.selection.activeRecord === tempId) {
            state.selection.activeRecord = recordKey;
        }
        if (state.selection.selectedRecords.includes(tempId)) {
            state.selection.selectedRecords = state.selection.selectedRecords.filter((matrxRecordId) => matrxRecordId !== tempId);
            state.selection.selectedRecords.push(recordKey);
        }
        entityLogger.log(DEBUG, "--- All Unsaved Records After Record Insertion: ", state.unsavedRecords);

        const result = modeManager.changeMode(state, "view");

        if (result.canProceed) {
            setNewActiveRecord(state, recordKey);
            setSuccess(state, "CREATE");
        }
    },

    directCreateRecord: (state: EntityState<TEntity>, action: PayloadAction<DirectCreateRecordPayload>) => {
        entityLogger.log(DEBUG, "slice - directCreateRecord", action.payload);
        setLoading(state, "DIRECT_CREATE");
    },

    directCreateRecordSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>>) => {
        entityLogger.log(DEBUG, "directCreateRecordSuccess", action.payload);
        const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
        state.records[recordKey] = action.payload;
        setSuccess(state, "DIRECT_CREATE");
    },
});
