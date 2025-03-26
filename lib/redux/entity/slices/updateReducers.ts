import { PayloadAction } from "@reduxjs/toolkit";
import { EntityData, EntityFieldKeys, EntityKeys } from "@/types/entityTypes";
import { EntityState, MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { createRecordKey, setLoading, setSuccess, setNewActiveRecord } from "@/lib/redux/entity/utils/stateHelpUtils";
import EntityLogger from "../utils/entityLogger";
import { EntityModeManager } from "../utils/crudOpsManagement";
import { AppDispatch } from "../..";
import { getEntitySlice } from "../entitySlice";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const updateReducers = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    entityLogger: EntityLogger,
    modeManager: EntityModeManager
) => ({
    directUpdateRecord: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            matrxRecordId: MatrxRecordId;
            data: Record<string, any>;
            callbackId?: string;
        }>
    ) => {
        entityLogger.log(DEBUG, "slice - directUpdateRecord", action.payload);
        setLoading(state, "DIRECT_UPDATE");
    },

    directUpdateRecordSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>>) => {
        entityLogger.log(DEBUG, "directUpdateRecordSuccess", action.payload);
        const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
        state.records[recordKey] = action.payload;
        setSuccess(state, "DIRECT_UPDATE");
    },

    updateRecord: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            matrxRecordId: MatrxRecordId;
            data: Record<string, any>;
            callbackId?: string;
        }>
    ) => {
        entityLogger.log(DEBUG, "slice - updateRecord", action.payload);
        const matrxRecordId = action.payload.matrxRecordId;
        const unsavedData = state.unsavedRecords[matrxRecordId];
        if (!unsavedData) {
            entityLogger.log("error", "No unsaved changes found for record", matrxRecordId);
            return;
        }

        setLoading(state, "UPDATE");
    },

    updateRecordSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>>) => {
        entityLogger.log(DEBUG, "updateRecordSuccess", action.payload);
        const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
        state.records[recordKey] = action.payload;

        // Let mode manager handle the transition back to view
        const result = modeManager.changeMode(state, "view");
        if (result.canProceed) {
            setNewActiveRecord(state, recordKey);
            setSuccess(state, "UPDATE");
        }
    },

    startRecordUpdate: (state: EntityState<TEntity>) => {
        entityLogger.log(DEBUG, "startRecordUpdate");
        if (state.selection.selectedRecords.length > 0) {
            const result = modeManager.changeMode(state, "update");
            if (!result.canProceed) {
                state.loading.error = {
                    message: result.error || "Cannot start update",
                    code: 400,
                };
                return;
            }
        }
    },

    startRecordUpdateById: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
        entityLogger.log(DEBUG, "startRecordUpdateById");

        // First set the provided record as active
        setNewActiveRecord(state, action.payload);

        // Then proceed with the original update logic
        if (state.selection.selectedRecords.length > 0) {
            const result = modeManager.changeMode(state, "update");
            if (!result.canProceed) {
                state.loading.error = {
                    message: result.error || "Cannot start update",
                    code: 400,
                };
                return;
            }
        }
    },

    optimisticUpdate: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            record: EntityData<TEntity>;
            rollback?: EntityData<TEntity>;
        }>
    ) => {
        const { record, rollback } = action.payload;
        const recordKey: MatrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
        entityLogger.log(DEBUG, "optimisticUpdate", { record, rollback });

        if (rollback) {
            state.history.past.push({
                timestamp: new Date().toISOString(),
                operation: "update",
                data: record,
                previousData: rollback,
                metadata: { reason: "optimistic_update" },
            });
        }

        state.records[recordKey] = record;
        state.flags.isModified = true;
        // state.flags.hasUnsavedChanges = true;
    },

    updateUnsavedField: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            recordId: MatrxRecordId;
            field: string;
            value: any;
        }>
    ) => {
        const { recordId, field, value } = action.payload;
        entityLogger.log(DEBUG, "updateUnsavedField", { recordId, field, value });
        const existingRecord = state.unsavedRecords[recordId];
        entityLogger.log(DEBUG, "existingRecord", existingRecord);
        if (existingRecord?.[field] !== value) {
            entityLogger.log(DEBUG, "updating unsaved record");
            state.unsavedRecords[recordId] = {
                ...existingRecord,
                [field]: value,
            };
            if (!state.flags.hasUnsavedChanges) {
                state.flags.hasUnsavedChanges = true;
                if (state.flags.operationMode !== "create") {
                    state.flags.operationMode = "update";
                }
            }
        }
        entityLogger.log(DEBUG, "Record State After Update: ", state.unsavedRecords[recordId]);
    },
    updateUnsavedFields: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            updates: Array<{
                recordId: MatrxRecordId;
                field: string;
                value: any;
            }>;
        }>
    ) => {
        action.payload.updates.forEach(({ recordId, field, value }) => {
            const existingRecord = state.unsavedRecords[recordId];
            if (existingRecord?.[field] !== value) {
                state.unsavedRecords[recordId] = {
                    ...existingRecord,
                    [field]: value,
                };
                if (!state.flags.hasUnsavedChanges) {
                    state.flags.hasUnsavedChanges = true;
                    if (state.flags.operationMode !== "create") {
                        state.flags.operationMode = "update";
                    }
                }
            }
        });
    },

    updateFieldSmart: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            keyOrId: string;
            field: string;
            value: any;
        }>
    ) => {
        const { keyOrId, field, value } = action.payload;
        entityLogger.log(INFO, "updateFieldSmart", { keyOrId, field, value });

        let recordKey: MatrxRecordId;
        if (action.payload.keyOrId.includes(":")) {
            recordKey = action.payload.keyOrId;
        } else {
            recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, { id: action.payload.keyOrId });
        }

        let unsavedRecord = state.unsavedRecords[recordKey];
    
        if (!unsavedRecord) {
            const existingRecord = state.records[recordKey];
            if (existingRecord) {
                unsavedRecord = { ...existingRecord }; // Create a copy
                state.unsavedRecords[recordKey] = unsavedRecord;
                entityLogger.log(INFO, "Copied Existing Record to Unsaved", unsavedRecord);
            } else {
                entityLogger.log(INFO, "Record Does Not Exist in Saved Or Unsaved Records. Exiting.", action.payload);
                return; // Or initialize a new record if desired
            }
        }
    
        if (unsavedRecord[field] !== value) {
            entityLogger.log(INFO, "Updating unsaved record");
            state.unsavedRecords[recordKey] = {
                ...unsavedRecord,
                [field]: value,
            };
            if (!state.flags.hasUnsavedChanges) {
                state.flags.hasUnsavedChanges = true;
                if (state.flags.operationMode !== "create") {
                    state.flags.operationMode = "update";
                }
            }
        }
        entityLogger.log(INFO, "Record State After Update: ", state.unsavedRecords[recordKey]);
    },

    updateNestedFieldSmart: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            keyOrId: string;
            field: EntityFieldKeys<TEntity>; // e.g., "metadata"
            nestedKey: string; // e.g., "currentMode"
            value: any; // The value for the nested key
        }>
    ) => {
        const { keyOrId, field, nestedKey, value } = action.payload;
        entityLogger.log(INFO, "updateNestedFieldSmart", { keyOrId, field, nestedKey, value });
        let recordKey: MatrxRecordId;
        if (action.payload.keyOrId.includes(":")) {
            recordKey = action.payload.keyOrId;
        } else {
            recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, { id: action.payload.keyOrId });
        }

        let unsavedRecord = state.unsavedRecords[recordKey];
    
        // Step 1: Handle unsaved record creation if it doesn’t exist
        if (!unsavedRecord) {
            const existingRecord = state.records[recordKey];
            if (existingRecord) {
                unsavedRecord = { ...existingRecord }; // Create a copy
                state.unsavedRecords[recordKey] = unsavedRecord;
                entityLogger.log(INFO, "Copied Existing Record to Unsaved", unsavedRecord);
            } else {
                entityLogger.log(INFO, "Record Does Not Exist in Saved Or Unsaved Records. Exiting.", action.payload);
                return; // Exit if no record exists (could initialize if needed)
            }
        }
    
        // Step 2: Ensure the target field (e.g., metadata) exists as an object
        if (!unsavedRecord[field] || typeof unsavedRecord[field] !== "object") {
            unsavedRecord[field] = {} as any; // Initialize if missing or not an object
            entityLogger.log(INFO, `Initialized empty ${field} object for record`, { recordKey });
        }
    
        // Step 3: Check if the nested key’s value needs updating
        const currentNestedValue = (unsavedRecord[field] as any)[nestedKey];
        if (currentNestedValue !== value) {
            entityLogger.log(INFO, "Updating nested field in unsaved record");
            state.unsavedRecords[recordKey] = {
                ...unsavedRecord,
                [field]: {
                    ...(unsavedRecord[field] as any), // Spread existing nested object
                    [nestedKey]: value, // Update or add the nested key
                },
            };
    
            // Step 4: Update flags
            if (!state.flags.hasUnsavedChanges) {
                state.flags.hasUnsavedChanges = true;
                if (state.flags.operationMode !== "create") {
                    state.flags.operationMode = "update";
                }
            }
        }
    
        entityLogger.log(INFO, "Record State After Nested Update: ", state.unsavedRecords[recordKey]);
    },
    updateMultipleNestedFieldsSmart: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            keyOrId: string;
            updates: Array<{
                field: EntityFieldKeys<TEntity>; // e.g., "metadata"
                nestedKey: string; // e.g., "currentMode"
                value: any; // The value for the nested key
            }>;
        }>
    ) => {
        const { keyOrId, updates } = action.payload;
        entityLogger.log(INFO, "updateMultipleNestedFieldsSmart", { keyOrId, updates });
    
        // Determine record key
        let recordKey: MatrxRecordId;
        if (keyOrId.includes(":")) {
            recordKey = keyOrId;
        } else {
            recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, { id: keyOrId });
        }
    
        let unsavedRecord = state.unsavedRecords[recordKey];
        let hasChanges = false;
    
        // Step 1: Handle unsaved record creation if it doesn’t exist
        if (!unsavedRecord) {
            const existingRecord = state.records[recordKey];
            if (existingRecord) {
                unsavedRecord = { ...existingRecord };
                state.unsavedRecords[recordKey] = unsavedRecord;
                entityLogger.log(INFO, "Copied Existing Record to Unsaved", unsavedRecord);
            } else {
                entityLogger.log(INFO, "Record Does Not Exist in Saved Or Unsaved Records. Exiting.", action.payload);
                return;
            }
        }
    
        // Step 2: Process all updates
        const updatedFields: Partial<TEntity> = {};
    
        updates.forEach(({ field, nestedKey, value }) => {
            // Ensure the target field exists as an object
            if (!unsavedRecord[field] || typeof unsavedRecord[field] !== "object") {
                unsavedRecord[field] = {} as any;
                entityLogger.log(INFO, `Initialized empty ${field} object for record`, { recordKey });
            }
    
            // Check if update is needed
            const currentNestedValue = (unsavedRecord[field] as any)[nestedKey];
            if (currentNestedValue !== value) {
                hasChanges = true;
                updatedFields[field] = {
                    ...(unsavedRecord[field] as any),
                    [nestedKey]: value,
                };
            }
        });
    
        // Step 3: Apply updates if there are changes
        if (hasChanges) {
            entityLogger.log(INFO, "Updating multiple nested fields in unsaved record");
            state.unsavedRecords[recordKey] = {
                ...unsavedRecord,
                ...updatedFields,
            };
    
            // Step 4: Update flags
            if (!state.flags.hasUnsavedChanges) {
                state.flags.hasUnsavedChanges = true;
                if (state.flags.operationMode !== "create") {
                    state.flags.operationMode = "update";
                }
            }
        }
    }
});



