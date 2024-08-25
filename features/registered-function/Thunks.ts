// File location: @/features/registered-function/Thunks.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';
import { fetchRegisteredFunctionsSuccess, createRegisteredFunction, updateRegisteredFunction, deleteRegisteredFunction } from './Actions';

export const fetchRegisteredFunctions = createAsyncThunk(
    'registeredFunction/fetch',
    async (_, { dispatch }) => {
        const { data, error } = await supabase
            .from('registered_functions')
            .select('*');

        if (error) throw error;
        dispatch(fetchRegisteredFunctionsSuccess(data as RegisteredFunctionType[]));
    }
);

export const createRegisteredFunctionThunk = createAsyncThunk(
    'registeredFunction/create',
    async (registeredFunction: Omit<RegisteredFunctionType, 'id'>, { dispatch }) => {
        const { data, error } = await supabase
            .from('registered_functions')
            .insert(registeredFunction)
            .single();

        if (error) throw error;
        dispatch(createRegisteredFunction(data as RegisteredFunctionType));
    }
);

export const updateRegisteredFunctionThunk = createAsyncThunk(
    'registeredFunction/update',
    async (registeredFunction: RegisteredFunctionType, { dispatch }) => {
        const { data, error } = await supabase
            .from('registered_functions')
            .update(registeredFunction)
            .eq('id', registeredFunction.id)
            .single();

        if (error) throw error;
        dispatch(updateRegisteredFunction(data as RegisteredFunctionType));
    }
);

export const deleteRegisteredFunctionThunk = createAsyncThunk(
    'registeredFunction/delete',
    async (id: string, { dispatch }) => {
        const { error } = await supabase
            .from('registered_functions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        dispatch(deleteRegisteredFunction(id));
    }
);
