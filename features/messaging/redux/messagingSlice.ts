/**
 * Messaging Redux Slice
 * 
 * Manages global messaging state:
 * - Side sheet open/close state
 * - Sheet width (for resizable panel)
 * - Current conversation selection
 * - Conversations list with unread counts
 * - Total unread count (for header badge)
 * 
 * Uses auth.users.id (UUID) for user identification
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/lib/redux/store';
import type { ConversationWithDetails } from '../types';

// ============================================
// State Interface
// ============================================

interface MessagingState {
  // Sheet UI state
  isOpen: boolean;
  sheetWidth: number;
  
  // Current selection
  currentConversationId: string | null;
  
  // Conversations data (cached for quick access)
  conversations: ConversationWithDetails[];
  
  // Unread counts
  unreadCounts: Record<string, number>;
  totalUnreadCount: number;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Feature flags
  isAvailable: boolean;
}

const initialState: MessagingState = {
  isOpen: false,
  sheetWidth: 400,
  currentConversationId: null,
  conversations: [],
  unreadCounts: {},
  totalUnreadCount: 0,
  isLoading: false,
  error: null,
  isAvailable: false,
};

// ============================================
// Slice
// ============================================

export const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    // ========== Sheet UI Actions ==========
    
    /**
     * Open messaging sheet, optionally to a specific conversation
     */
    openMessaging: (state, action: PayloadAction<string | undefined>) => {
      state.isOpen = true;
      if (action.payload) {
        state.currentConversationId = action.payload;
      }
    },
    
    /**
     * Close messaging sheet
     */
    closeMessaging: (state) => {
      state.isOpen = false;
      // Keep currentConversationId for reopening
    },
    
    /**
     * Toggle messaging sheet
     */
    toggleMessaging: (state) => {
      state.isOpen = !state.isOpen;
    },
    
    /**
     * Set sheet width (for resizable panel)
     */
    setSheetWidth: (state, action: PayloadAction<number>) => {
      state.sheetWidth = action.payload;
    },
    
    // ========== Conversation Selection ==========
    
    /**
     * Set current conversation
     */
    setCurrentConversation: (state, action: PayloadAction<string | null>) => {
      state.currentConversationId = action.payload;
      
      // Clear unread count for this conversation
      if (action.payload && state.unreadCounts[action.payload]) {
        state.totalUnreadCount -= state.unreadCounts[action.payload];
        state.unreadCounts[action.payload] = 0;
        
        // Update conversation in list
        const conv = state.conversations.find(c => c.id === action.payload);
        if (conv) {
          conv.unread_count = 0;
        }
      }
    },
    
    /**
     * Clear current conversation selection
     */
    clearCurrentConversation: (state) => {
      state.currentConversationId = null;
    },
    
    // ========== Conversations Data ==========
    
    /**
     * Set conversations list
     */
    setConversations: (state, action: PayloadAction<ConversationWithDetails[]>) => {
      state.conversations = action.payload;
      
      // Recalculate unread counts
      state.unreadCounts = {};
      state.totalUnreadCount = 0;
      action.payload.forEach(conv => {
        state.unreadCounts[conv.id] = conv.unread_count || 0;
        state.totalUnreadCount += conv.unread_count || 0;
      });
    },
    
    /**
     * Update a single conversation (e.g., new message received)
     */
    updateConversation: (state, action: PayloadAction<ConversationWithDetails>) => {
      const index = state.conversations.findIndex(c => c.id === action.payload.id);
      if (index >= 0) {
        state.conversations[index] = action.payload;
      } else {
        // New conversation, add to beginning
        state.conversations.unshift(action.payload);
      }
      
      // Sort by updated_at (most recent first)
      state.conversations.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    },
    
    /**
     * Remove a conversation from the list
     */
    removeConversation: (state, action: PayloadAction<string>) => {
      const convId = action.payload;
      
      // Update total unread
      if (state.unreadCounts[convId]) {
        state.totalUnreadCount -= state.unreadCounts[convId];
        delete state.unreadCounts[convId];
      }
      
      // Remove from list
      state.conversations = state.conversations.filter(c => c.id !== convId);
      
      // Clear selection if this was the current conversation
      if (state.currentConversationId === convId) {
        state.currentConversationId = null;
      }
    },
    
    // ========== Unread Counts ==========
    
    /**
     * Update unread count for a conversation
     */
    updateUnreadCount: (state, action: PayloadAction<{ conversationId: string; count: number }>) => {
      const { conversationId, count } = action.payload;
      const oldCount = state.unreadCounts[conversationId] || 0;
      
      state.unreadCounts[conversationId] = count;
      state.totalUnreadCount += count - oldCount;
      
      // Update conversation in list
      const conv = state.conversations.find(c => c.id === conversationId);
      if (conv) {
        conv.unread_count = count;
      }
    },
    
    /**
     * Increment unread count for a conversation (when receiving new message)
     */
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      
      // Don't increment if this is the current conversation and sheet is open
      if (state.isOpen && state.currentConversationId === conversationId) {
        return;
      }
      
      state.unreadCounts[conversationId] = (state.unreadCounts[conversationId] || 0) + 1;
      state.totalUnreadCount += 1;
      
      // Update conversation in list
      const conv = state.conversations.find(c => c.id === conversationId);
      if (conv) {
        conv.unread_count = (conv.unread_count || 0) + 1;
      }
    },
    
    /**
     * Mark conversation as read (clear unread count)
     */
    markConversationAsRead: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      const count = state.unreadCounts[conversationId] || 0;
      
      state.unreadCounts[conversationId] = 0;
      state.totalUnreadCount -= count;
      
      // Update conversation in list
      const conv = state.conversations.find(c => c.id === conversationId);
      if (conv) {
        conv.unread_count = 0;
      }
    },
    
    /**
     * Reset all unread counts
     */
    resetUnreadCounts: (state) => {
      state.unreadCounts = {};
      state.totalUnreadCount = 0;
      state.conversations.forEach(conv => {
        conv.unread_count = 0;
      });
    },
    
    /**
     * Set total unread count directly (for global badge)
     */
    setTotalUnreadCount: (state, action: PayloadAction<number>) => {
      state.totalUnreadCount = action.payload;
    },
    
    // ========== Loading States ==========
    
    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // ========== Feature Flags ==========
    
    /**
     * Set messaging availability (called by layouts)
     */
    setMessagingAvailable: (state, action: PayloadAction<boolean>) => {
      state.isAvailable = action.payload;
    },
    
    // ========== Reset ==========
    
    /**
     * Reset messaging state (call on logout)
     */
    resetMessaging: () => initialState,
  },
});

