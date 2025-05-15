import { PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerState, BrokerIdentifier } from "../../core/types";
import { getBrokerId } from "../../core/helpers";

// Reducers for handling generic, untyped data in brokers
export const dynamicReducers = {
    // Sets a dynamic value for a broker
    setDynamicValue(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            value: any;
        }>
    ) {
        const { idArgs, value } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = value;
        state.error = undefined;
    },

    // Updates a dynamic value for a broker (alias for consistency)
    updateDynamicValue(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            value: any;
        }>
    ) {
        const { idArgs, value } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = value;
        state.error = undefined;
    },

    // Clears a broker's dynamic value
    clearDynamicValue(
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

// Input selectors to avoid object creation in selectors
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

// Selectors
const selectDynamicValue = createSelector(
    [
        (state: RootState) => state.brokerConcept,
        selectIdArgs
    ],
    (brokerConcept, idArgs): any => {
        const brokerId = getBrokerId(brokerConcept, idArgs);
        return brokerId ? brokerConcept.brokers[brokerId] : undefined;
    }
);

const selectDynamicValueType = createSelector(
    [selectDynamicValue], 
    (value): string => typeof value
);

const selectDynamicValueExists = createSelector(
    [selectDynamicValue],
    (value): boolean => value !== undefined
);

const selectDynamicValueIsNull = createSelector(
    [selectDynamicValue],
    (value): boolean => value === null
);

const selectDynamicValueIsObject = createSelector(
    [selectDynamicValue],
    (value): boolean => value !== null && typeof value === 'object'
);

export const dynamicSelectors = {
    selectDynamicValue,
    selectDynamicValueType,
    selectDynamicValueExists,
    selectDynamicValueIsNull,
    selectDynamicValueIsObject,
};