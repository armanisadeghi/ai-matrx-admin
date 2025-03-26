import { EntityData, EntityKeys } from "@/types/entityTypes";
import { PayloadAction } from "@reduxjs/toolkit";
import EntityLogger from "@/lib/redux/entity/utils/entityLogger";
import { all, call, delay, put, select, take } from "redux-saga/effects";
import { selectEntityPrimaryKeyMetadata, selectFrontendConversion } from "@/lib/redux/schema/globalCacheSelectors";
import { createRecordKey } from "@/lib/redux/entity/utils/stateHelpUtils";
import { BaseSagaContext } from "@/lib/redux";
import { addUserIdToData } from "../utils/direct-schema";
import { handleQuickReferenceUpdate } from "./sagaHandlers";

const DEBOUNCE_MS = 300;
const CACHE_DURATION = 5 * 60 * 1000;
const trace = "SAGA HANDLERS";
const sagaLogger = EntityLogger.createLoggerWithDefaults(trace, "NoEntity");

export function* handleCoordinatedCreate<TEntity extends EntityKeys>({
    entityKey,
    actions,
    api,
    action,
    unifiedDatabaseObject,
}: BaseSagaContext<TEntity> & {
    action: PayloadAction<EntityData<TEntity>[]>;
}) {
    const entityLogger = EntityLogger.createLoggerWithDefaults("handleCoordinatedCreate", entityKey);
    const logLevel = "debug";

    // Expecting an array of records to insert, ordered by dependency (parents first)
    const receivedDataArray = unifiedDatabaseObject.data;

    if (!Array.isArray(receivedDataArray) || receivedDataArray.length === 0) {
        throw new Error("Expected an array of records for coordinated create.");
    }

    entityLogger.log(logLevel, "Received data array for coordinated insert:", receivedDataArray);

    const results: { recordKey: string; data: any }[] = [];

    try {
        for (const receivedData of receivedDataArray) {
            const dataForInsert = addUserIdToData(entityKey, receivedData);

            entityLogger.log(logLevel, "Processing record for insert:", dataForInsert);

            // Insert the record and retrieve the result
            const { data, error } = yield api.insert(dataForInsert).select().single();

            if (error) throw error;

            const payload = { entityName: entityKey, data };
            const frontendResponse = yield select(selectFrontendConversion, payload);

            // Dispatch success action for this record
            yield put(actions.directCreateRecordSuccess(frontendResponse));

            entityLogger.log(logLevel, "Frontend response for record:", frontendResponse);

            // Update quick reference if needed
            yield* handleQuickReferenceUpdate(entityKey, actions, frontendResponse, unifiedDatabaseObject);

            // Get primary key metadata and create record key
            const primaryKeyMetadata = yield select(selectEntityPrimaryKeyMetadata, entityKey);
            const recordKey = createRecordKey(primaryKeyMetadata, data);

            results.push({ recordKey, data: frontendResponse });

            // Optionally, pass the inserted data (e.g., parent ID) to dependent records
            if (receivedData.dependents && Array.isArray(receivedData.dependents)) {
                for (const dependent of receivedData.dependents) {
                    dependent[receivedData.foreignKeyField || "parent_id"] = data.id; // Adjust foreign key field as needed
                }
            }
        }

        return results; // Return all created records with their keys
    } catch (error: any) {
        entityLogger.log("error", "Coordinated create operation error", error);
        yield put(
            actions.setError({
                message: error.message || "An error occurred during coordinated create.",
                code: error.code,
            })
        );
        throw error;
    }
}