// ============================================
// Actions
// ============================================

export const {
  openMessaging,
  closeMessaging,
  toggleMessaging,
  setSheetWidth,
  setCurrentConversation,
  clearCurrentConversation,
  setConversations,
  updateConversation,
  removeConversation,
  updateUnreadCount,
  incrementUnreadCount,
  markConversationAsRead,
  resetUnreadCounts,
  setTotalUnreadCount,
  setLoading,
  setError,
  setMessagingAvailable,
  resetMessaging,
} = messagingSlice.actions;

// ============================================
// Selectors
// ============================================

export const selectMessagingIsOpen = (state: RootState) => state.messaging.isOpen;
export const selectMessagingSheetWidth = (state: RootState) => state.messaging.sheetWidth;
export const selectCurrentConversationId = (state: RootState) => state.messaging.currentConversationId;
export const selectConversations = (state: RootState) => state.messaging.conversations;
export const selectUnreadCounts = (state: RootState) => state.messaging.unreadCounts;
export const selectTotalUnreadCount = (state: RootState) => state.messaging.totalUnreadCount;
export const selectMessagingIsLoading = (state: RootState) => state.messaging.isLoading;
export const selectMessagingError = (state: RootState) => state.messaging.error;
export const selectMessagingIsAvailable = (state: RootState) => state.messaging.isAvailable;

/**
 * Get the current conversation with details
 */
export const selectCurrentConversation = (state: RootState): ConversationWithDetails | null => {
  const { conversations, currentConversationId } = state.messaging;
  if (!currentConversationId) return null;
  return conversations.find(c => c.id === currentConversationId) || null;
};

/**
 * Get unread count for a specific conversation
 */
export const selectConversationUnreadCount = (conversationId: string) => (state: RootState): number => {
  return state.messaging.unreadCounts[conversationId] || 0;
};

// ============================================
// Export Reducer
// ============================================

export default messagingSlice.reducer;
