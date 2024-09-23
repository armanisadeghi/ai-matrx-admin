// File Location: lib/redux/apiThunks.ts

import {createAsyncThunk} from '@reduxjs/toolkit';
import {supabase} from '@/lib/supabase/client';
import {
    FeatureName,
    FetchOneThunkArgs,
    FetchPaginatedThunkArgs,
    DeleteOneThunkArgs,
    DeleteManyThunkArgs,
    UpdateThunkArgs,
    CreateThunkArgs,
    RpcFetchOneType,
    RpcFetchPaginatedType,
    RpcDeleteType,
    RpcUpdateType,
    RpcCreateType, PaginatedResponse, FetchCustomRelsThunkArgs, RpcFetchCustomRelsType,
} from '@/types/reduxTypes';
import {createFeatureNormalizer} from '@/lib/redux/normalizers';
import * as z from 'zod';


const mapFetchOneArgs = (args: FetchOneThunkArgs): RpcFetchOneType['Args'] => ({
    p_id: args.id,
    p_table_name: args.featureName,
});

const mapFetchWithIfkArgs = (args: FetchOneThunkArgs): RpcFetchOneType['Args'] => ({
    p_table_name: "registered_function",
    p_id: args.id,
});


const mapFetchCustomRelsArgs = (args: FetchCustomRelsThunkArgs): RpcFetchCustomRelsType['Args'] => ({
    p_table_name: args.featureName,
    p_id: args.id,
    p_table_list: args.tableList,
});


const mapFetchPaginatedArgs = (args: FetchPaginatedThunkArgs): RpcFetchPaginatedType['Args'] => ({
    p_table_name: args.featureName,
    p_page: args.page,
    p_page_size: args.pageSize,
    p_include_all_ids: args.includeAllIdsNames,
    p_conversion_function: args.conversionFunction,
});

const mapDeleteOneArgs = (args: DeleteOneThunkArgs): RpcDeleteType['Args'] => ({
    p_table_name: args.featureName,
    p_ids: [args.id],
});

const mapDeleteManyArgs = (args: DeleteManyThunkArgs): RpcDeleteType['Args'] => ({
    p_table_name: args.featureName,
    p_ids: args.ids,
});

const mapUpdateArgs = (args: UpdateThunkArgs): RpcUpdateType['Args'] => ({
    p_table_name: args.featureName,
    p_payload: args.payload,
    p_update_function: args.updateFunction,
});

const mapCreateArgs = (args: CreateThunkArgs): RpcCreateType['Args'] => ({
    p_table_name: args.featureName,
    p_payload: args.payload,
    p_create_function: args.createFunction,
});

