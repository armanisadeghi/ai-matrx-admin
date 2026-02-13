'use client';

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/lib/redux/store';
import type {
  SmsState,
  SmsConversation,
  SmsMessage,
  SmsNotificationPreferences,
  SmsPhoneNumber,
} from '../types';

const initialState: SmsState = {
  conversations: [],
  currentConversationId: null,
  messages: {},
  preferences: null,
  phoneNumbers: [],
  isLoading: false,
  isSending: false,
  error: null,
  totalConversations: 0,
  unreadTotal: 0,
};

const smsSlice = createSlice({
  name: 'sms',
  initialState,
  reducers: {
    // ---- Loading ----
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setSending(state, action: PayloadAction<boolean>) {
      state.isSending = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    // ---- Conversations ----
    setConversations(state, action: PayloadAction<{ data: SmsConversation[]; total: number }>) {
      state.conversations = action.payload.data;
      state.totalConversations = action.payload.total;
      state.unreadTotal = action.payload.data.reduce((sum, c) => sum + c.unread_count, 0);
    },
    updateConversation(state, action: PayloadAction<SmsConversation>) {
      const index = state.conversations.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
      state.unreadTotal = state.conversations.reduce((sum, c) => sum + c.unread_count, 0);
    },
    setCurrentConversation(state, action: PayloadAction<string | null>) {
      state.currentConversationId = action.payload;
    },
    markConversationRead(state, action: PayloadAction<string>) {
      const conv = state.conversations.find(c => c.id === action.payload);
      if (conv) {
        state.unreadTotal -= conv.unread_count;
        conv.unread_count = 0;
      }
    },

    // ---- Messages ----
    setMessages(state, action: PayloadAction<{ conversationId: string; messages: SmsMessage[] }>) {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    appendMessage(state, action: PayloadAction<{ conversationId: string; message: SmsMessage }>) {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      // Insert at beginning (messages are newest-first from API)
      state.messages[conversationId].unshift(message);
    },
    updateMessageStatus(state, action: PayloadAction<{ messageId: string; conversationId: string; status: string }>) {
      const msgs = state.messages[action.payload.conversationId];
      if (msgs) {
        const msg = msgs.find(m => m.id === action.payload.messageId);
        if (msg) {
          msg.status = action.payload.status as SmsMessage['status'];
        }
      }
    },

    // ---- Preferences ----
    setPreferences(state, action: PayloadAction<SmsNotificationPreferences | null>) {
      state.preferences = action.payload;
    },

    // ---- Phone Numbers ----
    setPhoneNumbers(state, action: PayloadAction<SmsPhoneNumber[]>) {
      state.phoneNumbers = action.payload;
    },

    // ---- Reset ----
    resetSms() {
      return initialState;
    },
  },
});

export const {
  setLoading,
  setSending,
  setError,
  setConversations,
  updateConversation,
  setCurrentConversation,
  markConversationRead,
  setMessages,
  appendMessage,
  updateMessageStatus,
  setPreferences,
  setPhoneNumbers,
  resetSms,
} = smsSlice.actions;

// ---- Selectors ----
export const selectSmsConversations = (state: RootState) => state.sms.conversations;
export const selectSmsCurrentConversationId = (state: RootState) => state.sms.currentConversationId;
export const selectSmsMessages = (state: RootState, conversationId: string) =>
  state.sms.messages[conversationId] || [];
export const selectSmsPreferences = (state: RootState) => state.sms.preferences;
export const selectSmsPhoneNumbers = (state: RootState) => state.sms.phoneNumbers;
export const selectSmsIsLoading = (state: RootState) => state.sms.isLoading;
export const selectSmsIsSending = (state: RootState) => state.sms.isSending;
export const selectSmsError = (state: RootState) => state.sms.error;
export const selectSmsTotalConversations = (state: RootState) => state.sms.totalConversations;
export const selectSmsUnreadTotal = (state: RootState) => state.sms.unreadTotal;
export const selectSmsCurrentConversation = (state: RootState) =>
  state.sms.conversations.find(c => c.id === state.sms.currentConversationId) || null;

export default smsSlice.reducer;
