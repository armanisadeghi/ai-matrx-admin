// redux/features/socket/socketSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SocketStatus = 'pending' | 'running' | 'completed' | 'failed';

interface SocketState {
    status: SocketStatus;
    isAuthenticated: boolean;
    sid: string | null;
    error: string | null;
}

const initialState: SocketState = {
    status: 'pending',
    isAuthenticated: false,
    sid: null,
    error: null,
};

const socketSlice = createSlice({
    name: 'socket',
    initialState,
    reducers: {
        setSocketStatus: (state, action: PayloadAction<SocketStatus>) => {
            state.status = action.payload;
        },
        setIsAuthenticated: (state, action: PayloadAction<boolean>) => {
            state.isAuthenticated = action.payload;
        },
        setSocketSid: (state, action: PayloadAction<string | null>) => {
            state.sid = action.payload;
        },
        setSocketError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const {
    setSocketStatus,
    setIsAuthenticated,
    setSocketSid,
    setSocketError,
} = socketSlice.actions;

export default socketSlice.reducer;
