// File location: @/features/registered-function/Selectors.ts

import { createSelector } from 'reselect';
import { RootState } from '@/lib/redux/store';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';

const selectRegisteredFunctionState = (state: RootState) => state.registeredFunction;

export const selectRegisteredFunctions = createSelector(
    [selectRegisteredFunctionState],
    (registeredFunctionState) => registeredFunctionState.data
);

export const selectRegisteredFunctionById = createSelector(
    [selectRegisteredFunctions, (_, id: string) => id],
    (registeredFunctions, id) => registeredFunctions.find(rf => rf.id === id)
);

export const selectRegisteredFunctionLoading = createSelector(
    [selectRegisteredFunctionState],
    (registeredFunctionState) => registeredFunctionState.loading
);

export const selectRegisteredFunctionError = createSelector(
    [selectRegisteredFunctionState],
    (registeredFunctionState) => registeredFunctionState.error
);

export const selectRegisteredFunctionPagination = createSelector(
    [selectRegisteredFunctionState],
    (registeredFunctionState) => ({
        currentPage: registeredFunctionState.currentPage,
        pageSize: registeredFunctionState.pageSize,
        totalCount: registeredFunctionState.totalCount,
    })
);
