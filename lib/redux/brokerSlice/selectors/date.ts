// types/date/index.ts
import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerIdentifier } from "../types";
import { getBrokerId } from "../utils";

// Type guard
const isValidDate = (value: any): value is string => {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
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