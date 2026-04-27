import { PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import {
  EntityState,
  MatrxRecordId,
} from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "../utils/entityLogger";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const customReducers = <TEntity extends EntityKeys>(
  entityKey: TEntity,
  entityLogger: EntityLogger,
) => ({
  setSocketEventName: (
    state: EntityState<TEntity>,
    action: PayloadAction<{
      socketEventName: string;
    }>,
  ) => {
    state.socketEventName = action.payload.socketEventName;
    entityLogger.log(DEBUG, "setSocketEventName", {
      socketEventName: action.payload.socketEventName,
    });
  },

  // Original: Overwrites entire customData
  setCustomData: (
    state: EntityState<TEntity>,
    action: PayloadAction<{
      customData: Record<string, unknown>;
    }>,
  ) => {
    state.customData = action.payload.customData;
  },

  // New: Merges new data into customData without overwriting existing keys
  updateCustomDataSmart: (
    state: EntityState<TEntity>,
    action: PayloadAction<{
      customData: Record<string, unknown>;
    }>,
  ) => {
    entityLogger.log(DEBUG, "state.customData", {
      stateCustomData: state.customData,
    });
    const newCustomData = action.payload.customData;
    entityLogger.log(DEBUG, "updateCustomDataSmart", { newCustomData });

    // Initialize customData if it doesn’t exist
    if (!state.customData || typeof state.customData !== "object") {
      state.customData = {};
      entityLogger.log(DEBUG, "Initialized empty customData object");
    }

    // Merge new data into existing customData
    state.customData = {
      ...state.customData,
      ...newCustomData,
    };

    entityLogger.log(DEBUG, "Custom Data After Update: ", state.customData);
  },
});
