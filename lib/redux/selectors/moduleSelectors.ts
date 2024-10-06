// lib/redux/moduleSelectors.ts

import { createSelector } from 'reselect';
import { RootState } from '../store';
import { ModuleBaseState } from '../slices/moduleSliceCreator';

export const createModuleSelectors = <T>(moduleName: string) => {

    const getModuleState = (state: RootState): ModuleBaseState<T> => state[moduleName];

    const getInitiated = createSelector([getModuleState], (state) => state.initiated);

    const getData = createSelector([getModuleState], (state) => state.data);

    const getItems = createSelector([getModuleState], (state) => state.items);

    const getUserPreferences = createSelector([getModuleState], (state) => state.userPreferences);

    const getLoading = createSelector([getModuleState], (state) => state.loading);

    const getError = createSelector([getModuleState], (state) => state.error);

    const getStaleTime = createSelector([getModuleState], (state) => state.staleTime);

    const getOne = createSelector(
        [getItems, (_state: RootState, id: string) => id],
        (items, id): T | undefined => items[id]
    );

    return {
        getInitiated,
        getData,
        getItems,
        getUserPreferences,
        getLoading,
        getError,
        getStaleTime,
        getOne,
    };
};
