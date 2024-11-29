// redux/features/aiChats/uiSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
    isNewChat: boolean | null;
    hasSubmittedMessage: boolean;
    userTextInput: string;
    focusInput: boolean;
    fetchStatus: 'idle' | 'fetching' | 'success' | 'error' | 'dbError';
    streamStatus: 'idle' | 'waiting' | 'streaming' | 'success' | 'error';
    chatTransition: 'idle' | 'new' | 'transition';
}

const initialState: UIState = {
    isNewChat: null,
    hasSubmittedMessage: false,
    userTextInput: '',
    focusInput: false,
    fetchStatus: 'idle',
    streamStatus: 'idle',
    chatTransition: 'idle',
};

export const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setIsNewChat: (state, action: PayloadAction<boolean | null>) => {
            state.isNewChat = action.payload;
        },
        setHasSubmittedMessage: (state, action: PayloadAction<boolean>) => {
            state.hasSubmittedMessage = action.payload;
        },
        setUserTextInput: (state, action: PayloadAction<string>) => {
            state.userTextInput = action.payload;
        },
        setFocusInput: (state, action: PayloadAction<boolean>) => {
            state.focusInput = action.payload;
        },
        setFetchStatus: (state, action: PayloadAction<UIState['fetchStatus']>) => {
            state.fetchStatus = action.payload;
        },
        setStreamStatus: (state, action: PayloadAction<UIState['streamStatus']>) => {
            state.streamStatus = action.payload;
        },
        setChatTransition: (state, action: PayloadAction<UIState['chatTransition']>) => {
            state.chatTransition = action.payload;
        },
    },
});

export const {
    setIsNewChat,
    setHasSubmittedMessage,
    setUserTextInput,
    setFocusInput,
    setFetchStatus,
    setStreamStatus,
    setChatTransition,
} = uiSlice.actions;
export default uiSlice.reducer;
