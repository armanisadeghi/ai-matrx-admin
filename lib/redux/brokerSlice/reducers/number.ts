// types/number/index.ts
import { PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { resolveBrokerId } from "../utils";
import { BrokerState, BrokerIdentifier } from "../types";


// Type guards
const isNumber = (value: any): value is number => typeof value === "number" && !isNaN(value);
const isInteger = (value: any): value is number => Number.isInteger(value);

// Reducers for number/integer data
export const numberReducers = {
    // Sets a number value
    setNumber(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            value: number;
        }>
    ) {
        const { idArgs, value } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = value;
        state.error = undefined;
    },

    // Sets an integer value (validates it's an integer)
    setInteger(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            value: number;
        }>
    ) {
        const { idArgs, value } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        if (!Number.isInteger(value)) {
            state.error = `Value ${value} is not an integer`;
            return;
        }
        
        state.brokers[targetBrokerId] = value;
        state.error = undefined;
    },

    // Increments a number
    incrementNumber(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            amount?: number;
        }>
    ) {
        const { idArgs, amount = 1 } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        const currentValue = state.brokers[targetBrokerId];
        if (isNumber(currentValue)) {
            state.brokers[targetBrokerId] = currentValue + amount;
        } else {
            state.brokers[targetBrokerId] = amount;
        }
        state.error = undefined;
    },

    // Decrements a number
    decrementNumber(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            amount?: number;
        }>
    ) {
        const { idArgs, amount = 1 } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        const currentValue = state.brokers[targetBrokerId];
        if (isNumber(currentValue)) {
            state.brokers[targetBrokerId] = currentValue - amount;
        } else {
            state.brokers[targetBrokerId] = -amount;
        }
        state.error = undefined;
    },

    // Sets a bounded number
    setBoundedNumber(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            value: number;
            min?: number;
            max?: number;
        }>
    ) {
        const { idArgs, value, min, max } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        let boundedValue = value;
        if (min !== undefined) boundedValue = Math.max(min, boundedValue);
        if (max !== undefined) boundedValue = Math.min(max, boundedValue);
        
        state.brokers[targetBrokerId] = boundedValue;
        state.error = undefined;
    },

    // Clears a number value
    clearNumber(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
        }>
    ) {
        const { idArgs } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        const { [targetBrokerId]: removed, ...newBrokers } = state.brokers;
        state.brokers = newBrokers;
        state.error = undefined;
    },
};

