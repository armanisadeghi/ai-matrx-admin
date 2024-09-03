// features/combined_test/newRedux/reduxTypes.ts

import { Database } from '@/types/matrixDb.types';

export type Id = string;
export type Page = number;
export type PageSize = number;
export type IncludeAllIdsNames = boolean;
export type ConversionFunction = string;
export type Ids = string[];
export type Payload = Record<string, any>;
export type UpdateFunction = string;
export type CreateFunction = string;
export type FeatureName = string;


// RPC function types
export type RpcFetchOneType = Database["public"]['Functions']['fetch_all_fk_ifk'];
export type RpcFetchPaginatedType = Database["public"]['Functions']['fetch_paginated_with_all_ids'];
export type RpcDeleteType = Database["public"]['Functions']['delete_by_id'];
export type RpcUpdateType = Database["public"]['Functions']['update_by_id'];
export type RpcCreateType = Database["public"]['Functions']['add_one_entry'];

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


export type SliceState<FeatureType> = {
    items: Record<string, FeatureType>;
    allIdAndNames: { id: string; name: string }[];
    totalCount: number;
    loading: boolean;
    error: string | null;
    lastFetched: Record<string, number>;
    staleTime: number;
    backups: Record<string, FeatureType>;
};


export interface PaginatedResponse<T> {
    page: number;
    allIdAndNames: Array<{ id: string; name: string }>;
    pageSize: number;
    totalCount: number;
    paginatedData: T[];
}

export interface DeleteResponse {
    deletedIds: string[];
}

