import { MessageRecordWithKey } from "@/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "reselect";


interface MessagesState {
    byId: Record<string, MessageRecordWithKey>;
    allIds: string[];
}

const initialState: MessagesState = {
    byId: {},
    allIds: [],
};

const messagesSlice = createSlice({
    name: "messages",
    initialState,
    reducers: {
        addMessage(state, action: PayloadAction<MessageRecordWithKey>) {
            const message = action.payload;
            state.byId[message.id] = message;
            if (!state.allIds.includes(message.id)) {
                state.allIds.push(message.id);
            }
        },
        updateMessage(state, action: PayloadAction<{ id: string; updates: Partial<MessageRecordWithKey> }>) {
            const { id, updates } = action.payload;
            if (state.byId[id]) {
                state.byId[id] = { ...state.byId[id], ...updates };
            }
        },
        updateMessageField<K extends keyof MessageRecordWithKey>(
            state: MessagesState,
            action: PayloadAction<{ id: string; field: K; value: MessageRecordWithKey[K] }>
        ) {
            const { id, field, value } = action.payload;
            if (state.byId[id]) {
                state.byId[id][field] = value;
            }
        },
        clearMessagesForConversation(state, action: PayloadAction<string>) {
            const conversationId = action.payload;
            state.allIds = state.allIds.filter((id) => state.byId[id].conversationId !== conversationId);
            for (const id in state.byId) {
                if (state.byId[id].conversationId === conversationId) {
                    delete state.byId[id];
                }
            }
        },
        clearAllMessages(state) {
            state.byId = {};
            state.allIds = [];
        },

        addMessages: {
            reducer(state, action: PayloadAction<MessageRecordWithKey[]>) {
                const messages = action.payload;
                messages.forEach((message) => {
                    if (!state.byId[message.id]) {
                        state.byId[message.id] = message;
                        state.allIds.push(message.id);
                    }
                });
            },
            prepare(messages: MessageRecordWithKey[]) {
                return { payload: messages };
            },
        },
    },
});

export const { 
  addMessage, 
  updateMessage, 
  updateMessageField, 
  clearMessagesForConversation, 
  clearAllMessages,
  addMessages
} = messagesSlice.actions;


export const messagesReducer = messagesSlice.reducer;

// Basic Selectors
export const selectMessagesState = (state: { messages: MessagesState }) => state.messages;
export const selectMessagesById = (state: { messages: MessagesState }) => state.messages.byId;
export const selectMessageIds = (state: { messages: MessagesState }) => state.messages.allIds;

// Memoized Selectors
export const selectMessagesForConversation = createSelector(
    [selectMessagesById, selectMessageIds, (_: any, conversationId: string) => conversationId],
    (byId, allIds, conversationId) => {
        return allIds
            .filter((id) => byId[id].conversationId === conversationId)
            .map((id) => byId[id])
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
);

export const selectMinimalMessagesForConversation = createSelector(
    [selectMessagesById, selectMessageIds, (_: any, conversationId: string) => conversationId],
    (byId, allIds, conversationId) => {
        return allIds
            .filter((id) => byId[id].conversationId === conversationId)
            .map((id) => ({
                role: byId[id].role,
                content: byId[id].content,
                displayOrder: byId[id].displayOrder,
            }))
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
);

export const selectLastMessage = createSelector([selectMessagesForConversation], (messages) => {
    return messages.length > 0 ? messages[messages.length - 1] : null;
});

export const selectLastMessageRole = createSelector([selectLastMessage], (lastMessage) => lastMessage?.role || "");

export const selectLastDisplayOrder = createSelector([selectLastMessage], (lastMessage) => lastMessage?.displayOrder || 0);

export const selectLastSystemOrder = createSelector([selectLastMessage], (lastMessage) => lastMessage?.systemOrder || 0);

export const selectMessageCount = createSelector([selectMessagesForConversation], (messages) => messages.length);
