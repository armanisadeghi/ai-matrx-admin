// File Location: @/features/counter/middleware.ts

import { Middleware, isAnyOf } from '@reduxjs/toolkit';
import { increment, decrement, incrementByAmount, clearInputValue } from './Actions';
import { fetchInputValue, updateInputValue } from './Thunks';

export const middleware: Middleware = (storeAPI) => (next) => (action) => {
    const result = next(action);
    const state = storeAPI.getState();

    if (isAnyOf(increment, decrement, incrementByAmount)(action)) {
        console.log('Counter value changed:', state.counter.value);
    }

    if (isAnyOf(fetchInputValue.fulfilled, updateInputValue.fulfilled)(action)) {
        console.log('Input value updated:', state.counter.inputValue);
    }

    if (clearInputValue.match(action)) {
        console.log('Input value cleared');
    }

    return result;
};
