// src/redux/features/functions/functionsSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FunctionsState, Function, Arg, Return } from './functionsTypes';

const initialState: FunctionsState = {
    functions: {},
    loading: false,
    error: null,
};

const functionsSlice = createSlice({
    name: 'functions',
    initialState,
    reducers: {
        setFunctions: (state, action: PayloadAction<Function[]>) => {
            state.functions = action.payload.reduce((acc, func) => {
                acc[func.id] = func;
                return acc;
            }, {} as { [id: string]: Function });
        },
        addFunction: (state, action: PayloadAction<Function>) => {
            state.functions[action.payload.id] = action.payload;
        },
        updateFunction: (state, action: PayloadAction<Partial<Function> & { id: string }>) => {
            if (state.functions[action.payload.id]) {
                state.functions[action.payload.id] = { ...state.functions[action.payload.id], ...action.payload };
            }
        },
        deleteFunction: (state, action: PayloadAction<string>) => {
            delete state.functions[action.payload];
        },
        addArg: (state, action: PayloadAction<Arg>) => {
            const func = state.functions[action.payload.function_id];
            if (func) {
                func.args.push(action.payload);
            }
        },
        updateArg: (state, action: PayloadAction<Partial<Arg> & { id: string; function_id: string }>) => {
            const func = state.functions[action.payload.function_id];
            if (func) {
                const argIndex = func.args.findIndex(arg => arg.id === action.payload.id);
                if (argIndex !== -1) {
                    func.args[argIndex] = { ...func.args[argIndex], ...action.payload };
                }
            }
        },
        deleteArg: (state, action: PayloadAction<{ id: string; function_id: string }>) => {
            const func = state.functions[action.payload.function_id];
            if (func) {
                func.args = func.args.filter(arg => arg.id !== action.payload.id);
            }
        },
        addReturn: (state, action: PayloadAction<Return>) => {
            const func = state.functions[action.payload.function_id];
            if (func) {
                func.returns.push(action.payload);
            }
        },
        updateReturn: (state, action: PayloadAction<Partial<Return> & { id: string; function_id: string }>) => {
            const func = state.functions[action.payload.function_id];
            if (func) {
                const returnIndex = func.returns.findIndex(ret => ret.id === action.payload.id);
                if (returnIndex !== -1) {
                    func.returns[returnIndex] = { ...func.returns[returnIndex], ...action.payload };
                }
            }
        },
        deleteReturn: (state, action: PayloadAction<{ id: string; function_id: string }>) => {
            const func = state.functions[action.payload.function_id];
            if (func) {
                func.returns = func.returns.filter(ret => ret.id !== action.payload.id);
            }
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const {
    setFunctions,
    addFunction,
    updateFunction,
    deleteFunction,
    addArg,
    updateArg,
    deleteArg,
    addReturn,
    updateReturn,
    deleteReturn,
    setLoading,
    setError,
} = functionsSlice.actions;

export default functionsSlice.reducer;
