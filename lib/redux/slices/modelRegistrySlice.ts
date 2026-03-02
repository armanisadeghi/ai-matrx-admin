import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { createClient } from '@/utils/supabase/client';

// AIModel — matches the ai_model table schema exactly (from matrixDb.types.ts)
export interface AIModel {
    id: string;
    name: string;
    common_name: string | null;
    api_class: string | null;
    capabilities: Record<string, unknown> | null;
    context_window: number | null;
    controls: Record<string, unknown> | null;
    endpoints: Record<string, unknown> | null;
    is_deprecated: boolean | null;
    is_premium: boolean | null;
    is_primary: boolean | null;
    max_tokens: number | null;
    model_class: string;
    model_provider: string | null;
    provider: string | null;
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

// Thunk to fetch models — skips fetch if already hydrated from SSR shell data RPC
export const fetchAvailableModels = createAsyncThunk(
    'modelRegistry/fetchAvailableModels',
    async (_, { getState, rejectWithValue }) => {
        // If models were pre-populated server-side, skip the fetch entirely
        const state = getState() as { modelRegistry: ModelRegistryState };
        if (state.modelRegistry.lastFetched !== null && state.modelRegistry.availableModels.length > 0) {
            return state.modelRegistry.availableModels;
        }

        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('ai_model')
                .select('*')
                .eq('is_deprecated', false)
                .order('common_name', { ascending: true });

            if (error) throw error;
            return data as AIModel[];
        } catch (error: unknown) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
        }
    }
);

const modelRegistrySlice = createSlice({
    name: 'modelRegistry',
    initialState,
    reducers: {
        hydrateModels(state, action: { payload: { availableModels: AIModel[]; lastFetched: number } }) {
            state.availableModels = action.payload.availableModels;
            state.lastFetched = action.payload.lastFetched;
            state.isLoading = false;
            state.error = null;
        },
    },
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

export const { hydrateModels } = modelRegistrySlice.actions;
export default modelRegistrySlice.reducer;

// Selectors
export const selectAvailableModels = (state: { modelRegistry: ModelRegistryState }) => state.modelRegistry.availableModels;
export const selectModelRegistryLoading = (state: { modelRegistry: ModelRegistryState }) => state.modelRegistry.isLoading;
export const selectModelRegistryError = (state: { modelRegistry: ModelRegistryState }) => state.modelRegistry.error;

export const selectModelOptions = createSelector(
    [(state: { modelRegistry: ModelRegistryState }) => state.modelRegistry.availableModels],
    (availableModels) => availableModels.map(model => ({
        value: model.id,
        label: model.common_name || model.name || model.id,
        provider: model.provider
    }))
);

export const selectModelControls = (state: { modelRegistry: ModelRegistryState }, modelId: string) => {
    const model = state.modelRegistry.availableModels.find(m => m.id === modelId);
    return model?.controls ?? null;
};

export const selectModelById = (state: { modelRegistry: ModelRegistryState }, modelId: string) =>
    state.modelRegistry.availableModels.find(m => m.id === modelId);