export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(
    itemSchema: T
): z.ZodType<PaginatedResponse<z.infer<T>>> => {
    const schema = z.object({
        page: z.number(),
        allIdAndNames: z.array(z.object({ id: z.string(), name: z.string() })),
        pageSize: z.number(),
        totalCount: z.number(),
        paginatedData: z.array(z.union([itemSchema, z.string()])),
    }).strict() as z.ZodType<PaginatedResponse<z.infer<T>>>;

    return schema.superRefine((data, ctx) => {
        try {
            data.paginatedData = data.paginatedData.map(item => {
                if (typeof item === 'object') {
                    console.log('Unexpected object found, returning as is:', item);
                    return item;
                }
                return JSON.parse(item);
            });
        } catch (error) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Failed to parse JSON string in paginatedData: ${error.message}`,
                path: ["paginatedData"],
            });
        }
    }) as z.ZodType<PaginatedResponse<z.infer<T>>>;
};


export const createApiThunks = <T extends z.ZodTypeAny>(featureName: FeatureName, featureSchema: T) => {
    const normalizer = createFeatureNormalizer<T>(featureName);
    const paginatedResponseSchema = createPaginatedResponseSchema(featureSchema);

    const fetchPaginated = createAsyncThunk(
        `${featureName}/fetchPaginated`,
        async (args: FetchPaginatedThunkArgs, { rejectWithValue }) => {
            try {
                if (args.conversionFunction == null) {
                    args.conversionFunction = 'standard';
                }
                const { data, error } = await supabase.rpc('fetch_paginated_with_all_ids', mapFetchPaginatedArgs(args));
                if (error) throw error;
                const validatedData = paginatedResponseSchema.parse(data);

                // TODO: For now, returning only validated Data because normalized data will probably require changing to a Saga.
                const normalizedData = normalizer.normalizeMany(validatedData.paginatedData);

                return validatedData;
            } catch (error) {
                return rejectWithValue(error.message || 'An error occurred');
            }
        }
    );

    const fetchOne = createAsyncThunk(
        `${featureName}/fetchOne`,
        async (args: FetchOneThunkArgs, {getState, rejectWithValue}) => {
            const state = getState()[featureName];
            const lastFetched = state.lastFetched[args.id] || 0;

            console.log('apiThunks.ts: fetchOne');
            console.log('Current Stale Time: ', state.staleTime);
            console.log('Current Time: ', Date.now());
            console.log('Last Fetched Time: ', lastFetched);
            console.log('Difference: ', Date.now() - lastFetched);


            if (Date.now() - lastFetched < state.staleTime) {
                const timeSinceLastFetched = Date.now() - lastFetched;
                console.log('Time Since Last Fetched: ', timeSinceLastFetched);
                return state.items[args.id];
            }
            console.log('Fetching from API with Args:', mapFetchWithIfkArgs(args));
            try {
                const {data, error} = await supabase.rpc('find_fk_entries', mapFetchWithIfkArgs(args));
                if (error) throw error;

                console.log('Raw Supabase Response:', { data, error });
                const validatedData = featureSchema.parse(data);

                // TODO: For now, returning only validated Data because normalized data will probably require changing to a Saga.
                const normalizedData = normalizer.normalizeOne(validatedData).entities[featureName];

                console.log('Returning validated data:', validatedData);
                return validatedData;

            } catch (error) {
                return rejectWithValue(error.message || 'An error occurred');
            }
        }
    );

    // const fetchOne = createAsyncThunk(
    //     `${featureName}/fetchOne`,
    //     async (args: FetchOneThunkArgs, {getState, rejectWithValue}) => {
    //         const state = getState()[featureName];
    //         const lastFetched = state.lastFetched[args.id] || 0;
    //
    //         console.log('apiThunks.ts: fetchOne');
    //         console.log('Current Stale Time: ', state.staleTime);
    //         console.log('Current Time: ', Date.now());
    //         console.log('Last Fetched Time: ', lastFetched);
    //         console.log('Difference: ', Date.now() - lastFetched);
    //
    //
    //         if (Date.now() - lastFetched < state.staleTime) {
    //             const timeSinceLastFetched = Date.now() - lastFetched;
    //             console.log('Time Since Last Fetched: ', timeSinceLastFetched);
    //             return state.items[args.id];
    //         }
    //         console.log('Fetching from API with Args:', mapFetchCustomRelsArgs(args));
    //         try {
    //             const {data, error} = await supabase.rpc('fetch_custom_rels', mapFetchCustomRelsArgs(args));
    //             if (error) throw error;
    //
    //             console.log('Raw Supabase Response:', { data, error });
    //             const validatedData = featureSchema.parse(data);
    //
    //             // TODO: For now, returning only validated Data because normalized data will probably require changing to a Saga.
    //             const normalizedData = normalizer.normalizeOne(validatedData).entities[featureName];
    //
    //             console.log('Returning validated data:', validatedData);
    //             return validatedData;
    //
    //         } catch (error) {
    //             return rejectWithValue(error.message || 'An error occurred');
    //         }
    //     }
    // );


    const deleteOne = createAsyncThunk(
        `${featureName}/deleteOne`,
        async (args: DeleteOneThunkArgs, {rejectWithValue}) => {
            try {
                const {data, error} = await supabase.rpc('delete_by_id', mapDeleteOneArgs(args));
                if (error) throw error;
                return data as { deletedIds: string[] };
            } catch (error) {
                return rejectWithValue(error.message || 'An error occurred');
            }
        }
    );

    const deleteMany = createAsyncThunk(
        `${featureName}/deleteMany`,
        async (args: DeleteManyThunkArgs, {rejectWithValue}) => {
            try {
                const {data, error} = await supabase.rpc('delete_by_id', mapDeleteManyArgs(args));
                if (error) throw error;
                return data as { deletedIds: string[] };
            } catch (error) {
                return rejectWithValue(error.message || 'An error occurred');
            }
        }
    );

    const update = createAsyncThunk(
        `${featureName}/update`,
        async (args: UpdateThunkArgs, {dispatch, rejectWithValue}) => {
            dispatch({type: `${featureName}/updateOptimistic`, payload: args.payload});
            try {
                const {data, error} = await supabase.rpc('update_by_id', mapUpdateArgs(args));
                if (error) throw error;
                const validatedData = featureSchema.parse(data);
                return normalizer.normalizeOne(validatedData).entities[featureName];
            } catch (error) {
                dispatch({type: `${featureName}/revertOptimisticUpdate`, payload: args.payload.id});
                return rejectWithValue(error.message || 'An error occurred');
            }
        }
    );

    const create = createAsyncThunk(
        `${featureName}/create`,
        async (args: CreateThunkArgs, {dispatch, rejectWithValue}) => {
            const tempId = 'temp_' + Date.now();
            dispatch({type: `${featureName}/addOptimistic`, payload: {...args.payload, id: tempId}});
            try {
                const {data, error} = await supabase.rpc('add_one_entry', mapCreateArgs(args));
                if (error) throw error;
                const validatedData = featureSchema.parse(data);
                const normalizedData = normalizer.normalizeOne(validatedData).entities[featureName];
                dispatch({type: `${featureName}/replaceOptimistic`, payload: {tempId, realEntity: normalizedData}});
                return normalizedData;
            } catch (error) {
                dispatch({type: `${featureName}/removeOptimistic`, payload: tempId});
                return rejectWithValue(error.message || 'An error occurred');
            }
        }
    );

    return {fetchOne, fetchPaginated, deleteOne, deleteMany, update, create};
};
