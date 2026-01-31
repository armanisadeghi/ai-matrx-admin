// factories/createShadowSlice.ts

import { EntityKeys } from "@/types/entityTypes";
import { RootState } from "@/lib/redux/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EntityState, MatrxRecordId } from "../../entity/types/stateTypes";


// https://claude.ai/chat/80aafc7e-ab50-4232-91ef-894d88211941

export const createShadowSlice = <
  TEntity extends EntityKeys,
  TLocalState extends Record<string, unknown>
>(
  entityKey: TEntity,
  config: {
    initialLocalState: TLocalState;
    selectors?: Record<string, (state: RootState) => unknown>;
  }
) => {
  return createSlice({
    name: `SHADOW/${entityKey.toUpperCase()}`,
    initialState: {
      localState: {} as Record<MatrxRecordId, TLocalState>,
      entityStateRef: null
    },
    reducers: {
      syncWithEntity: (state, action: PayloadAction<EntityState<TEntity>>) => {
        state.entityStateRef = action.payload;
        
        // Clean up local state for records that no longer exist
        Object.keys(state.localState).forEach(recordId => {
          if (!action.payload.records[recordId]) {
            delete state.localState[recordId];
          }
        });
      },
      
      updateLocalState: (
        state,
        action: PayloadAction<{
          recordId: MatrxRecordId;
          data: Partial<TLocalState>;
        }>
      ) => {
        const { recordId, data } = action.payload;
        state.localState[recordId] = {
          ...(state.localState[recordId] || config.initialLocalState),
          ...data
        };
      }
    }
  });
};