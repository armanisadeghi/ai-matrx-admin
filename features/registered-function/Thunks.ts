// File location: @/features/registered-function/Thunks.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';
import { fetchRegisteredFunctionsSuccess, createRegisteredFunction, updateRegisteredFunction, deleteRegisteredFunction } from './Actions';
import {dbToUi, dbToUiArray, uiToDb, uiToRpc} from "@/features/registered-function/utils/objectConverter";

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

export const fetchPaginatedRegisteredFunctions = createAsyncThunk(
    'registeredFunction/fetchPaginated',
    async ({ page, pageSize }: { page: number, pageSize: number }, { dispatch }) => {
        const { data, error } = await supabase
            .rpc('fetch_paginated', {
                p_table_name: 'registered_function',
                p_page: page,
                p_page_size: pageSize
            });

        if (error) throw error;
        const frontData = dbToUiArray(data);
        dispatch(fetchRegisteredFunctionsSuccess(frontData));
        return { data: frontData, page, pageSize };
    }
);

export const createRegisteredFunctionRPC = createAsyncThunk(
    'registeredFunction/createRPC',
    async (registeredFunction: Omit<RegisteredFunctionType, 'id'>, { dispatch }) => {
        const rpcData = uiToRpc(registeredFunction);
        const { data, error } = await supabase
            .rpc('add_one_registered_function', rpcData);

        if (error) throw error;
        const frontData = dbToUi(data);
        dispatch(createRegisteredFunction(frontData));
        return frontData;
    }
);

export const updateRegisteredFunctionRPC = createAsyncThunk(
    'registeredFunction/updateRPC',
    async (registeredFunction: RegisteredFunctionType, { dispatch }) => {
        const { data, error } = await supabase
            .rpc('update_one', {
                p_table_name: 'registered_function',
                p_id: registeredFunction.id,
                p_data: JSON.stringify(uiToRpc(registeredFunction))
            });

        if (error) throw error;
        const frontData = dbToUi(data);
        dispatch(updateRegisteredFunction(frontData));
        return frontData;
    }
);

export const deleteRegisteredFunctionRPC = createAsyncThunk(
    'registeredFunction/deleteRPC',
    async (id: string, { dispatch }) => {
        const { error } = await supabase
            .rpc('delete_one', {
                p_table_name: 'registered_function',
                p_id: id
            });

        if (error) throw error;
        dispatch(deleteRegisteredFunction(id));
        return id;
    }
);

export const fetchFilteredRegisteredFunctions = createAsyncThunk(
    'registeredFunction/fetchFiltered',
    async (filterCriteria: Record<string, any>, { dispatch }) => {
        const { data, error } = await supabase
            .rpc('fetch_filtered', {
                p_table_name: 'registered_function',
                p_filter_criteria: filterCriteria
            });

        if (error) throw error;
        const frontData = dbToUiArray(data);
        dispatch(fetchRegisteredFunctionsSuccess(frontData));
        return frontData;
    }
);

export const fetchRegisteredFunctionWithChildren = createAsyncThunk(
    'registeredFunction/fetchWithChildren',
    async (id: string) => {
        const { data, error } = await supabase
            .rpc('fetch_with_children', {
                p_table_name: 'registered_function',
                p_id: id
            });

        if (error) throw error;

        const parsedData = JSON.parse(data as string);
        return dbToUi(parsedData);
    }
);

export const fetchAllRegisteredFunctionsWithChildren = createAsyncThunk(
    'registeredFunction/fetchAllWithChildren',
    async (_, { dispatch }) => {
        const { data, error } = await supabase
            .rpc('fetch_all_with_children', {
                p_table_name: 'registered_function'
            });

        if (error) throw error;

        const parsedData = JSON.parse(data as string);
        const frontData = dbToUiArray(parsedData);
        dispatch(fetchRegisteredFunctionsSuccess(frontData));
        return frontData;
    }
);

export const fetchRegisteredFunctionById = createAsyncThunk(
    'registeredFunction/fetchById',
    async (id: string) => {
        const { data, error } = await supabase
            .from('registered_function')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return dbToUi(data);
    }
);
