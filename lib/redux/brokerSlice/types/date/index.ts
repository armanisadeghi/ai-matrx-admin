// types/date/index.ts
import { PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerState, BrokerIdentifier } from "../../core/types";
import { getBrokerId } from "../../core/helpers";

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
        const targetBrokerId = getBrokerId(state, idArgs);
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
        const targetBrokerId = getBrokerId(state, idArgs);
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
        const targetBrokerId = getBrokerId(state, idArgs);
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
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        const { [targetBrokerId]: removed, ...newBrokers } = state.brokers;
        state.brokers = newBrokers;
        state.error = undefined;
    },
};

// Input selector
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

// Selectors
const selectDate = createSelector(
    [
        (state: RootState) => state.brokerConcept,
        selectIdArgs
    ],
    (brokerConcept, idArgs): Date | undefined => {
        const brokerId = getBrokerId(brokerConcept, idArgs);
        if (!brokerId) return undefined;
        
        const brokerValue = brokerConcept.brokers[brokerId];
        return isValidDate(brokerValue) ? new Date(brokerValue) : undefined;
    }
);

const selectDateString = createSelector(
    [
        (state: RootState) => state.brokerConcept,
        selectIdArgs
    ],
    (brokerConcept, idArgs): string | undefined => {
        const brokerId = getBrokerId(brokerConcept, idArgs);
        if (!brokerId) return undefined;
        
        const brokerValue = brokerConcept.brokers[brokerId];
        return isValidDate(brokerValue) ? brokerValue : undefined;
    }
);

const selectFormattedDate = createSelector(
    [selectDate],
    (date): string | undefined => {
        return date ? date.toLocaleDateString() : undefined;
    }
);

const selectDateExists = createSelector(
    [selectDate],
    (date): boolean => date !== undefined
);

const selectIsToday = createSelector(
    [selectDate],
    (date): boolean => {
        if (!date) return false;
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
);

const selectIsPast = createSelector(
    [selectDate],
    (date): boolean => {
        if (!date) return false;
        return date < new Date();
    }
);

const selectIsFuture = createSelector(
    [selectDate],
    (date): boolean => {
        if (!date) return false;
        return date > new Date();
    }
);

export const dateSelectors = {
    selectDate,
    selectDateString,
    selectFormattedDate,
    selectDateExists,
    selectIsToday,
    selectIsPast,
    selectIsFuture,
};