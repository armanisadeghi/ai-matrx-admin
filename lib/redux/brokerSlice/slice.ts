import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    tableReducers,
    textReducers,
    dynamicReducers,
    numberReducers,
    booleanReducers,
    dateReducers,
    optionsReducers,
    dangerousReducers,
} from "./reducers";
import { resolveBrokerId } from "./utils";

type BrokerIdentifier = { brokerId: string; source?: string; mappedItemId?: string } | { source: string; mappedItemId: string; brokerId?: string };

interface BrokerMapEntry {
    brokerId: string;
    mappedItemId: string;
    source: string;
    sourceId: string;
}

interface BrokerState {
    brokers: { [brokerId: string]: any };
    brokerMap: { [key: string]: BrokerMapEntry };
    error?: string;
    isLoading: boolean;
}

const initialState: BrokerState = {
    brokers: {},
    brokerMap: {},
    error: undefined,
    isLoading: false,
};

const brokerSlice = createSlice({
    name: "broker",
    initialState,
    reducers: {
        // Adds or updates a single broker register entry
        addOrUpdateRegisterEntry(state: BrokerState, action: PayloadAction<BrokerMapEntry>) {
            const entry = action.payload;
            if (!entry.sourceId) {
                console.warn(`Missing sourceId for BrokerMapEntry: ${JSON.stringify(entry)}`);
                return;
            }
            const mapKey = `${entry.source}:${entry.mappedItemId}`;
            state.brokerMap[mapKey] = entry;
            // Initialize broker value as undefined if not already present
            if (!state.brokers[entry.brokerId]) {
                state.brokers[entry.brokerId] = undefined;
            }
            state.error = undefined;
        },

        // Adds or updates multiple broker register entries
        addOrUpdateRegisterEntries(state: BrokerState, action: PayloadAction<BrokerMapEntry[]>) {
            const entries = action.payload;
            entries.forEach((entry) => {
                if (!entry.sourceId) {
                    console.warn(`Missing sourceId for BrokerMapEntry: ${JSON.stringify(entry)}`);
                    return;
                }
                const key = `${entry.source}:${entry.mappedItemId}`;
                state.brokerMap[key] = entry;
                // Initialize broker value as undefined if not already present
                if (!state.brokers[entry.brokerId]) {
                    state.brokers[entry.brokerId] = undefined;
                }
            });
            state.error = undefined;
        },

        // Removes a specific broker register entry
        removeRegisterEntry(state: BrokerState, action: PayloadAction<{ source: string; mappedItemId: string }>) {
            const { source, mappedItemId } = action.payload;
            const mapKey = `${source}:${mappedItemId}`;
            const { [mapKey]: removed, ...newMap } = state.brokerMap;
            state.brokerMap = newMap;
            state.error = undefined;
        },

        // Removes multiple specific broker register entries
        removeRegisterEntries(state: BrokerState, action: PayloadAction<BrokerIdentifier[]>) {
            const identifiers = action.payload;
            const newMap = { ...state.brokerMap };
            identifiers.forEach((idArgs) => {
                if ("source" in idArgs && "mappedItemId" in idArgs) {
                    const key = `${idArgs.source}:${idArgs.mappedItemId}`;
                    delete newMap[key];
                }
            });
            state.brokerMap = newMap;
            state.error = undefined;
        },

        setLoading(state: BrokerState, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },

        // Sets a broker's value by direct brokerId
        setValue(state: BrokerState, action: PayloadAction<{ brokerId: string; value: any }>) {
            const { brokerId, value } = action.payload;
            state.brokers[brokerId] = value;
            state.error = undefined;
        },

        // Sets a broker's value using source and mappedItemId (requires mapping)
        setValueWithoutBrokerId(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; value: any }>) {
            const { idArgs, value } = action.payload;
            const targetBrokerId = resolveBrokerId(state, idArgs);
            if (!targetBrokerId) return;
            state.brokers[targetBrokerId] = value;
            state.error = undefined;
        },

        // Removes a broker's value by direct brokerId
        removeValue(state: BrokerState, action: PayloadAction<{ brokerId: string }>) {
            const { brokerId } = action.payload;
            const { [brokerId]: removed, ...newBrokers } = state.brokers;
            state.brokers = newBrokers;
            state.error = undefined;
        },

        // Removes a broker's value using source and mappedItemId (requires mapping)
        removeValueWithoutBrokerId(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier }>) {
            const { idArgs } = action.payload;
            const targetBrokerId = resolveBrokerId(state, idArgs);
            if (!targetBrokerId) return;
            const { [targetBrokerId]: removed, ...newBrokers } = state.brokers;
            state.brokers = newBrokers;
            state.error = undefined;
        },

        setError(state: BrokerState, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },

        // Clears the error state
        clearError(state: BrokerState) {
            state.error = undefined;
        },

        ...optionsReducers,
        ...tableReducers,
        ...textReducers,
        ...dynamicReducers,
        ...numberReducers,
        ...booleanReducers,
        ...dateReducers,
        ...dangerousReducers,
    },
});

export default brokerSlice.reducer;
export const brokerActions = brokerSlice.actions;
