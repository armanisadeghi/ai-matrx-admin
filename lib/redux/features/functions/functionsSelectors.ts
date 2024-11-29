// src/redux/features/functions/functionsSelectors.ts

import { RootState } from '@/redux/store';
import { createSelector } from '@reduxjs/toolkit';
import { FunctionsState, Function } from './functionsTypes';

const selectFunctionsState = (state: RootState) => state.functions;

export const selectAllFunctions = createSelector(
    selectFunctionsState,
    (functionsState: FunctionsState) => Object.values(functionsState.functions)
);

export const selectFunctionById = createSelector(
    [selectFunctionsState, (_, id: string) => id],
    (functionsState: FunctionsState, id: string) => functionsState.functions[id]
);

export const selectFunctionsByTag = createSelector(
    [selectAllFunctions, (_, tag: string) => tag],
    (functions: Function[], tag: string) => functions.filter(func => func.tags.includes(tag))
);

export const selectFunctionsLoading = createSelector(
    selectFunctionsState,
    (functionsState: FunctionsState) => functionsState.loading
);

export const selectFunctionsError = createSelector(
    selectFunctionsState,
    (functionsState: FunctionsState) => functionsState.error
);
