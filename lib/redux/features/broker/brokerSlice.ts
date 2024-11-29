// redux/features/broker/brokerSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Broker, BrokerInstance, BrokerValue } from './types';

interface BrokerState {
    brokerTemplates: Record<string, Broker>;
    brokerInstances: Record<string, Record<string, BrokerInstance>>;
}

const initialState: BrokerState = {
    brokerTemplates: {},
    brokerInstances: {},
};

const brokerSlice = createSlice({
    name: 'brokers',
    initialState,
    reducers: {
        loadBrokerTemplates: (state, action: PayloadAction<Record<string, Broker>>) => {
            state.brokerTemplates = action.payload;
        },
        initializeBrokerInstances: (state, action: PayloadAction<{ recipeId: string; brokerIds: string[] }>) => {
            const { recipeId, brokerIds } = action.payload;
            state.brokerInstances[recipeId] = brokerIds.reduce((acc, brokerId) => {
                const template = state.brokerTemplates[brokerId];
                if (template) {
                    acc[brokerId] = {
                        ...template,
                        value: template.defaultValue,
                        ready: false,
                    };
                }
                return acc;
            }, {} as Record<string, BrokerInstance>);
        },
        updateBrokerInstance: (state, action: PayloadAction<{
            recipeId: string;
            brokerId: string;
            updates: Partial<BrokerInstance>
        }>) => {
            const { recipeId, brokerId, updates } = action.payload;
            if (state.brokerInstances[recipeId]?.[brokerId]) {
                state.brokerInstances[recipeId][brokerId] = {
                    ...state.brokerInstances[recipeId][brokerId],
                    ...updates,
                };
            }
        },
        addBrokerInstance: (state, action: PayloadAction<{
            recipeId: string;
            brokerId: string
        }>) => {
            const { recipeId, brokerId } = action.payload;
            const template = state.brokerTemplates[brokerId];
            if (template && state.brokerInstances[recipeId]) {
                state.brokerInstances[recipeId][brokerId] = {
                    ...template,
                    value: template.defaultValue,
                    ready: false,
                };
            }
        },
        removeBrokerInstance: (state, action: PayloadAction<{
            recipeId: string;
            brokerId: string
        }>) => {
            const { recipeId, brokerId } = action.payload;
            if (state.brokerInstances[recipeId]) {
                delete state.brokerInstances[recipeId][brokerId];
            }
        },
        clearBrokerInstances: (state, action: PayloadAction<string>) => {
            const recipeId = action.payload;
            delete state.brokerInstances[recipeId];
        },
    },
});

export const {
    loadBrokerTemplates,
    initializeBrokerInstances,
    updateBrokerInstance,
    addBrokerInstance,
    removeBrokerInstance,
    clearBrokerInstances,
} = brokerSlice.actions;

export default brokerSlice.reducer;
