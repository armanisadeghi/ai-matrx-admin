// lib/redux/socket/slice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SocketState {
    responses: Record<string, any>; // Store responses keyed by unique identifiers
    status: 'disconnected' | 'connecting' | 'connected' | 'error'; // Track connection status
    error: string | null; // Store any connection errors
}

const initialState: SocketState = {
    responses: {}, // Initialize responses as an empty object
    status: 'disconnected',
    error: null,
};

const socketSlice = createSlice({
    name: 'socket',
    initialState,
    reducers: {
        setSocketStatus(state, action: PayloadAction<'disconnected' | 'connecting' | 'connected' | 'error'>) {
            state.status = action.payload;
        },
        setSocketError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },
        socketEventReceived(
            state,
            action: PayloadAction<{ eventName: string; data: any }>
        ) {
            const { eventName, data } = action.payload;
            state.responses[eventName] = data; // Add event response data to the store
        },
        socketResponseReceived(
            state,
            action: PayloadAction<{ sid: string; eventName: string; taskIndex: string; data: any }>
        ) {
            const { sid, eventName, taskIndex, data } = action.payload;

            // Create a unique key for the response TODO: This doesn't make sense because we make it at the start (We should)
            const key = `${sid}_${eventName}_${taskIndex}`;
            state.responses[key] = data; // Add response data under the unique key
        },
        clearResponses(state) {
            state.responses = {}; // Clear all stored responses
        },
    },
});

export const {
    setSocketStatus,
    setSocketError,
    socketEventReceived,
    socketResponseReceived,
    clearResponses,
} = socketSlice.actions;

export default socketSlice.reducer;
