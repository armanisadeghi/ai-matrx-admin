// lib/redux/slices/flashcardChatSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface FlashcardChatState {
    [flashcardId: string]: ChatMessage[];
}

const initialState: FlashcardChatState = {};

const flashcardChatSlice = createSlice({
    name: 'flashcardChat',
    initialState,
    reducers: {
        addMessage: (
            state,
            action: PayloadAction<{ flashcardId: string; message: ChatMessage }>
        ) => {
            const { flashcardId, message } = action.payload;
            if (!state[flashcardId]) {
                state[flashcardId] = [];
            }
            state[flashcardId].push(message);
        },
        clearChat: (state, action: PayloadAction<string>) => {
            const flashcardId = action.payload;
            state[flashcardId] = [];
        },
        resetAllChats: () => initialState,
    },
});

export const { addMessage, clearChat, resetAllChats } = flashcardChatSlice.actions;
export default flashcardChatSlice.reducer;
