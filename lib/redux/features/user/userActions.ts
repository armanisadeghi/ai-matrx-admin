// redux/features/user/userActions.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import { AuthProfile, MatrixUser } from '@/types/user.types';
import { upsertFromAuth0 } from '@/hooks/users/upsertAuth0';
import { setUser, setLoading, setError } from './userSlice';

export const authenticateUser = createAsyncThunk(
    'user/authenticate',
    async (authProfile: AuthProfile, { dispatch }) => {
        dispatch(setLoading(true));
        try {
            const matrixUser = await upsertFromAuth0(authProfile);
            if (matrixUser) {
                dispatch(setUser(matrixUser));
            } else {
                dispatch(setError('Failed to upsert user'));
            }
        } catch (err) {
            dispatch(setError('Error in authenticateUser: ' + (err as Error).message));
        }
    }
);
