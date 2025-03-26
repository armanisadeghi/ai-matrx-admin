// lib/redux/entity/thunks/recordThunks.ts
import { createAppThunk, getTypedEntityTools } from '@/lib/redux/utils';
import { EntityKeys, MatrxRecordId } from '@/types';
import { callbackManager } from '@/utils/callbackManager';
import { v4 as uuidv4 } from 'uuid';

// --- Start Create Record ---
interface StartCreateRecordPayload {
  entityKey: EntityKeys;
  initialData?: Record<string, any>;
}

interface StartCreateRecordResult {
  tempId: MatrxRecordId; // e.g., 'new-record-uuid'
  id: string;           // The actual UUID
  recordKey: MatrxRecordId; // e.g., 'id:uuid' (future permanent key)
}

export const startCreateRecord = createAppThunk<
  StartCreateRecordResult,
  StartCreateRecordPayload,
  { rejectValue: string }
>(
  'entities/startCreateRecord',
  async ({ entityKey, initialData = {} }, { dispatch, getState, rejectWithValue }) => {
    try {
      const { actions } = getTypedEntityTools(entityKey);
      const id = uuidv4();
      const tempId = `new-record-${id}` as MatrxRecordId;
      const recordKey = `id:${id}` as MatrxRecordId;

      dispatch(actions.startRecordCreation({ count: 1, tempId }));

      if (Object.keys(initialData).length > 0) {
        Object.entries(initialData).forEach(([field, value]) => {
          dispatch(
            actions.updateUnsavedField({
              recordId: tempId,
              field,
              value,
            })
          );
        });
      }

      return { tempId, id, recordKey };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to start record creation'
      );
    }
  }
);

// --- Save Unsaved Record ---
interface SaveUnsavedRecordPayload {
  entityKey: EntityKeys;
  matrxRecordId: MatrxRecordId; // The tempId (e.g., 'new-record-uuid')
}

interface SaveUnsavedRecordResult {
  callbackId: string;
}

export const saveUnsavedRecord = createAppThunk<
  SaveUnsavedRecordResult,
  SaveUnsavedRecordPayload,
  { rejectValue: string }
>(
  'entities/saveUnsavedRecord',
  async ({ entityKey, matrxRecordId }, { dispatch, getState, rejectWithValue }) => {
    try {
      const { actions, selectors } = getTypedEntityTools(entityKey);
      const createPayload = selectors.selectCreatePayload(getState(), matrxRecordId);

      if (!createPayload) {
        throw new Error(`No create payload found for ${entityKey} with id ${matrxRecordId}`);
      }

      dispatch(actions.addPendingOperation(matrxRecordId));

      return new Promise((resolve) => {
        const callbackId = callbackManager.register(({ success, error }) => {
          dispatch(actions.removePendingOperation(matrxRecordId));
          if (!success) {
            rejectWithValue(error.message || 'Failed to save record');
          }
        });

        dispatch(
          actions.createRecord({
            ...createPayload,
            callbackId,
          })
        );

        resolve({ callbackId });
      });
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to save record'
      );
    }
  }
);

interface SaveUnsavedRecordPayload {
  entityKey: EntityKeys;
  matrxRecordId: MatrxRecordId;
}

interface CoordinatedSaveResult {
  callbackId: string;
  entityKey: EntityKeys;
  matrxRecordId: MatrxRecordId;
}

export const saveRecordsInOrder = createAppThunk<
  CoordinatedSaveResult[],
  SaveUnsavedRecordPayload[],
  { rejectValue: string }
>(
  'entities/saveRecordsInOrder',
  async (payloads, { dispatch, rejectWithValue }) => {
    try {
      const results: CoordinatedSaveResult[] = [];

      for (const payload of payloads) {
        const { entityKey, matrxRecordId } = payload;
        const result = await dispatch(saveUnsavedRecord(payload));

        if (saveUnsavedRecord.fulfilled.match(result)) {
          results.push({
            callbackId: result.payload.callbackId,
            entityKey,
            matrxRecordId,
          });
        } else {
          // If any save fails, reject the entire operation with the error
          return rejectWithValue(
            result.payload || `Failed to save record for ${entityKey} with id ${matrxRecordId}`
          );
        }
      }

      return results;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to save records in order'
      );
    }
  }
);