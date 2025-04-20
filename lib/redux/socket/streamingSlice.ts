// lib/redux/socket/streamingSlice.ts
import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";

// Define the state structure
interface StreamData {
    text: string;
    data: any[];
    message: string;
    info: string;
    error: string;
    end: boolean;
    isStreaming: boolean;
    firstChunkReceived: boolean;
}

interface StreamingState {
    [eventId: string]: StreamData;
}

const initialStreamData: StreamData = {
    text: "",
    data: [],
    message: "",
    info: "",
    error: "",
    end: false,
    isStreaming: false,
    firstChunkReceived: false
};

const initialState: StreamingState = {};

// Create the slice
const streamingSlice = createSlice({
    name: "streaming",
    initialState,
    reducers: {
        // Initialize stream
        initStream: (state, action: PayloadAction<{ eventId: string }>) => {
            const { eventId } = action.payload;
            if (!state[eventId]) {
                state[eventId] = { ...initialStreamData, isStreaming: true };
            }
        },
        
        // Add new text content
        addStreamText: (state, action: PayloadAction<{ eventId: string; text: string }>) => {
            const { eventId, text } = action.payload;
            if (!state[eventId]) {
                state[eventId] = { ...initialStreamData, isStreaming: true };
            }
            if (text.length > 0) {
                state[eventId].firstChunkReceived = true;
            }
            state[eventId].text += text;
        },
        
        // Add new data content
        addStreamData: (state, action: PayloadAction<{ eventId: string; data: any }>) => {
            const { eventId, data } = action.payload;
            if (!state[eventId]) {
                state[eventId] = { ...initialStreamData, isStreaming: true };
            }
            state[eventId].data.push(data);
        },
        
        // Set message
        setStreamMessage: (state, action: PayloadAction<{ eventId: string; message: string }>) => {
            const { eventId, message } = action.payload;
            if (!state[eventId]) {
                state[eventId] = { ...initialStreamData, isStreaming: true };
            }
            state[eventId].message = message;
        },
        
        // Set info
        setStreamInfo: (state, action: PayloadAction<{ eventId: string; info: string }>) => {
            const { eventId, info } = action.payload;
            if (!state[eventId]) {
                state[eventId] = { ...initialStreamData, isStreaming: true };
            }
            state[eventId].info = info;
        },
        
        // Set error
        setStreamError: (state, action: PayloadAction<{ eventId: string; error: string }>) => {
            const { eventId, error } = action.payload;
            if (!state[eventId]) {
                state[eventId] = { ...initialStreamData, isStreaming: true };
            }
            state[eventId].error = error;
        },
        
        // Set end flag
        setStreamEnd: (state, action: PayloadAction<{ eventId: string; end: boolean }>) => {
            const { eventId, end } = action.payload;
            if (!state[eventId]) {
                state[eventId] = { ...initialStreamData, isStreaming: true };
            }
            state[eventId].end = end;
        },
        
        // Mark stream as complete
        endStream: (state, action: PayloadAction<{ eventId: string }>) => {
            const { eventId } = action.payload;
            if (state[eventId]) {
                state[eventId].isStreaming = false;
                state[eventId].end = true;
            }
        },
        
        // Clear stream data (optional, for cleanup)
        clearStream: (state, action: PayloadAction<{ eventId: string }>) => {
            const { eventId } = action.payload;
            delete state[eventId];
        },
    },
});

// Export actions and reducer
export const { 
    initStream,
    addStreamText, 
    addStreamData, 
    setStreamMessage,
    setStreamInfo,
    setStreamError,
    setStreamEnd,
    endStream, 
    clearStream 
} = streamingSlice.actions;

export default streamingSlice.reducer;

// Memoized Selectors
// First create a base selector that gets the streaming state for a specific event ID
const selectStreamingForEvent = (state: RootState, eventId: string) => 
    state.streaming[eventId] || initialStreamData;

// Then create memoized selectors based on that
export const selectStreamText = createSelector(
    [selectStreamingForEvent],
    (streamData) => streamData.text
);

export const selectStreamData = createSelector(
    [selectStreamingForEvent],
    (streamData) => streamData.data
);

export const selectStreamMessage = createSelector(
    [selectStreamingForEvent],
    (streamData) => streamData.message
);

export const selectStreamInfo = createSelector(
    [selectStreamingForEvent],
    (streamData) => streamData.info
);

export const selectStreamError = createSelector(
    [selectStreamingForEvent],
    (streamData) => streamData.error
);

export const selectStreamEnd = createSelector(
    [selectStreamingForEvent],
    (streamData) => streamData.end
);

export const selectIsStreaming = createSelector(
    [selectStreamingForEvent],
    (streamData) => streamData.isStreaming
);

export const selectFirstChunkReceived = createSelector(
    [selectStreamingForEvent],
    (streamData) => streamData.firstChunkReceived
);

// Create a combined selector for all stream info
export const selectAllStreamInfo = createSelector(
    [selectStreamingForEvent],
    (streamData) => ({
        text: streamData.text,
        data: streamData.data,
        message: streamData.message,
        info: streamData.info,
        error: streamData.error,
        end: streamData.end,
        isStreaming: streamData.isStreaming,
        firstChunkReceived: streamData.firstChunkReceived
    })
);

// Create a combined selector for text-based content
export const selectStreamTextContent = createSelector(
    [selectStreamingForEvent],
    (streamData) => ({
        text: streamData.text,
        message: streamData.message,
        info: streamData.info,
        error: streamData.error,
        isStreaming: streamData.isStreaming,
        firstChunkReceived: streamData.firstChunkReceived
    })
);