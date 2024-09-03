/*
// File location: features/registered-function/redux/selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import { RegisteredFunctionBaseSchema } from '@/types/registeredFunctionTypes';
import { createFeatureSelectors } from '@/lib/redux/featureSelectors';

const registeredFunctionSelectors = createFeatureSelectors<typeof RegisteredFunctionBaseSchema>('registeredFunction');

export const selectRegisteredFunctionById = createSelector(
    [registeredFunctionSelectors.getItems, (_, id: string) => id],
    (items, id) => {
        console.log('selectRegisteredFunctionById:', items, id);
        return items[id];
    }
);

export const selectAllRegisteredFunctions = createSelector(
    [registeredFunctionSelectors.getItems],
    (items) => {
        console.log('selectAllRegisteredFunctions:', items);
        return Object.values(items);
    }
);

export const selectRegisteredFunctionLoading = createSelector(
    [registeredFunctionSelectors.getLoading],
    (loading) => {
        console.log('selectRegisteredFunctionLoading:', loading);
        return loading;
    }
);

export const selectRegisteredFunctionError = createSelector(
    [registeredFunctionSelectors.getError],
    (error) => {
        console.log('selectRegisteredFunctionError:', error);
        return error;
    }
);

export const selectRegisteredFunctionTotalCount = createSelector(
    [registeredFunctionSelectors.getTotalCount],
    (totalCount) => {
        console.log('selectRegisteredFunctionTotalCount:', totalCount);
        return totalCount;
    }
);

export const selectRegisteredFunctionAllIdAndNames = createSelector(
    [registeredFunctionSelectors.allIdAndNames],
    (allIdAndNames) => {
        console.log('selectRegisteredFunctionAllIdAndNames:', allIdAndNames);
        return allIdAndNames;
    }
);
*/
