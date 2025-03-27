// chatDisplaySlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChatMessage {
    tempId?: string; // Temporary identifier before we get real ID
    id?: string; // Permanent ID from database
    role: "user" | "assistant";
    content: string;
}

interface ChatDisplayState {
    messages: ChatMessage[];
}

const initialState: ChatDisplayState = {
    messages: [],
};

export const chatDisplaySlice = createSlice({
    name: "chatDisplay",
    initialState,
    reducers: {
        // Add multiple messages at once (initial fetch)
        addInitialMessages(state, action: PayloadAction<ChatMessage[]>) {
            state.messages = action.payload;
        },

        // Add a single message
        addMessage(state, action: PayloadAction<ChatMessage>) {
            state.messages.push(action.payload);
        },

        // Update message ID when we get the permanent one
        updateMessageId(state, action: PayloadAction<{ tempId: string; newId: string }>) {
            const message = state.messages.find((msg) => msg.tempId === action.payload.tempId);
            if (message) {
                message.id = action.payload.newId;
                delete message.tempId; // Clean up temporary ID
            }
        },

        // Update message content (useful for streaming)
        updateMessageContent(state, action: PayloadAction<{ id: string; content: string }>) {
            const message = state.messages.find((msg) => msg.id === action.payload.id || msg.tempId === action.payload.id);
            if (message) {
                message.content = action.payload.content;
            }
        },

        // Clear all messages
        clearMessages(state) {
            state.messages = [];
        },
    },
});

export const { addInitialMessages, addMessage, updateMessageId, updateMessageContent, clearMessages } = chatDisplaySlice.actions;

export default chatDisplaySlice.reducer;

// Selectors
export const selectChatMessages = (state: { chatDisplay: ChatDisplayState }) => state.chatDisplay.messages;
