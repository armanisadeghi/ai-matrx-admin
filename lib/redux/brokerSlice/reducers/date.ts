// types/date/index.ts
import { PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerState, BrokerIdentifier } from "../types";
import { resolveBrokerId } from "../utils";

// Type guard
const isValidDate = (value: any): value is string => {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
};

// Reducers for date data
export const dateReducers = {
    // Sets a date value (as ISO string)
    setDate(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            value: string | Date;
        }>
    ) {
        const { idArgs, value } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        const dateString = value instanceof Date ? value.toISOString() : value;
        
        if (!isValidDate(dateString)) {
            state.error = `Invalid date value: ${value}`;
            return;
        }
        
        state.brokers[targetBrokerId] = dateString;
        state.error = undefined;
    },

    // Sets to current date
    setToday(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
        }>
    ) {
        const { idArgs } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = new Date().toISOString();
        state.error = undefined;
    },

    // Adds days to current date
    addDays(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            days: number;
        }>
    ) {
        const { idArgs, days } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        const currentValue = state.brokers[targetBrokerId];
        const currentDate = isValidDate(currentValue) ? new Date(currentValue) : new Date();
        
        currentDate.setDate(currentDate.getDate() + days);
        state.brokers[targetBrokerId] = currentDate.toISOString();
        state.error = undefined;
    },

    // Clears date value
    clearDate(
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

