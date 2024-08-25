// File location: @/features/registered-function/hooks/useRegisteredFunctionCRUD.ts

import {useCallback} from 'react';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {RegisteredFunctionType} from '@/types/registeredFunctionTypes';
import {
    fetchRegisteredFunctions,
    createRegisteredFunctionThunk,
    updateRegisteredFunctionThunk,
    deleteRegisteredFunctionThunk,
    fetchPaginatedRegisteredFunctions,
    createRegisteredFunctionRPC,
    updateRegisteredFunctionRPC,
    deleteRegisteredFunctionRPC,
    fetchFilteredRegisteredFunctions,
    fetchRegisteredFunctionWithChildren,
    fetchAllRegisteredFunctionsWithChildren,
    fetchRegisteredFunctionById
} from '../Thunks';
import {selectRegisteredFunctions, selectRegisteredFunctionLoading, selectRegisteredFunctionError} from '../Selectors';

export const useRegisteredFunctionCRUD = () => {
    const dispatch = useAppDispatch();
    const registeredFunctions: RegisteredFunctionType[] = useAppSelector(selectRegisteredFunctions);
    const loading = useAppSelector(selectRegisteredFunctionLoading);
    const error = useAppSelector(selectRegisteredFunctionError);

    const fetchAll = useCallback(() => {
        dispatch(fetchRegisteredFunctions());
    }, [dispatch]);

    const create = useCallback((registeredFunction: Omit<RegisteredFunctionType, 'id'>) => {
        dispatch(createRegisteredFunctionThunk(registeredFunction));
    }, [dispatch]);

    const update = useCallback((registeredFunction: RegisteredFunctionType) => {
        dispatch(updateRegisteredFunctionThunk(registeredFunction));
    }, [dispatch]);

    const remove = useCallback((id: string) => {
        dispatch(deleteRegisteredFunctionThunk(id));
    }, [dispatch]);

    const fetchPaginated = useCallback((page: number, pageSize: number) => {
        return dispatch(fetchPaginatedRegisteredFunctions({page, pageSize}));
    }, [dispatch]);

    const createRPC = useCallback((registeredFunction: Omit<RegisteredFunctionType, 'id'>) => {
        return dispatch(createRegisteredFunctionRPC(registeredFunction));
    }, [dispatch]);

    const updateRPC = useCallback((registeredFunction: RegisteredFunctionType) => {
        return dispatch(updateRegisteredFunctionRPC(registeredFunction));
    }, [dispatch]);

    const deleteRPC = useCallback((id: string) => {
        return dispatch(deleteRegisteredFunctionRPC(id));
    }, [dispatch]);

    const fetchFiltered = useCallback((filterCriteria: Record<string, any>) => {
        return dispatch(fetchFilteredRegisteredFunctions(filterCriteria));
    }, [dispatch]);

    const fetchWithChildren = useCallback((id: string) => {
        return dispatch(fetchRegisteredFunctionWithChildren(id));
    }, [dispatch]);

    const fetchAllWithChildren = useCallback(() => {
        return dispatch(fetchAllRegisteredFunctionsWithChildren());
    }, [dispatch]);

    const fetchById = useCallback((id: string) => {
        return dispatch(fetchRegisteredFunctionById(id));
    }, [dispatch]);

    return {
        registeredFunctions,
        loading,
        error,
        fetchAll,
        create,
        update,
        remove,
        fetchPaginated,
        createRPC,
        updateRPC,
        deleteRPC,
        fetchFiltered,
        fetchWithChildren,
        fetchAllWithChildren,
        fetchById
    };
};
