// redux/features/aiChats/messageSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MessageType } from '@/types';
import { fetchChatMessages, addMultipleCustomMessages, updateMessageText } from '@/utils/supabase/chatDb';

export interface MessageState {
    messagesByChatId: Record<string, MessageType[]>;
    fetchStatus: Record<string, 'idle' | 'loading' | 'succeeded' | 'failed'>;
}

const initialState: MessageState = {
    messagesByChatId: {},
    fetchStatus: {},
};

export const fetchMessagesForChat = createAsyncThunk(
    'messages/fetchMessagesForChat',
    async (chatId: string) => {
        const messages = await fetchChatMessages(chatId);
        return { chatId, messages };
    }
);

export const addMessagesToChat = createAsyncThunk(
    'messages/addMessagesToChat',
    async ({ chatId, messages }: { chatId: string; messages: MessageType[] }) => {
        await addMultipleCustomMessages(chatId, messages);
        return { chatId, messages };
    }
);

export const updateAssistantMessage = createAsyncThunk(
    'messages/updateAssistantMessage',
    async ({ messageId, text }: { messageId: string; text: string }) => {
        await updateMessageText(messageId, text);
        return { messageId, text };
    }
);

const messageSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
        .addCase(fetchMessagesForChat.pending, (state, action) => {
            state.fetchStatus[action.meta.arg] = 'loading';
        })
        .addCase(fetchMessagesForChat.fulfilled, (state, action) => {
            state.fetchStatus[action.payload.chatId] = 'succeeded';
            state.messagesByChatId[action.payload.chatId] = action.payload.messages;
        })
        .addCase(fetchMessagesForChat.rejected, (state, action) => {
            state.fetchStatus[action.meta.arg] = 'failed';
        })
        .addCase(addMessagesToChat.fulfilled, (state, action) => {
            const { chatId, messages } = action.payload;
            state.messagesByChatId[chatId] = [
                ...(state.messagesByChatId[chatId] || []),
                ...messages,
            ];
        })
        .addCase(updateAssistantMessage.fulfilled, (state, action) => {
            const { messageId, text } = action.payload;
            Object.values(state.messagesByChatId).forEach(messages => {
                const message = messages.find(m => m.id === messageId);
                if (message) {
                    message.text = text;
                }
            });
        });
    },
});

export default messageSlice.reducer;
