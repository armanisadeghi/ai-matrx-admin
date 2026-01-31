import { createAppThunk, getTypedEntityActions } from "@/lib/redux/utils";
import { EntityKeys, MatrxRecordId } from "@/types/entityTypes";
import { callbackManager } from "@/utils/callbackManager";
import { v4 as uuidv4 } from "uuid";
import { getFirstPkField } from "../utils/direct-schema";

interface DirectCreateRecordPayload {
    entityKey: EntityKeys;
    data: Record<string, unknown>;
}

interface DirectCreateRecordResult {
    matrxRecordId: MatrxRecordId;
    coreId: string;
}

export const directCreateRecord = createAppThunk<DirectCreateRecordResult, DirectCreateRecordPayload, { rejectValue: string }>(
    "entities/directCreateRecord",
    async ({ entityKey, data }, { dispatch, getState, rejectWithValue }) => {
        try {
            const actions = getTypedEntityActions(entityKey);
            const primaryKeyField = getFirstPkField(entityKey);

            const coreId = uuidv4();
            const dataWithId = {
                ...data,
                [primaryKeyField]: coreId,
            };

            const matrxRecordId = `${primaryKeyField}:${coreId}`;

            return new Promise((resolve) => {
                const callbackId = callbackManager.register(({ success, error }) => {
                    if (!success) {
                        rejectWithValue(error.message || "Failed to directly create record");
                    }
                });

                dispatch(
                    actions.directCreateRecord({
                        matrxRecordId,
                        data: dataWithId,
                        callbackId,
                    })
                );

                resolve({ matrxRecordId, coreId });
            });
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Failed to directly create record");
        }
    }
);


export const directCreateWithPk = createAppThunk<DirectCreateRecordResult, DirectCreateRecordPayload, { rejectValue: string }>(
    "entities/directCreateRecord",
    async ({ entityKey, data }, { dispatch, getState, rejectWithValue }) => {
        try {
            const actions = getTypedEntityActions(entityKey);
            const primaryKeyField = getFirstPkField(entityKey);

            const coreId = data[primaryKeyField] as string;

            if (!coreId) {
                throw new Error(`Primary key value is required for direct create with PK: ${primaryKeyField}`);
            }

            const matrxRecordId = `${primaryKeyField}:${coreId}`;

            return new Promise((resolve) => {
                const callbackId = callbackManager.register(({ success, error }) => {
                    if (!success) {
                        rejectWithValue(error.message || "Failed to directly create record");
                    }
                });

                dispatch(
                    actions.directCreateRecord({
                        matrxRecordId,
                        data,
                        callbackId,
                    })
                );

                resolve({ matrxRecordId, coreId });
            });
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Failed to directly create record");
        }
    }
);



interface DirectCreateRecordPayload {
    entityKey: EntityKeys;
    data: Record<string, unknown>;
    childReferenceField?: string;
  }
  
  interface CoordinatedDirectCreateResult {
    matrxRecordId: MatrxRecordId;
    coreId: string;
    entityKey: EntityKeys;
  }
  
  export const directCreateRecordsInOrder = createAppThunk<
    CoordinatedDirectCreateResult[],
    DirectCreateRecordPayload[],
    { rejectValue: string }
  >(
    'entities/directCreateRecordsInOrder',
    async (payloads, { dispatch, rejectWithValue }) => {
      try {
        const results: CoordinatedDirectCreateResult[] = [];
  
        for (let i = 0; i < payloads.length; i++) {
          const payload = payloads[i];
          const { entityKey, data, childReferenceField } = payload;
  
          // If this is a child record and a childReferenceField is provided,
          // update its data with the parent's coreId from the previous result
          let updatedData = { ...data };
          if (i > 0 && childReferenceField) {
            const parentResult = results[i - 1];
            updatedData = {
              ...updatedData,
              [childReferenceField]: parentResult.coreId,
            };
          }
  
          const result = await dispatch(
            directCreateRecord({
              entityKey,
              data: updatedData,
            })
          );
  
          if (directCreateRecord.fulfilled.match(result)) {
            results.push({
              matrxRecordId: result.payload.matrxRecordId,
              coreId: result.payload.coreId,
              entityKey,
            });
          } else {
            return rejectWithValue(
              result.payload || `Failed to directly create record for ${entityKey}`
            );
          }
        }
  
        return results;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error ? error.message : 'Failed to directly create records in order'
        );
      }
    }
  );