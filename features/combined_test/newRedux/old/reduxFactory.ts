/*
// reduxFactory.ts
import { createAsyncThunk, createSlice, PayloadAction, AsyncThunk, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { normalize, schema } from 'normalizr';
import { supabase, Json } from '@/lib/supabaseClient';
import { Database } from '@/types/matrixDb.types';
import * as z from 'zod';
import { featureSchemas, FeatureName } from './featureSchema';

// Type mappings
export type Id = string;
export type Page = number;
export type PageSize = number;
export type IncludeAllIdsNames = boolean;
export type ConversionFunction = string;
export type Ids = string[];
export type Payload = Record<string, any>;
export type UpdateFunction = string;
export type CreateFunction = string;

// Thunk argument interfaces
export interface FetchOneThunkArgs {
    featureName: FeatureName;
    id: Id;
}

export interface FetchPaginatedThunkArgs {
    featureName: FeatureName;
    page: Page;
    pageSize: PageSize;
    includeAllIdsNames?: IncludeAllIdsNames;
    conversionFunction?: ConversionFunction;
}

export interface DeleteOneThunkArgs {
    featureName: FeatureName;
    id: Id;
}

export interface DeleteManyThunkArgs {
    featureName: FeatureName;
    ids: Ids;
}

export interface UpdateThunkArgs {
    featureName: FeatureName;
    payload: Payload;
    updateFunction?: UpdateFunction;
}

export interface CreateThunkArgs {
    featureName: FeatureName;
    payload: Payload;
    createFunction?: CreateFunction;
}

// RPC function types
export type RpcFetchOneType = Database["public"]['Functions']['fetch_all_fk_ifk'];
export type RpcFetchPaginatedType = Database["public"]['Functions']['fetch_paginated_with_all_ids'];
export type RpcDeleteType = Database["public"]['Functions']['delete_by_id'];
export type RpcUpdateType = Database["public"]['Functions']['update_by_id'];
export type RpcCreateType = Database["public"]['Functions']['add_one_entry'];

// Response interfaces
export interface PaginatedResponse<T> {
    page: number;
    allIds: Array<{ id: string; name: string }>;
    pageSize: number;
    totalCount: number;
    paginatedData: T[];
}

export interface DeleteResponse {
    deletedIds: string[];
}

// Zod schemas for responses
const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T): z.ZodType<PaginatedResponse<z.infer<T>>> =>
    z.object({
        page: z.number(),
        allIds: z.array(z.object({ id: z.string(), name: z.string() })),
        pageSize: z.number(),
        totalCount: z.number(),
        paginatedData: z.array(itemSchema),
    }).strict() as z.ZodType<PaginatedResponse<z.infer<T>>>;

const deleteResponseSchema: z.ZodType<DeleteResponse> = z.object({
    deletedIds: z.array(z.string()).min(1),
}).strict() as z.ZodType<DeleteResponse>;


// Central API thunk creator
export const createApiThunk = <ThunkArg, ResponseType>(
    featureName: FeatureName,
    type: keyof Database["public"]['Functions'],
    apiCall: (arg: any) => Promise<Json>,
    argMapper: (arg: ThunkArg) => any,
    responseSchema: z.ZodType<ResponseType>
): AsyncThunk<ResponseType, ThunkArg, { rejectValue: string }> =>
    createAsyncThunk<ResponseType, ThunkArg, { rejectValue: string }>(
        `${featureName}/${type}`,
        async (arg, { rejectWithValue }) => {
            try {
                const mappedArg = argMapper(arg);
                const result = await apiCall(mappedArg);
                const parsedResult = responseSchema.parse(result);
                return parsedResult;
            } catch (error: any) {
                return rejectWithValue(error.message || 'An error occurred');
            }
        }
    );

// Argument mappers
const mapFetchOneArgs = (args: FetchOneThunkArgs): RpcFetchOneType['Args'] => ({
    p_table_name: args.featureName,
    p_id: args.id,
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

export const createFeatureSlice = <T extends z.ZodTypeAny>(
    featureName: FeatureName,
    featureSchema: T,
    additionalReducers: Record<string, any> = {}
) => {
    type FeatureType = z.infer<T>;

    const fetchOne = createApiThunk<FetchOneThunkArgs, FeatureType>(
        featureName,
        'fetch_all_fk_ifk',
        async (args) => {
            const { data, error } = await supabase.rpc('fetch_all_fk_ifk', args);
            if (error) throw error;
            return data;
        },
        mapFetchOneArgs,
        featureSchema
    );

    const fetchPaginated = createApiThunk<FetchPaginatedThunkArgs, PaginatedResponse<FeatureType>>(
        featureName,
        'fetch_paginated_with_all_ids',
        async (args) => {
            const { data, error } = await supabase.rpc('fetch_paginated_with_all_ids', args);
            if (error) throw error;
            return data;
        },
        mapFetchPaginatedArgs,
        createPaginatedResponseSchema(featureSchema)
    );

    const deleteOne = createApiThunk<DeleteOneThunkArgs, DeleteResponse>(
        featureName,
        'delete_by_id',
        async (args) => {
            const { data, error } = await supabase.rpc('delete_by_id', args);
            if (error) throw error;
            return data;
        },
        mapDeleteOneArgs,
        deleteResponseSchema
    );

    const deleteMany = createApiThunk<DeleteManyThunkArgs, DeleteResponse>(
        featureName,
        'delete_by_id',
        async (args) => {
            const { data, error } = await supabase.rpc('delete_by_id', args);
            if (error) throw error;
            return data;
        },
        mapDeleteManyArgs,
        deleteResponseSchema
    );

    const update = createApiThunk<UpdateThunkArgs, FeatureType>(
        featureName,
        'update_by_id',
        async (args) => {
            const { data, error } = await supabase.rpc('update_by_id', args);
            if (error) throw error;
            return data;
        },
        mapUpdateArgs,
        featureSchema
    );

    const create = createApiThunk<CreateThunkArgs, FeatureType>(
        featureName,
        'add_one_entry',
        async (args) => {
            const { data, error } = await supabase.rpc('add_one_entry', args);
            if (error) throw error;
            return data;
        },
        mapCreateArgs,
        featureSchema
    );

    interface SliceState {
        items: Record<string, FeatureType>;
        allIds: Array<{ id: string; name: string }>;
        totalCount: number;
        loading: boolean;
        error: string | null;
    }

    const slice = createSlice({
        name: featureName,
        initialState: {
            items: {},
            allIds: [],
            totalCount: 0,
            loading: false,
            error: null,
        } as SliceState,
        reducers: {},
        extraReducers: (builder) => {
            builder
                .addCase(fetchOne.pending, (state) => {
                    state.loading = true;
                })
                .addCase(fetchOne.fulfilled, (state, action) => {
                    state.loading = false;
                    state.items[action.payload.id] = action.payload;
                })
                .addCase(fetchOne.rejected, (state, action) => {
                    state.loading = false;
                    state.error = action.payload || 'An error occurred';
                })
                .addCase(fetchPaginated.fulfilled, (state, action) => {
                    action.payload.paginatedData.forEach((item) => {
                        state.items[item.id] = item;
                    });
                    state.allIds = action.payload.allIds;
                    state.totalCount = action.payload.totalCount;
                })
                .addCase(deleteOne.fulfilled, (state, action) => {
                    const deletedId = action.payload.deletedIds[0];
                    delete state.items[deletedId];
                    state.allIds = state.allIds.filter((item) => item.id !== deletedId);
                    state.totalCount -= 1;
                })
                .addCase(deleteMany.fulfilled, (state, action) => {
                    action.payload.deletedIds.forEach((id) => {
                        delete state.items[id];
                    });
                    state.allIds = state.allIds.filter((item) => !action.payload.deletedIds.includes(item.id));
                    state.totalCount -= action.payload.deletedIds.length;
                })
                .addCase(update.fulfilled, (state, action) => {
                    state.items[action.payload.id] = action.payload;
                    const index = state.allIds.findIndex((item) => item.id === action.payload.id);
                    if (index !== -1) {
                        state.allIds[index].name = action.payload.name;
                    }
                })
                .addCase(create.fulfilled, (state, action) => {
                    state.items[action.payload.id] = action.payload;
                    state.allIds.push({ id: action.payload.id, name: action.payload.name });
                    state.totalCount += 1;
                });

            Object.entries(additionalReducers).forEach(([type, reducer]) => {
                builder.addCase(type as any, reducer);
            });
        },
    });

    return {
        reducer: slice.reducer,
        actions: {
            fetchOne,
            fetchPaginated,
            deleteOne,
            deleteMany,
            update,
            create,
            ...slice.actions,
        },
    };
};

export const createFeatureSelectors = <T extends z.ZodTypeAny>(featureName: FeatureName) => {
    type FeatureType = z.infer<T>;

    const getItems = (state: any) => state[featureName].items as Record<string, FeatureType>;
    const getAllIds = (state: any) => state[featureName].allIds;
    const getTotalCount = (state: any) => state[featureName].totalCount;

    const getOne = createSelector(
        [getItems, (_state: any, id: string) => id],
        (items, id): FeatureType | undefined => items[id]
    );

    return { getItems, getOne, getAllIds, getTotalCount };
};
*/
