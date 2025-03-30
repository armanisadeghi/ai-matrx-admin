import { PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntityState, MatrxRecordId, SelectionMode } from "@/lib/redux/entity/types/stateTypes";
import {
    createRecordKey,
    addRecordToSelection,
    removeRecordFromSelection,
    isMatrxRecordId,
    isEntityData,
    toggleSelectionMode,
    removeSelections,
    setSpecificSelectionMode,
} from "@/lib/redux/entity/utils/stateHelpUtils";
import EntityLogger from "../utils/entityLogger";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const selectionReducers = <TEntity extends EntityKeys>(entityKey: TEntity, entityLogger: EntityLogger) => ({
    setSelectionMode: (state: EntityState<TEntity>, action: PayloadAction<SelectionMode>) => {
        entityLogger.log(DEBUG, "setSelectionMode", action.payload);
        setSpecificSelectionMode(state, action.payload);
    },

    setToggleSelectionMode: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "setToggleSelectionMode", state.selection.selectionMode);
        toggleSelectionMode(state);
    },

    clearSelection: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "clearSelection");
        removeSelections(state);
    },

    setSwitchSelectedRecord: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
        entityLogger.log(DEBUG, "setSwitchSlectedRecord", action.payload);

        if (state.selection.selectedRecords.includes(action.payload)) {
            if (state.selection.activeRecord !== action.payload) {
                state.selection.activeRecord = action.payload;
            }
            return;
        } else {
            removeSelections(state);
            state.selection.selectedRecords.push(action.payload);
            state.selection.selectionMode = "single";
            state.selection.activeRecord = action.payload;
        }
    },

    addToSelection: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
        entityLogger.log(DEBUG, "addToSelection", action.payload);
        if (isMatrxRecordId(action.payload)) {
            addRecordToSelection(state, entityKey, action.payload);
        } else if (isEntityData(action.payload, state.entityMetadata.entityFields)) {
            const matrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
            addRecordToSelection(state, entityKey, matrxRecordId);
        } else {
            entityLogger.log("error", "Invalid Record in addToSelection", action.payload);
        }
    },

    removeFromSelection: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
        removeRecordFromSelection(state, action.payload);
    },

    setActiveRecord: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
        entityLogger.log(DEBUG, "setActiveRecord", action.payload);
        let recordKey: MatrxRecordId;

        if (action.payload.includes(":") ) {
            recordKey = action.payload;
        } else if (action.payload.includes("new-record")) {
            recordKey = action.payload;
        } else {
            recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, { id: action.payload });
        }

        if (state.selection.activeRecord !== recordKey) {
            state.selection.lastActiveRecord = state.selection.activeRecord;
        }
        if (state.selection.activeRecord !== recordKey) {
            state.selection.activeRecord = recordKey;
            entityLogger.log(DEBUG, "setActiveRecord State Value:", state.selection.activeRecord);
        }

        if (!state.selection.selectedRecords.includes(recordKey)) {
            state.selection.selectedRecords.push(recordKey);
        }
    },

    setActiveRecordSmart: (state: EntityState<TEntity>, action: PayloadAction<string>) => {
        let recordKey: MatrxRecordId;

        if (action.payload.includes(":") || action.payload.includes("new-record")) {
            recordKey = action.payload;
        } else {
            recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, { id: action.payload });
        }

        entityLogger.log(DEBUG, "Entity Slice Smart Set Active Record: ", {
            originalPayload: action.payload,
            generatedKey: recordKey,
        });

        state.selection.lastActiveRecord = state.selection.activeRecord;
        state.selection.activeRecord = recordKey;

        if (!state.selection.selectedRecords.includes(recordKey)) {
            entityLogger.log(DEBUG, "Adding Active Record to Selection: ", recordKey);
            state.selection.selectedRecords.push(recordKey);
        }
    },

    clearActiveRecord: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "clearActiveRecord");
        state.selection.activeRecord = null;
    },
});
