import { EntityData, EntityKeys, MatrxRecordId } from "@/types/entityTypes";
import { createRecordKey } from "../utils/stateHelpUtils";
import { EntityState } from "../types/stateTypes";
import EntityLogger from "../utils/entityLogger";

interface RecordKeyInfo<TEntity> {
    recordKey: MatrxRecordId; // The final record key
    isNewRecord: boolean; // Whether it’s a new record
    isRecordKeyFormat: boolean; // Whether the input was already a record key
    originalInput: string; // The original keyOrId for logging/debugging
}

export function getRecordKeyInfo<TEntity extends EntityKeys>(keyOrId: string, state: EntityState<TEntity>): RecordKeyInfo<TEntity> {
    const isRecordKeyFormat = keyOrId.includes(":") || keyOrId.includes("new-record-");
    const isNewRecord = keyOrId.includes("new-record-");

    let recordKey: MatrxRecordId;
    if (isRecordKeyFormat) {
        recordKey = keyOrId;
    } else {
        recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, { id: keyOrId });
    }

    return {
        recordKey,
        isNewRecord,
        isRecordKeyFormat,
        originalInput: keyOrId,
    };
}

interface UnsavedRecordResult<TEntity extends EntityKeys> {
    unsavedRecord: Partial<EntityData<TEntity>> | null;
    hasChanges: boolean;
    didExitEarly: boolean;
}

export function ensureUnsavedRecord<TEntity extends EntityKeys>(
    state: EntityState<TEntity>,
    recordKey: MatrxRecordId,
    actionPayload: any,
    entityLogger: EntityLogger
): UnsavedRecordResult<TEntity> {
    let unsavedRecord = state.unsavedRecords[recordKey];
    let hasChanges = false;
    let didExitEarly = false;

    if (!unsavedRecord) {
        const existingRecord = state.records[recordKey];
        if (existingRecord) {
            unsavedRecord = { ...existingRecord };
            state.unsavedRecords[recordKey] = unsavedRecord;
        } else {
            entityLogger.log("error", "Record Does Not Exist in Saved Or Unsaved Records. Exiting.", actionPayload);
            didExitEarly = true;
            return { unsavedRecord: null, hasChanges, didExitEarly };
        }
    }

    return { unsavedRecord, hasChanges, didExitEarly };
}
