import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BrokerMapEntry, BrokerState, BrokerIdentifier } from "./types";
import { tableReducers, textReducers, dynamicReducers, numberReducers, booleanReducers, dateReducers, optionsReducers } from "./reducers";
import { getBrokerId } from "./utils";

const initialState: BrokerState = {
    brokers: {},
    brokerMap: {},
    error: undefined,
};

const brokerConceptSlice = createSlice({
    name: "brokerConcept",
    initialState,
    reducers: {
        setMap(state: BrokerState, action: PayloadAction<BrokerMapEntry[]>) {
            const newMap: BrokerState["brokerMap"] = {};
            action.payload.forEach((entry) => {
                const key = `${entry.source}:${entry.itemId}`;
                newMap[key] = entry;
            });
            state.brokerMap = newMap;
            state.error = undefined;
        },

        // Adds or updates a single broker mapping entry
        updateMapEntry(state: BrokerState, action: PayloadAction<BrokerMapEntry>) {
            const entry = action.payload;
            const mapKey = `${entry.source}:${entry.itemId}`;
            state.brokerMap[mapKey] = entry;
            state.error = undefined;
        },

        // Removes a specific broker mapping
        removeMapEntry(state: BrokerState, action: PayloadAction<{ source: string; itemId: string }>) {
            const { source, itemId } = action.payload;
            const mapKey = `${source}:${itemId}`;

            // Create new brokerMap without the specified entry
            const { [mapKey]: removed, ...newMap } = state.brokerMap;
            state.brokerMap = newMap;
            state.error = undefined;
        },

        // Clears all broker mappings
        clearMap(state: BrokerState) {
            state.brokerMap = {};
            state.error = undefined;
        },

        // Sets a broker's value
        setValue(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; value: any }>) {
            const { idArgs, value } = action.payload;
            const targetBrokerId = getBrokerId(state, idArgs);
            if (!targetBrokerId) return;

            state.brokers[targetBrokerId] = value;
            state.error = undefined;
        },

        // Updates a broker's value
        updateValue(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; value: any }>) {
            const { idArgs, value } = action.payload;
            const targetBrokerId = getBrokerId(state, idArgs);
            if (!targetBrokerId) return;

            state.brokers[targetBrokerId] = value;
            state.error = undefined;
        },

        // Removes a broker's value
        removeValue(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier }>) {
            const { idArgs } = action.payload;
            const targetBrokerId = getBrokerId(state, idArgs);
            if (!targetBrokerId) return;

            // Create new brokers object without the specified broker
            const { [targetBrokerId]: removed, ...newBrokers } = state.brokers;
            state.brokers = newBrokers;
            state.error = undefined;
        },

        // Clears all broker values
        clearAllValues(state: BrokerState) {
            state.brokers = {};
            state.error = undefined;
        },

        // Clears the error state
        clearError(state: BrokerState) {
            state.error = undefined;
        },

        addMapEntries(state: BrokerState, action: PayloadAction<BrokerMapEntry[]>) {
            const entries = action.payload;
            entries.forEach((entry) => {
                const key = `${entry.source}:${entry.itemId}`;
                state.brokerMap[key] = entry;
                // Initialize broker value as undefined
                if (!state.brokers[entry.brokerId]) {
                    state.brokers[entry.brokerId] = undefined;
                }
            });
            state.error = undefined;
        },

        // Remove multiple map entries at once
        removeMapEntries(state: BrokerState, action: PayloadAction<BrokerIdentifier[]>) {
            const identifiers = action.payload;
            const newMap = { ...state.brokerMap };

            identifiers.forEach(({ source, itemId }) => {
                const key = `${source}:${itemId}`;
                delete newMap[key];
            });

            state.brokerMap = newMap;
            state.error = undefined;
        },

        ...optionsReducers,
        ...tableReducers,
        ...textReducers,
        ...dynamicReducers,
        ...numberReducers,
        ...booleanReducers,
        ...dateReducers,
    },
});

export default brokerConceptSlice.reducer;
export const brokerConceptActions = brokerConceptSlice.actions;
