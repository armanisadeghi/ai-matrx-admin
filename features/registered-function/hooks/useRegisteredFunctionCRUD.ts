// File location: @/features/registered-function/hooks/useRegisteredFunctionCRUD.ts

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { RegisteredFunctionType, FormData } from '@/types/registeredFunctionTypes';
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
    fetchRegisteredFunctionById, saveRegisteredFunction, prepareFormData
} from '../Thunks';
import {
    selectRegisteredFunctions,
    selectRegisteredFunctionById,
    selectRegisteredFunctionLoading,
    selectRegisteredFunctionError,
    selectRegisteredFunctionPagination
} from '../Selectors';

export const useRegisteredFunctionCRUD = () => {
    const dispatch = useAppDispatch();
    const registeredFunctions = useAppSelector(selectRegisteredFunctions);
    const loading = useAppSelector(selectRegisteredFunctionLoading);
    const error = useAppSelector(selectRegisteredFunctionError);
    const pagination = useAppSelector(selectRegisteredFunctionPagination);

    const fetchAll = useCallback(() => dispatch(fetchRegisteredFunctions()), [dispatch]);

    const create = useCallback((data: Omit<RegisteredFunctionType, 'id'>) =>
        dispatch(createRegisteredFunctionThunk(data)), [dispatch]);

    const update = useCallback((data: RegisteredFunctionType) =>
        dispatch(updateRegisteredFunctionThunk(data)), [dispatch]);

    const remove = useCallback((id: string) =>
        dispatch(deleteRegisteredFunctionThunk(id)), [dispatch]);

    const fetchById = useCallback((id: string) =>
        dispatch(fetchRegisteredFunctionById(id)), [dispatch]);

    const fetchPaginated = useCallback((page: number, pageSize: number) =>
        dispatch(fetchPaginatedRegisteredFunctions({page, pageSize})), [dispatch]);

    const createRPC = useCallback((registeredFunction: Omit<RegisteredFunctionType, 'id'>) =>
        dispatch(createRegisteredFunctionRPC(registeredFunction)), [dispatch]);

    const updateRPC = useCallback((registeredFunction: RegisteredFunctionType) =>
        dispatch(updateRegisteredFunctionRPC(registeredFunction)), [dispatch]);

    const deleteRPC = useCallback((id: string) =>
        dispatch(deleteRegisteredFunctionRPC(id)), [dispatch]);

    const fetchFiltered = useCallback((filterCriteria: Record<string, any>) =>
        dispatch(fetchFilteredRegisteredFunctions(filterCriteria)), [dispatch]);

    const fetchWithChildren = useCallback((id: string) =>
        dispatch(fetchRegisteredFunctionWithChildren(id)), [dispatch]);

    const fetchAllWithChildren = useCallback(() =>
        dispatch(fetchAllRegisteredFunctionsWithChildren()), [dispatch]);

    const prepareForm = useCallback((functionId?: string) =>
        dispatch(prepareFormData(functionId)), [dispatch]);

    const save = useCallback((data: FormData, functionId?: string) =>
        dispatch(saveRegisteredFunction({ data, functionId })), [dispatch]);

    return {
        registeredFunctions,
        loading,
        error,
        pagination,
        fetchAll,
        create,
        update,
        remove,
        fetchById,
        fetchPaginated,
        createRPC,
        updateRPC,
        deleteRPC,
        fetchFiltered,
        fetchWithChildren,
        fetchAllWithChildren,
        prepareForm,
        save,

    };
};
