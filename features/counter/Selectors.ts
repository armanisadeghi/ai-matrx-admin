// File Location: @/features/counter/Selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux/store';

const counterState = (state: RootState) => state.counter;

export const selectCount = createSelector(
    counterState,
    (counter) => counter.value
);

export const selectInputValue = createSelector(
    counterState,
    (counter) => counter.inputValue
);

export const selectIsInputValueLoaded = createSelector(
    counterState,
    (counter) => counter.isInputValueLoaded
);

export const selectIsLoading = createSelector(
    counterState,
    (counter) => counter.isLoading
);

export const selectError = createSelector(
    counterState,
    (counter) => counter.error
);

export const selectPendingUpdates = createSelector(
    counterState,
    (counter) => counter.pendingUpdates
);
