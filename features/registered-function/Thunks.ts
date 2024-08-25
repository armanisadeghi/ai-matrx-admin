// File location: @/features/registered-function/Thunks.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';
import { fetchRegisteredFunctionsSuccess, createRegisteredFunction, updateRegisteredFunction, deleteRegisteredFunction } from './Actions';
import {dbToUiArray, uiToDb} from "@/features/registered-function/objectConverter";

export const fetchRegisteredFunctions = createAsyncThunk(
    'registeredFunction/fetch',
    async (_, { dispatch }) => {

        const { data, error } = await supabase
            .from('registered_function')
            .select('*');

        if (error) throw error;
        const frontData = dbToUiArray(data);
        dispatch(fetchRegisteredFunctionsSuccess(frontData));
    }
);

export const createRegisteredFunctionThunk = createAsyncThunk(
    'registeredFunction/create',
    async (registeredFunction: Omit<RegisteredFunctionType, 'id'>, { dispatch }) => {
        const registered_function = uiToDb(registeredFunction);

        const { data, error } = await supabase
            .from('registered_function')
            .insert(registered_function)
            .single();

        if (error) throw error;
        dispatch(createRegisteredFunction(data as RegisteredFunctionType));
    }
);

export const updateRegisteredFunctionThunk = createAsyncThunk(
    'registeredFunction/update',
    async (registeredFunction: RegisteredFunctionType, { dispatch }) => {
        const registered_function = uiToDb(registeredFunction);

        const { data, error } = await supabase
            .from('registered_function')
            .update(registered_function)
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
            .from('registered_function')
            .delete()
            .eq('id', id);

        if (error) throw error;
        dispatch(deleteRegisteredFunction(id));
    }
);
