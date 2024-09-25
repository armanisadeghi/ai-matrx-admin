// File Location: features/registered-function/registeredFunctionActions.ts


/*
// File Location: features/registered-function/redux/auth.actions.ts

import { createFeatureActions } from '@/lib/redux/actions';
import { RegisteredFunctionBaseSchema } from '@/types/registeredFunctionTypes';
import { createAction } from '@reduxjs/toolkit';

// Reuse createFeatureActions
const baseActions = createFeatureActions('registeredFunction', RegisteredFunctionBaseSchema);

// Additional clearly labeled actions for readability
const registeredFunctionActions = {
    ...baseActions,
    CREATE_ONE: createAction<{ payload: any }>('registeredFunction/create'),
    FETCH_ONE: createAction<{ id: string }>('registeredFunction/fetchOne'),
    FETCH_PAGINATED: createAction<{ page: number, pageSize: number }>('registeredFunction/fetchPaginated'),
    DELETE_ONE: createAction<{ id: string }>('registeredFunction/deleteOne'),
    DELETE_MANY: createAction<{ ids: string[] }>('registeredFunction/deleteMany'),
    UPDATE: createAction<{ id: string, payload: any }>('registeredFunction/update'),

    FETCH_ASSOCIATED_BROKER: createAction<{ brokerId: string }>('returnBroker/fetchOne'),
    FETCH_ASSOCIATED_ARGS: createAction<{ argsId: string }>('searchByCustomField/searchByCustomField'),
};

export const {
    CREATE_ONE,
    FETCH_ONE,
    FETCH_PAGINATED,
    DELETE_ONE,
    DELETE_MANY,
    UPDATE,
    FETCH_ASSOCIATED_BROKER,
    FETCH_ASSOCIATED_ARGS,
    markDataStale,
    updateOptimistic,
    revertOptimisticUpdate,
    addOptimistic,
    removeOptimistic,
    replaceOptimistic,
    fetchOnePending,
    fetchOneFulfilled,
    fetchOneRejected,
    fetchPaginatedPending,
    fetchPaginatedFulfilled,
    fetchPaginatedRejected,
    deleteOnePending,
    deleteOneFulfilled,
    deleteOneRejected,
    deleteManyPending,
    deleteManyFulfilled,
    deleteManyRejected,
    updatePending,
    updateFulfilled,
    updateRejected,
    createPending,
    createFulfilled,
    createRejected,
} = registeredFunctionActions;
*/
