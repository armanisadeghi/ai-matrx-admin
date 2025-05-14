import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BrokerValue, RuntimeBrokerDefinition } from "../types";
import { FieldOption } from "@/types/customAppTypes";

interface BrokerValuesState {
    values: Record<string, BrokerValue>;
    history: Record<string, BrokerValue[]>;
    neededBrokers: Record<string, string[]>;
    brokerDefinitions: Record<string, Record<string, RuntimeBrokerDefinition>>; // appId -> brokerId -> definition
    isLoading: boolean;
    error: string | null;
}

const initialBrokerValuesState: BrokerValuesState = {
    values: {},
    history: {},
    neededBrokers: {},
    brokerDefinitions: {},
    isLoading: false,
    error: null,
};

export const brokerValuesSlice = createSlice({
    name: "brokerValues",
    initialState: initialBrokerValuesState,
    reducers: {
        // Existing reducers...
        setBrokerValue: (state, action: PayloadAction<BrokerValue>) => {
            const { id } = action.payload;
            if (state.values[id]) {
                if (!state.history[id]) {
                    state.history[id] = [];
                }
                state.history[id].push(state.values[id]);
            }
            state.values[id] = action.payload;
        },
        setBulkBrokerValues: (state, action: PayloadAction<BrokerValue[]>) => {
            action.payload.forEach((brokerValue) => {
                const { id } = brokerValue;
                if (state.values[id]) {
                    if (!state.history[id]) {
                        state.history[id] = [];
                    }
                    state.history[id].push(state.values[id]);
                }
                state.values[id] = brokerValue;
            });
        },
        removeBrokerValue: (state, action: PayloadAction<string>) => {
            if (state.values[action.payload]) {
                if (!state.history[action.payload]) {
                    state.history[action.payload] = [];
                }
                state.history[action.payload].push(state.values[action.payload]);
            }
            delete state.values[action.payload];
        },
        setTextValue: (
            state,
            action: PayloadAction<{ id: string; text: string; metadata?: Record<string, any> }>
        ) => {
            const { id, text, metadata } = action.payload;
            if (state.values[id]) {
                if (!state.history[id]) {
                    state.history[id] = [];
                }
                state.history[id].push(state.values[id]);
            }
            state.values[id] = {
                id,
                value: text,
                type: "text",
                metadata: metadata || {},
            };
        },
        setNumberValue: (
            state,
            action: PayloadAction<{ id: string; number: number; metadata?: Record<string, any> }>
        ) => {
            const { id, number, metadata } = action.payload;
            if (state.values[id]) {
                if (!state.history[id]) {
                    state.history[id] = [];
                }
                state.history[id].push(state.values[id]);
            }
            state.values[id] = {
                id,
                value: number,
                type: "number",
                metadata: metadata || {},
            };
        },
        setSelectValue: (
            state,
            action: PayloadAction<{
                id: string;
                value: string | string[];
                selectedOption: FieldOption | FieldOption[];
                metadata?: Record<string, any>;
            }>
        ) => {
            const { id, value, selectedOption, metadata } = action.payload;
            if (state.values[id]) {
                if (!state.history[id]) {
                    state.history[id] = [];
                }
                state.history[id].push(state.values[id]);
            }
            state.values[id] = {
                id,
                value,
                type: "select",
                metadata: {
                    selectedOption,
                    ...(metadata || {}),
                },
            };
        },
        setCheckboxValue: (
            state,
            action: PayloadAction<{
                id: string;
                checked: boolean;
                metadata?: Record<string, any>;
            }>
        ) => {
            const { id, checked, metadata } = action.payload;
            if (state.values[id]) {
                if (!state.history[id]) {
                    state.history[id] = [];
                }
                state.history[id].push(state.values[id]);
            }
            state.values[id] = {
                id,
                value: checked,
                type: "checkbox",
                metadata: metadata || {},
            };
        },
        setDateValue: (
            state,
            action: PayloadAction<{
                id: string;
                date: string;
                metadata?: Record<string, any>;
            }>
        ) => {
            const { id, date, metadata } = action.payload;
            if (state.values[id]) {
                if (!state.history[id]) {
                    state.history[id] = [];
                }
                state.history[id].push(state.values[id]);
            }
            state.values[id] = {
                id,
                value: date,
                type: "date",
                metadata: metadata || {},
            };
        },
        setSliderValue: (
            state,
            action: PayloadAction<{
                id: string;
                value: number | [number, number];
                metadata?: Record<string, any>;
            }>
        ) => {
            const { id, value, metadata } = action.payload;
            if (state.values[id]) {
                if (!state.history[id]) {
                    state.history[id] = [];
                }
                state.history[id].push(state.values[id]);
            }
            state.values[id] = {
                id,
                value,
                type: "slider",
                metadata: metadata || {},
            };
        },
        setJsonValue: (
            state,
            action: PayloadAction<{
                id: string;
                value: any;
                metadata?: Record<string, any>;
            }>
        ) => {
            const { id, value, metadata } = action.payload;
            if (state.values[id]) {
                if (!state.history[id]) {
                    state.history[id] = [];
                }
                state.history[id].push(state.values[id]);
            }
            state.values[id] = {
                id,
                value,
                type: "json",
                metadata: metadata || {},
            };
        },
        clearBrokerHistory: (state, action: PayloadAction<string>) => {
            state.history[action.payload] = [];
        },
        undoBrokerChange: (state, action: PayloadAction<string>) => {
            const brokerId = action.payload;
            if (state.history[brokerId] && state.history[brokerId].length > 0) {
                const lastValue = state.history[brokerId].pop();
                if (lastValue) {
                    state.values[brokerId] = lastValue;
                }
            }
        },
        addNeededBroker: (state, action: PayloadAction<{ appId: string; brokerId: string }>) => {
            if (!state.neededBrokers[action.payload.appId]) {
                state.neededBrokers[action.payload.appId] = [];
            }
            if (!state.neededBrokers[action.payload.appId].includes(action.payload.brokerId)) {
                state.neededBrokers[action.payload.appId].push(action.payload.brokerId);
            }
        },
        addNeededBrokers: (state, action: PayloadAction<{ appId: string; brokerIds: string[] }>) => {
            if (!state.neededBrokers[action.payload.appId]) {
                state.neededBrokers[action.payload.appId] = [];
            }
            const newBrokers = action.payload.brokerIds.filter(
                (id) => !state.neededBrokers[action.payload.appId].includes(id)
            );
            state.neededBrokers[action.payload.appId].push(...newBrokers);
        },
        removeNeededBroker: (state, action: PayloadAction<{ appId: string; brokerId: string }>) => {
            if (state.neededBrokers[action.payload.appId]) {
                state.neededBrokers[action.payload.appId] = state.neededBrokers[
                    action.payload.appId
                ].filter((id) => id !== action.payload.brokerId);
            }
        },
        clearNeededBrokers: (state, action: PayloadAction<string>) => {
            delete state.neededBrokers[action.payload];
        },
        // New reducers for broker definitions
        setBrokerDefinitions: (
            state,
            action: PayloadAction<{
                appId: string;
                definitions: Record<string, RuntimeBrokerDefinition>;
            }>
        ) => {
            state.brokerDefinitions[action.payload.appId] = action.payload.definitions;
        },
        addBrokerDefinition: (
            state,
            action: PayloadAction<{
                appId: string;
                brokerId: string;
                definition: RuntimeBrokerDefinition;
            }>
        ) => {
            if (!state.brokerDefinitions[action.payload.appId]) {
                state.brokerDefinitions[action.payload.appId] = {};
            }
            state.brokerDefinitions[action.payload.appId][action.payload.brokerId] = action.payload.definition;
        },
        clearBrokerDefinitions: (state, action: PayloadAction<string>) => {
            delete state.brokerDefinitions[action.payload];
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const {
    setBrokerValue,
    setBulkBrokerValues,
    removeBrokerValue,
    setTextValue,
    setNumberValue,
    setSelectValue,
    setCheckboxValue,
    setDateValue,
    setSliderValue,
    setJsonValue,
    clearBrokerHistory,
    undoBrokerChange,
    addNeededBroker,
    addNeededBrokers,
    removeNeededBroker,
    clearNeededBrokers,
    setBrokerDefinitions,
    addBrokerDefinition,
    clearBrokerDefinitions,
    setLoading,
    setError,
} = brokerValuesSlice.actions;

export default brokerValuesSlice.reducer;