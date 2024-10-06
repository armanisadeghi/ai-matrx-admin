import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ModuleName, ModuleSchema } from '@/lib/redux/moduleSchema';

export const createModuleSlice = <T extends ModuleSchema>(
    moduleName: ModuleName,
    initialState: T
) => {
    const slice = createSlice({
        name: moduleName,
        initialState,
        reducers: {
            setInitiated: (state, action: PayloadAction<boolean>) => {
                state.initiated = action.payload;
            },
            setLoading: (state, action: PayloadAction<boolean>) => {
                state.loading = action.payload;
            },
            setError: (state, action: PayloadAction<string | null>) => {
                state.error = action.payload;
            },
            setData: (state, action: PayloadAction<T['data']>) => {
                state.data = action.payload;
            },
            setConfigs: (state, action: PayloadAction<T['configs']>) => {
                state.configs = action.payload;
            },
            setUserPreferences: (state, action: PayloadAction<T['userPreferences']>) => {
                state.userPreferences = action.payload;
            },
            resetState: () => initialState,
            markDataStale: (state) => {
                state.staleTime = Date.now();
            },
            updateData: (state, action: PayloadAction<Partial<T['data']>>) => {
                state.data = { ...state.data, ...action.payload };
            },
            updateConfigs: (state, action: PayloadAction<Partial<T['configs']>>) => {
                state.configs = { ...state.configs, ...action.payload };
            },
            updateUserPreferences: (state, action: PayloadAction<Partial<T['userPreferences']>>) => {
                state.userPreferences = { ...state.userPreferences, ...action.payload };
            },
        },
    });

    return {
        reducer: slice.reducer,
        actions: slice.actions,
    };
};

export type ModuleActions<T extends ModuleSchema> = ReturnType<typeof createModuleSlice<T>>['actions'];