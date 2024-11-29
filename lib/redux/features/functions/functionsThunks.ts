// src/redux/features/functions/functionsThunks.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import { Function, Arg, Return } from './functionsTypes';
import { setFunctions, addFunction, updateFunction, deleteFunction, setLoading, setError } from './functionsSlice';

// Replace these with your actual API calls
const api = {
    getFunctions: () => Promise.resolve([]),
    createFunction: (func: Omit<Function, 'id'>) => Promise.resolve({ id: '1', ...func }),
    updateFunction: (func: Partial<Function> & { id: string }) => Promise.resolve(func),
    deleteFunction: (id: string) => Promise.resolve(),
};

export const fetchFunctions = createAsyncThunk(
    'functions/fetchFunctions',
    async (_, { dispatch }) => {
        try {
            dispatch(setLoading(true));
            const functions = await api.getFunctions();
            dispatch(setFunctions(functions));
        } catch (error) {
            dispatch(setError(error.message));
        } finally {
            dispatch(setLoading(false));
        }
    }
);

export const createFunction = createAsyncThunk(
    'functions/createFunction',
    async (func: Omit<Function, 'id'>, { dispatch }) => {
        try {
            dispatch(setLoading(true));
            const newFunc = await api.createFunction(func);
            dispatch(addFunction(newFunc));
        } catch (error) {
            dispatch(setError(error.message));
        } finally {
            dispatch(setLoading(false));
        }
    }
);

export const updateFunctionThunk = createAsyncThunk(
    'functions/updateFunction',
    async (func: Partial<Function> & { id: string }, { dispatch }) => {
        try {
            dispatch(setLoading(true));
            const updatedFunc = await api.updateFunction(func);
            dispatch(updateFunction(updatedFunc));
        } catch (error) {
            dispatch(setError(error.message));
        } finally {
            dispatch(setLoading(false));
        }
    }
);

export const deleteFunctionThunk = createAsyncThunk(
    'functions/deleteFunction',
    async (id: string, { dispatch }) => {
        try {
            dispatch(setLoading(true));
            await api.deleteFunction(id);
            dispatch(deleteFunction(id));
        } catch (error) {
            dispatch(setError(error.message));
        } finally {
            dispatch(setLoading(false));
        }
    }
);

// Add similar thunks for Args and Returns if needed
