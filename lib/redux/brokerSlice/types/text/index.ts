import { PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerState, BrokerIdentifier } from "../../core/types";
import { getBrokerId } from "../../core/helpers";

// Type guard for text values
const isTextValue = (value: any): value is string => typeof value === "string";

// Reducers for handling string-based data in brokers (e.g., for text inputs)
export const textReducers = {
    // Sets a text value for a broker
    setText(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            text: string;
        }>
    ) {
        const { idArgs, text } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = text;
        state.error = undefined;
    },

    // Updates a text value for a broker (same as set, but included for consistency)
    updateText(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            text: string;
        }>
    ) {
        const { idArgs, text } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = text;
        state.error = undefined;
    },

    // Appends text to existing text value
    appendText(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            text: string;
        }>
    ) {
        const { idArgs, text } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        const currentValue = state.brokers[targetBrokerId];
        state.brokers[targetBrokerId] = isTextValue(currentValue) 
            ? currentValue + text 
            : text;
        state.error = undefined;
    },

    // Clears a broker's text value
    clearText(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
        }>
    ) {
        const { idArgs } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        // Create new brokers object without the specified broker
        const { [targetBrokerId]: removed, ...newBrokers } = state.brokers;
        state.brokers = newBrokers;
        state.error = undefined;
    },
};

// Input selectors - properly memoized to avoid recreating objects
const selectBrokerConceptState = (state: RootState) => state.brokerConcept;
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

// Get the broker ID
const selectBrokerId = createSelector(
    [selectBrokerConceptState, selectIdArgs],
    (brokerConcept, idArgs) => getBrokerId(brokerConcept, idArgs)
);

// Get the broker value
const selectBrokerValue = createSelector(
    [selectBrokerConceptState, selectBrokerId],
    (brokerConcept, brokerId) => brokerId ? brokerConcept.brokers[brokerId] : undefined
);

// Selectors
const selectText = createSelector(
    [selectBrokerValue],
    (brokerValue): string | undefined => {
        return isTextValue(brokerValue) ? brokerValue : undefined;
    }
);

const selectTextLength = createSelector(
    [selectText], 
    (text): number => text?.length || 0
);

const selectTextExists = createSelector(
    [selectText],
    (text): boolean => text !== undefined
);

const selectTextIsEmpty = createSelector(
    [selectText],
    (text): boolean => text === ''
);

const selectTextWords = createSelector(
    [selectText],
    (text): string[] => text ? text.trim().split(/\s+/) : []
);

const selectTextWordCount = createSelector(
    [selectTextWords],
    (words): number => words.length
);

export const textSelectors = {
    selectText,
    selectTextLength,
    selectTextExists,
    selectTextIsEmpty,
    selectTextWords,
    selectTextWordCount,
};