// File location: @/features/registered-function/hooks/useRegisteredFunctionCRUD.ts

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';
import { fetchRegisteredFunctions, createRegisteredFunctionThunk, updateRegisteredFunctionThunk, deleteRegisteredFunctionThunk } from '../Thunks';
import { selectRegisteredFunctions, selectRegisteredFunctionLoading, selectRegisteredFunctionError } from '../Selectors';

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

    return {
        registeredFunctions,
        loading,
        error,
        fetchAll,
        create,
        update,
        remove,
    };
};
