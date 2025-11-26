import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { createClient } from '@/utils/supabase/client';
import { useModelControls } from '@/features/prompts/hooks/useModelControls';

// Define AIModel interface based on common usage
export interface AIModel {
    id: string;
    name: string;
    description?: string;
    provider: string;
    family?: string;
    context_window?: number;
    max_tokens?: number;
    controls?: Record<string, any>;
    is_deprecated?: boolean;
    [key: string]: any;
}

interface ModelRegistryState {
    availableModels: AIModel[];
    isLoading: boolean;
    error: string | null;
    lastFetched: number | null;
}

const initialState: ModelRegistryState = {
    availableModels: [],
    isLoading: false,
    error: null,
    lastFetched: null,
};

// Thunk to fetch models
export const fetchAvailableModels = createAsyncThunk(
    'modelRegistry/fetchAvailableModels',
    async (_, { rejectWithValue }) => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('ai_model')
                .select('*')
                .eq('is_deprecated', false)
                .order('common_name', { ascending: true });

            if (error) throw error;
            return data as AIModel[];
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const modelRegistrySlice = createSlice({
    name: 'modelRegistry',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAvailableModels.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAvailableModels.fulfilled, (state, action) => {
                state.isLoading = false;
                state.availableModels = action.payload;
                state.lastFetched = Date.now();
            })
            .addCase(fetchAvailableModels.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export default modelRegistrySlice.reducer;

// Selectors
export const selectAvailableModels = (state: { modelRegistry: ModelRegistryState }) => state.modelRegistry.availableModels;
export const selectModelRegistryLoading = (state: { modelRegistry: ModelRegistryState }) => state.modelRegistry.isLoading;
export const selectModelRegistryError = (state: { modelRegistry: ModelRegistryState }) => state.modelRegistry.error;

export const selectModelOptions = createSelector(
    [(state: { modelRegistry: ModelRegistryState }) => state.modelRegistry.availableModels],
    (availableModels) => availableModels.map(model => ({
        value: model.id,
        label: model.name || model.id, // Fallback to ID if name is missing
        provider: model.provider
    }))
);

export const selectModelControls = (state: { modelRegistry: ModelRegistryState }, modelId: string) => {
    const model = state.modelRegistry.availableModels.find(m => m.id === modelId);
    if (!model) return null;
    // We can reuse the logic from useModelControls here if needed, 
    // or just return the raw controls for the component to process.
    // The hook useModelControls is designed for components, but we can extract the logic.
    // For now, let's return the raw model and let the component/hook handle normalization
    // to avoid duplicating logic or refactoring the hook right now.
    return model.controls;
};

export const selectModelById = (state: { modelRegistry: ModelRegistryState }, modelId: string) =>
    state.modelRegistry.availableModels.find(m => m.id === modelId);
