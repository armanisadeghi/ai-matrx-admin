import EntityLogger from "./entityLogger";
import {EntityOperationMode, EntityState} from "@/lib/redux/entity/types/stateTypes";
import {EntityKeys} from "@/types/entityTypes";
import {
    addToUnsavedRecords,
    clearUnsavedRecords,
    generateTemporaryRecordId,
    removeSelections,
    setNewActiveRecord,
    switchToSingleSelectionMode,
    switchToNoSelectionMode
} from "@/lib/redux/entity/utils/stateHelpUtils";

export type ModeTransitionResult = {
    error?: string;
    canProceed: boolean;
};

export class EntityModeManager {
    private readonly logger: EntityLogger;
    private readonly entityKey: EntityKeys;

    constructor(entityKey: EntityKeys) {
        this.entityKey = entityKey;
        this.logger = EntityLogger.createLoggerWithDefaults(`EntityModeManager-${entityKey}`, entityKey);
    }

    private validateTransition(
        currentMode: EntityOperationMode | null,
        targetMode: EntityOperationMode,
        state: EntityState<EntityKeys>
    ): ModeTransitionResult {
        // TODO: This is a temporary workaround because it comes back that we have an operation when we dont
        if (state.pendingOperations.length > 0) {
            this.logger.log('warn', 'There are pending operations', {
                pendingOperations: state.pendingOperations,
                pendingOperationsCount: state.pendingOperations.length
            });
            //
            // return {
            //     error: 'Cannot change modes while operations are pending',
            //     canProceed: false
            // };
        }

        if (state.flags.hasUnsavedChanges) {
            const unsavedCount = Object.keys(state.unsavedRecords).length;

            if (unsavedCount > 1) {
                this.logger.log('warn', 'Multiple records have unsaved changes', {
                    unsavedCount: unsavedCount,
                    hasUnsavedChanges: state.flags.hasUnsavedChanges
                });

                // return {
                //     error: 'Multiple records have unsaved changes',
                //     canProceed: false
                // };
            }
            // return {
            //     error: 'Unsaved changes exist',
            //     canProceed: false
            // };
        }

        return {canProceed: true};
    }

    private exitCreateMode(state: EntityState<EntityKeys>): void {
        const activeRecord = state.selection.activeRecord;
        const lastActiveRecord = state.selection.lastActiveRecord;

        if (activeRecord?.toString().startsWith('new-record-') && lastActiveRecord) {
            setNewActiveRecord(state, lastActiveRecord);
            switchToSingleSelectionMode(state, lastActiveRecord);
        } else {
            switchToNoSelectionMode(state);
        }

        state.flags.operationMode = null;
        state.flags.hasUnsavedChanges = false;
        state.flags.isValidated = false;
        clearUnsavedRecords(state);
    }

    private exitUpdateMode(state: EntityState<EntityKeys>): void {
        state.flags.operationMode = null;
        state.flags.hasUnsavedChanges = false;
        state.flags.isValidated = false;
        clearUnsavedRecords(state);
    }

    private exitDeleteMode(state: EntityState<EntityKeys>): void {
        state.flags.operationMode = null;
        state.flags.isValidated = false;
    }

    private exitViewMode(state: EntityState<EntityKeys>): void {
        state.flags.isValidated = false;
    }

    private exitCurrentMode(
        state: EntityState<EntityKeys>,
        currentMode: EntityOperationMode | null
    ): void {
        if (!currentMode) return;

        this.logger.log('debug', 'Exiting current mode', {
            mode: currentMode,
            activeRecord: state.selection.activeRecord,
            lastActiveRecord: state.selection.lastActiveRecord
        });

        switch (currentMode) {
            case 'create':
                this.exitCreateMode(state);
                break;
            case 'update':
                this.exitUpdateMode(state);
                break;
            case 'delete':
                this.exitDeleteMode(state);
                break;
            case 'view':
                this.exitViewMode(state);
                break;
        }
    }

    private enterCreateMode(state: EntityState<EntityKeys>): void {
        const tempId = generateTemporaryRecordId(state);

        // First set the new active record to preserve last active
        setNewActiveRecord(state, tempId);

        // Then ensure we're in single selection mode with only this record
        switchToSingleSelectionMode(state, tempId);

        // Initialize the unsaved record
        state.unsavedRecords[tempId] = {};

        // Set operation flags
        state.flags.operationMode = 'create';
        // state.flags.hasUnsavedChanges = true;
        state.flags.isValidated = false;
        state.flags.operationFlags.CREATE_STATUS = 'IDLE';
    }

    private enterUpdateMode(state: EntityState<EntityKeys>): void {
        if (!state.selection.activeRecord) {
            this.logger.log('warn', 'Attempted to enter update mode with no active record');
            return;
        }

        const recordKey = state.selection.activeRecord;
        if (state.records[recordKey]) {
            addToUnsavedRecords(state, recordKey);

            // Ensure we're in single selection mode for the update
            switchToSingleSelectionMode(state, recordKey);
        }

        state.flags.operationMode = 'update';
        state.flags.hasUnsavedChanges = false;
        state.flags.isValidated = false;
        state.flags.operationFlags.UPDATE_STATUS = 'IDLE';
    }

    private enterDeleteMode(state: EntityState<EntityKeys>): void {
        state.flags.operationMode = 'delete';
        state.flags.isValidated = false;
        state.flags.operationFlags.DELETE_STATUS = 'IDLE';
    }

    private enterViewMode(state: EntityState<EntityKeys>): void {
        state.flags.operationMode = 'view';
        state.flags.hasUnsavedChanges = false;
        state.flags.isValidated = false;

        // Reset all operation flags
        state.flags.operationFlags.CREATE_STATUS = 'IDLE';
        state.flags.operationFlags.UPDATE_STATUS = 'IDLE';
        state.flags.operationFlags.DELETE_STATUS = 'IDLE';
    }

    private enterNewMode(
        state: EntityState<EntityKeys>,
        targetMode: EntityOperationMode
    ): void {
        this.logger.log('debug', 'Entering new mode', {
            mode: targetMode,
            activeRecord: state.selection.activeRecord,
            selectedRecords: state.selection.selectedRecords
        });

        switch (targetMode) {
            case 'create':
                this.enterCreateMode(state);
                break;
            case 'update':
                this.enterUpdateMode(state);
                break;
            case 'delete':
                this.enterDeleteMode(state);
                break;
            case 'view':
                this.enterViewMode(state);
                break;
        }
    }

    changeMode(
        state: EntityState<EntityKeys>,
        targetMode: EntityOperationMode
    ): ModeTransitionResult {
        const currentMode = state.flags.operationMode;

        this.logger.log('info', 'Attempting mode change', {
            entity: this.entityKey,
            from: currentMode,
            to: targetMode,
            hasUnsavedChanges: state.flags.hasUnsavedChanges,
            pendingOperations: state.pendingOperations,
            pendingOperationsCount: state.pendingOperations.length
        });

        const validationResult = this.validateTransition(currentMode, targetMode, state);

        this.logger.log('info', 'Mode change validation result', validationResult);

        if (!validationResult.canProceed) {
            this.logger.log('warn', 'Mode change validation failed', validationResult);
            return validationResult;
        }

        this.exitCurrentMode(state, currentMode);
        this.enterNewMode(state, targetMode);

        return {canProceed: true};
    }
}
