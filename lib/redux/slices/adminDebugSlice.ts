import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux/store';

export interface AdminDebugState {
    // Global debug mode toggle
    isDebugMode: boolean;
    
    // Debug data - store anything here
    debugData: Record<string, any>;
    
    // Debug indicators
    indicators: {
        promptDebug?: {
            isOpen: boolean;
            data: any;
        };
        resourceDebug?: {
            isOpen: boolean;
            runId: string; // The ONLY thing we need - everything else comes from Redux selectors
        };
    };
}

const initialState: AdminDebugState = {
    isDebugMode: false,
    debugData: {},
    indicators: {},
};

const adminDebugSlice = createSlice({
    name: 'adminDebug',
    initialState,
    reducers: {
        // Toggle global debug mode
        toggleDebugMode: (state) => {
            state.isDebugMode = !state.isDebugMode;
        },
        
        // Set global debug mode
        setDebugMode: (state, action: PayloadAction<boolean>) => {
            state.isDebugMode = action.payload;
        },
        
        // Set debug data (replaces all data)
        setDebugData: (state, action: PayloadAction<Record<string, any>>) => {
            state.debugData = action.payload;
        },
        
        // Update debug data (merges with existing)
        updateDebugData: (state, action: PayloadAction<Record<string, any>>) => {
            state.debugData = { ...state.debugData, ...action.payload };
        },
        
        // Set a single debug key
        setDebugKey: (state, action: PayloadAction<{ key: string; value: any }>) => {
            state.debugData[action.payload.key] = action.payload.value;
        },
        
        // Remove a debug key
        removeDebugKey: (state, action: PayloadAction<string>) => {
            delete state.debugData[action.payload];
        },
        
        // Clear all debug data
        clearDebugData: (state) => {
            state.debugData = {};
        },
        
        // Reset all debug settings
        resetDebugState: () => initialState,
        
        // Indicator management
        showPromptDebugIndicator: (state, action: PayloadAction<any>) => {
            state.indicators.promptDebug = {
                isOpen: true,
                data: action.payload,
            };
        },
        hidePromptDebugIndicator: (state) => {
            state.indicators.promptDebug = undefined;
        },
        showResourceDebugIndicator: (state, action: PayloadAction<{ runId: string }>) => {
            state.indicators.resourceDebug = {
                isOpen: true,
                runId: action.payload.runId,
            };
        },
        hideResourceDebugIndicator: (state) => {
            state.indicators.resourceDebug = undefined;
        },
    },
});

// Actions
export const {
    toggleDebugMode,
    setDebugMode,
    setDebugData,
    updateDebugData,
    setDebugKey,
    removeDebugKey,
    clearDebugData,
    resetDebugState,
    showPromptDebugIndicator,
    hidePromptDebugIndicator,
    showResourceDebugIndicator,
    hideResourceDebugIndicator,
} = adminDebugSlice.actions;

// Selectors
export const selectAdminDebug = (state: RootState) => state.adminDebug;
export const selectIsDebugMode = (state: RootState) => state.adminDebug.isDebugMode;
export const selectDebugData = (state: RootState) => state.adminDebug.debugData;
export const selectDebugKey = (key: string) => (state: RootState) => state.adminDebug.debugData[key];
export const selectDebugIndicators = (state: RootState) => state.adminDebug.indicators;
export const selectPromptDebugIndicator = (state: RootState) => state.adminDebug.indicators.promptDebug;
export const selectResourceDebugIndicator = (state: RootState) => state.adminDebug.indicators.resourceDebug;

export default adminDebugSlice.reducer;

