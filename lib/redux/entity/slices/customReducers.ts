import { PayloadAction } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntityState, MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "../utils/entityLogger";
import { AppDispatch } from "../..";
import { getEntitySlice } from "../entitySlice";

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
        }>
    ) => {
        state.socketEventName = action.payload.socketEventName;
    },

    // Original: Overwrites entire customData
    setCustomData: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            customData: Record<string, unknown>;
        }>
    ) => {
        state.customData = action.payload.customData;
    },

    // New: Merges new data into customData without overwriting existing keys
    updateCustomDataSmart: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            customData: Record<string, unknown>;
        }>
    ) => {
        const newCustomData = action.payload.customData;
        entityLogger.log(INFO, "updateCustomDataSmart", { newCustomData });

        // Initialize customData if it doesn’t exist
        if (!state.customData || typeof state.customData !== "object") {
            state.customData = {};
            entityLogger.log(INFO, "Initialized empty customData object");
        }

        // Merge new data into existing customData
        state.customData = {
            ...state.customData,
            ...newCustomData,
        };

        entityLogger.log(INFO, "Custom Data After Update: ", state.customData);
    },
});

// Updated action creators
export const entityCustomActions = (dispatch: AppDispatch, entityKey: EntityKeys) => {
    const entityActions = getEntitySlice(entityKey).actions;

    return {
        setSocketEventName: (socketEventName: string) =>
            dispatch(entityActions.setSocketEventName({ socketEventName })),
        setCustomData: (customData: Record<string, unknown>) =>
            dispatch(entityActions.setCustomData({ customData })),
        updateCustomDataSmart: (customData: Record<string, unknown>) =>
            dispatch(entityActions.updateCustomDataSmart({ customData })),
    };
};