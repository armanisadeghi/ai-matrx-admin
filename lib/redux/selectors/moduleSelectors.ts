import { createSelector } from '@reduxjs/toolkit';
import { ModuleName, ModuleSchema } from '../moduleSchema';
import { RootState } from '../store';

export const createModuleSelectors = <T extends ModuleSchema>(moduleName: ModuleName) => {
    const getModuleState = (state: RootState): T => state[moduleName] as T;

    const getInitiated = createSelector([getModuleState], (state) => state.initiated);
    const getData = createSelector([getModuleState], (state) => state.data);
    const getConfigs = createSelector([getModuleState], (state) => state.configs);
    const getUserPreferences = createSelector([getModuleState], (state) => state.userPreferences);
    const getLoading = createSelector([getModuleState], (state) => state.loading);
    const getError = createSelector([getModuleState], (state) => state.error);
    const getStaleTime = createSelector([getModuleState], (state) => state.staleTime);

    const getOneData = <K extends keyof T['data']>(key: K) =>
        createSelector([getData], (data) => data[key]);

    const getOneConfig = <K extends keyof T['configs']>(key: K) =>
        createSelector([getConfigs], (configs) => configs[key]);

    const getOneUserPreference = <K extends keyof T['userPreferences']>(key: K) =>
        createSelector([getUserPreferences], (userPreferences) => userPreferences[key]);

    return {
        getModuleState,
        getInitiated,
        getData,
        getConfigs,
        getUserPreferences,
        getLoading,
        getError,
        getStaleTime,
        getOneData,
        getOneConfig,
        getOneUserPreference,
    };
};

export type ModuleSelectors<T extends ModuleSchema> = ReturnType<typeof createModuleSelectors<T>>;