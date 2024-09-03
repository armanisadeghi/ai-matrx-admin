// File: @/features/counter/hooks/useCounter.ts

import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux-old/hooks';
import {
    increment,
    decrement,
    incrementByAmount,
    clearInputValue,
    optimisticUpdateInputValue
} from '@/features/counter/Actions';
import { fetchInputValue, updateInputValue } from '@/features/counter/Thunks';
import {
    selectCount,
    selectInputValue,
    selectIsInputValueLoaded,
    selectIsLoading,
    selectError,
    selectPendingUpdates
} from '@/features/counter/Selectors';

export const useCounter = () => {
    const count = useAppSelector(selectCount);
    const inputValue = useAppSelector(selectInputValue);
    const isInputValueLoaded = useAppSelector(selectIsInputValueLoaded);
    const isLoading = useAppSelector(selectIsLoading);
    const error = useAppSelector(selectError);
    const pendingUpdates = useAppSelector(selectPendingUpdates);
    const dispatch = useAppDispatch();

    const handleIncrement = useCallback(() => dispatch(increment()), [dispatch]);
    const handleDecrement = useCallback(() => dispatch(decrement()), [dispatch]);
    const handleFetchInputValue = useCallback(() => dispatch(fetchInputValue()), [dispatch]);
    const handleClearInputValue = useCallback(() => dispatch(clearInputValue()), [dispatch]);
    const handleUpdateInputValue = useCallback((value: number) => {
        dispatch(optimisticUpdateInputValue(value));
        dispatch(updateInputValue(value));
    }, [dispatch]);
    const handleIncrementByAmount = useCallback(() => {
        if (inputValue !== null) {
            dispatch(incrementByAmount(inputValue));
        }
    }, [dispatch, inputValue]);

    return {
        count,
        inputValue,
        isInputValueLoaded,
        isLoading,
        error,
        pendingUpdates,
        handleIncrement,
        handleDecrement,
        handleFetchInputValue,
        handleClearInputValue,
        handleUpdateInputValue,
        handleIncrementByAmount,
    };
};
