/**
 * Messaging Feature - Barrel Exports
 * 
 * Real-time user-to-user messaging system.
 */

// Types
export * from './types';

// Redux
export {
  // Actions
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
  setLoading,
  setError,
  setMessagingAvailable,
  resetMessaging,
  // Selectors
  selectMessagingIsOpen,
  selectMessagingSheetWidth,
  selectCurrentConversationId,
  selectConversations,
  selectUnreadCounts,
  selectTotalUnreadCount,
  selectMessagingIsLoading,
  selectMessagingError,
  selectMessagingIsAvailable,
  selectCurrentConversation,
  selectConversationUnreadCount,
} from './redux/messagingSlice';

// Components
export { MessagingSideSheet } from './components/MessagingSideSheet';
export { ConversationList } from './components/ConversationList';
export { ChatThread } from './components/ChatThread';
export { MessageBubble } from './components/MessageBubble';
export { MessageInput } from './components/MessageInput';
export { TypingIndicator } from './components/TypingIndicator';
export { OnlineIndicator } from './components/OnlineIndicator';
export { MessageIcon } from './components/MessageIcon';
export { NewConversationDialog } from './components/NewConversationDialog';
export { MessagingInitializer } from './components/MessagingInitializer';
