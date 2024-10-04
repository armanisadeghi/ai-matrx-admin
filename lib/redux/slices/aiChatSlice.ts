// File: lib/redux/slices/aiChatSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import {AIProvider, Chat, ContentPart, Message} from "@/lib/ai/aiChat.types";


interface AIChatState {
    chats: Record<string, Chat>;
    activeChatId: string | null;
}


const initialState: AIChatState = {
    chats: {},
    activeChatId: null,
};

const aiChatSlice = createSlice({
    name: 'aiChat',
    initialState,
    reducers: {
        createChat: (state, action: PayloadAction<{
            userId: string;
            provider: AIProvider;
            module: string;
            job: string;
        }>) => {
            const { userId, provider, module, job } = action.payload;
            const chatId = uuidv4();
            state.chats[chatId] = {
                id: chatId,
                userId,
                provider,
                module,
                job,
                messages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            state.activeChatId = chatId;
        },
        addMessage: (state, action: PayloadAction<{
            chatId: string;
            role: Message['role'];
            content: ContentPart[];
            isVisibleToUser: boolean;
        }>) => {
            const { chatId, role, content, isVisibleToUser } = action.payload;
            if (state.chats[chatId]) {
                const message: Message = {
                    id: uuidv4(),
                    role,
                    content,
                    isVisibleToUser,
                    createdAt: new Date().toISOString(),
                };
                state.chats[chatId].messages.push(message);
                state.chats[chatId].updatedAt = new Date().toISOString();
            }
        },
        setActiveChat: (state, action: PayloadAction<string>) => {
            state.activeChatId = action.payload;
        },
        clearChat: (state, action: PayloadAction<string>) => {
            delete state.chats[action.payload];
            if (state.activeChatId === action.payload) {
                state.activeChatId = null;
            }
        },
        completeChat: (state, action: PayloadAction<{ chatId: string, fullResponse: string }>) => {
            const { chatId, fullResponse } = action.payload;
            if (state.chats[chatId]) {
                state.chats[chatId].fullResponse = fullResponse;
            }
        },
        setError: (state, action: PayloadAction<{ chatId: string, error: string }>) => {
            const { chatId, error } = action.payload;
            if (state.chats[chatId]) {
                state.chats[chatId].error = error;
            }
        },
    },
});

export const {
    createChat,
    addMessage,
    setActiveChat,
    clearChat,
    completeChat,
    setError
} = aiChatSlice.actions;

export default aiChatSlice.reducer;

