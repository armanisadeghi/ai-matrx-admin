// lib/redux/socket/slice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SocketState {
    [key: string]: any;
}

const initialState: SocketState = {};

const socketSlice = createSlice({
    name: 'socket',
    initialState,
    reducers: {
        socketEventReceived(state, action: PayloadAction<{ eventName: string; data: any }>) {
            const { eventName, data } = action.payload;
            state[eventName] = data;
        },
    },
});

export const { socketEventReceived } = socketSlice.actions;
export default socketSlice.reducer;
