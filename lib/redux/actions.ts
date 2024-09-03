import { createAction } from '@reduxjs/toolkit';
import { FeatureName, DeleteResponse, PaginatedResponse, FetchOneThunkArgs, FetchPaginatedThunkArgs, DeleteOneThunkArgs, DeleteManyThunkArgs, UpdateThunkArgs, CreateThunkArgs } from '@/types/reduxTypes';
import * as z from 'zod';

const createFeatureActionType = (featureName: FeatureName, action: string) =>
    `${featureName}/${action}`;

export const createFeatureActions = <T extends z.ZodTypeAny>(
    featureName: FeatureName,
    featureSchema: T
) => {
    type FeatureType = z.infer<typeof featureSchema>;

    return {
        // Local state update actions
        markDataStale: createAction<string>(createFeatureActionType(featureName, 'markDataStale')),
        updateOptimistic: createAction<FeatureType>(createFeatureActionType(featureName, 'updateOptimistic')),
        revertOptimisticUpdate: createAction<string>(createFeatureActionType(featureName, 'revertOptimisticUpdate')),
        addOptimistic: createAction<FeatureType>(createFeatureActionType(featureName, 'addOptimistic')),
        removeOptimistic: createAction<string>(createFeatureActionType(featureName, 'removeOptimistic')),
        replaceOptimistic: createAction<{ tempId: string, realEntity: FeatureType }>(
            createFeatureActionType(featureName, 'replaceOptimistic')
        ),

        // API thunk actions
        fetchOnePending: createAction<FetchOneThunkArgs>(createFeatureActionType(featureName, 'fetchOne/pending')),
        fetchOneFulfilled: createAction<FeatureType>(createFeatureActionType(featureName, 'fetchOne/fulfilled')),
        fetchOneRejected: createAction<string>(createFeatureActionType(featureName, 'fetchOne/rejected')),

        fetchPaginatedPending: createAction<FetchPaginatedThunkArgs>(createFeatureActionType(featureName, 'fetchPaginated/pending')),
        fetchPaginatedFulfilled: createAction<PaginatedResponse<FeatureType>>(createFeatureActionType(featureName, 'fetchPaginated/fulfilled')),
        fetchPaginatedRejected: createAction<string>(createFeatureActionType(featureName, 'fetchPaginated/rejected')),

        deleteOnePending: createAction<DeleteOneThunkArgs>(createFeatureActionType(featureName, 'deleteOne/pending')),
        deleteOneFulfilled: createAction<DeleteResponse>(createFeatureActionType(featureName, 'deleteOne/fulfilled')),
        deleteOneRejected: createAction<string>(createFeatureActionType(featureName, 'deleteOne/rejected')),

        deleteManyPending: createAction<DeleteManyThunkArgs>(createFeatureActionType(featureName, 'deleteMany/pending')),
        deleteManyFulfilled: createAction<DeleteResponse>(createFeatureActionType(featureName, 'deleteMany/fulfilled')),
        deleteManyRejected: createAction<string>(createFeatureActionType(featureName, 'deleteMany/rejected')),

        updatePending: createAction<UpdateThunkArgs>(createFeatureActionType(featureName, 'update/pending')),
        updateFulfilled: createAction<FeatureType>(createFeatureActionType(featureName, 'update/fulfilled')),
        updateRejected: createAction<string>(createFeatureActionType(featureName, 'update/rejected')),

        createPending: createAction<CreateThunkArgs>(createFeatureActionType(featureName, 'create/pending')),
        createFulfilled: createAction<FeatureType>(createFeatureActionType(featureName, 'create/fulfilled')),
        createRejected: createAction<string>(createFeatureActionType(featureName, 'create/rejected')),

        fetchWithFksPending: createAction<FetchOneThunkArgs>(`${featureName}/fetchWithFks/pending`),
        fetchWithFksFulfilled: createAction<PaginatedResponse<FeatureType>>(`${featureName}/fetchWithFks/fulfilled`),
        fetchWithFksRejected: createAction<string>(`${featureName}/fetchWithFks/rejected`),

        fetchWithIFKsPending: createAction<FetchOneThunkArgs>(`${featureName}/fetchWithIFKs/pending`),
        fetchWithIFKsFulfilled: createAction<PaginatedResponse<FeatureType>>(`${featureName}/fetchWithIFKs/fulfilled`),
        fetchWithIFKsRejected: createAction<string>(`${featureName}/fetchWithIFKs/rejected`),

        fetchWithFkIfkPending: createAction<FetchOneThunkArgs>(`${featureName}/fetchWithFkIfk/pending`),
        fetchWithFkIfkFulfilled: createAction<PaginatedResponse<FeatureType>>(`${featureName}/fetchWithFkIfk/fulfilled`),
        fetchWithFkIfkRejected: createAction<string>(`${featureName}/fetchWithFkIfk/rejected`),

        fetchCustomRelsPending: createAction<FetchOneThunkArgs>(`${featureName}/fetchCustomRels/pending`),
        fetchCustomRelsFulfilled: createAction<PaginatedResponse<FeatureType>>(`${featureName}/fetchCustomRels/fulfilled`),
        fetchCustomRelsRejected: createAction<string>(`${featureName}/fetchCustomRels/rejected`),

    };
};
