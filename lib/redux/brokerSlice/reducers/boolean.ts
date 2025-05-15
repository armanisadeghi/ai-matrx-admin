// types/boolean/index.ts
import { PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerState, BrokerIdentifier } from "../types";
import { getBrokerId } from "../utils";

// Type guard
const isBoolean = (value: any): value is boolean => typeof value === "boolean";

// Reducers for boolean data
export const booleanReducers = {
    // Sets a boolean value
    setBoolean(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            value: boolean;
        }>
    ) {
        const { idArgs, value } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = value;
        state.error = undefined;
    },

    // Toggles a boolean value
    toggleBoolean(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
        }>
    ) {
        const { idArgs } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        const currentValue = state.brokers[targetBrokerId];
        state.brokers[targetBrokerId] = isBoolean(currentValue) ? !currentValue : true;
        state.error = undefined;
    },

    // Sets to true
    setTrue(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
        }>
    ) {
        const { idArgs } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = true;
        state.error = undefined;
    },

    // Sets to false
    setFalse(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
        }>
    ) {
        const { idArgs } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = false;
        state.error = undefined;
    },

    // Clears boolean value
    clearBoolean(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
        }>
    ) {
        const { idArgs } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        const { [targetBrokerId]: removed, ...newBrokers } = state.brokers;
        state.brokers = newBrokers;
        state.error = undefined;
    },
};

