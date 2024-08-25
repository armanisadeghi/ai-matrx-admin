// File Location: @/features/counter/Thunks.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux/store';
import { database } from '@/features/counter/Database';
import { optimisticUpdateInputValue, removeOptimisticUpdate } from './Slice';

export const fetchInputValue = createAsyncThunk<number, void, { state: RootState }>(
    'counter/fetchInputValue',
    async (_, { getState }) => {
        const state = getState();
        if (state.counter.isInputValueLoaded) {
            console.log('Input value already loaded, using cached value');
            return state.counter.inputValue!;
        }
        console.log('Fetching input value from database');
        const value = await database.fetchInputValue();
        return value;
    }
);

export const updateInputValue = createAsyncThunk<number, number, { state: RootState }>(
    'counter/updateInputValue',
    async (newValue, { dispatch, getState }) => {
        const updateId = Date.now().toString();
        dispatch(optimisticUpdateInputValue(newValue));

        try {
            console.log('Updating input value in database');
            await database.saveInputValue(newValue);
            dispatch(removeOptimisticUpdate(updateId));
            return newValue;
        } catch (error) {
            console.error('Failed to update input value:', error);
            dispatch(removeOptimisticUpdate(updateId));
            throw error;
        }
    }
);