export const entityUpdateActions = (dispatch: AppDispatch, entityKey: EntityKeys) => {
    const entityActions = getEntitySlice(entityKey).actions;

    return {
        directUpdateRecord: (params: { matrxRecordId: MatrxRecordId; data: Record<string, any>; callbackId?: string }) =>
            dispatch(entityActions.directUpdateRecord(params)),

        updateRecord: (params: { matrxRecordId: MatrxRecordId; data: Record<string, any>; callbackId?: string }) =>
            dispatch(entityActions.updateRecord(params)),

        updateUnsavedField: (params: { recordId: MatrxRecordId; field: string; value: any }) =>
            dispatch(entityActions.updateUnsavedField(params)),

        updateUnsavedFields: (params: { updates: Array<{ recordId: MatrxRecordId; field: string; value: any }> }) =>
            dispatch(entityActions.updateUnsavedFields(params)),

        optimisticUpdate: (params: { record: EntityData<typeof entityKey>; rollback?: EntityData<typeof entityKey> }) =>
            dispatch(entityActions.optimisticUpdate(params)),

        startRecordUpdate: () => dispatch(entityActions.startRecordUpdate()),

        startRecordUpdateById: (recordId: MatrxRecordId) => dispatch(entityActions.startRecordUpdateById(recordId)),

        updateFieldSmart: (params: { keyOrId: string; field: string; value: any }) =>
            dispatch(entityActions.updateFieldSmart(params)),

        updateNestedFieldSmart: (params: { keyOrId: string; field: EntityFieldKeys<typeof entityKey>; nestedKey: string; value: any }) =>
            dispatch(entityActions.updateNestedFieldSmart(params)),
    };
};
