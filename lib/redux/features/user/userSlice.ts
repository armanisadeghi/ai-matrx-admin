// redux/features/user/userSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MatrixUser } from '@/types/user.types';

interface UserState {
    currentUser: MatrixUser | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: UserState = {
    currentUser: null,
    isLoading: false,
    error: null,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<MatrixUser>) => {
            state.currentUser = action.payload;
            state.error = null;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.isLoading = false;
        },
        clearUser: (state) => {
            state.currentUser = null;
            state.isLoading = false;
            state.error = null;
        },
    },
});

export const { setUser, setLoading, setError, clearUser } = userSlice.actions;

export default userSlice.reducer;
