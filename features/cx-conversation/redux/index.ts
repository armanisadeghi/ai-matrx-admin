/**
 * chatConversations Redux module
 *
 * Unified conversation state for all chat/conversation UI routes.
 * Scoped by sessionId (client-generated UUID).
 * Replaces ChatContext + prompt-execution for conversation display purposes.
 */

export { chatConversationsReducer, chatConversationsActions, default as chatConversationsSliceReducer } from './slice';
export * from './types';
export * from './selectors';
export { sendMessage } from './thunks/sendMessage';
export { loadConversationHistory } from './thunks/loadConversationHistory';

export {
  messageActionsReducer,
  messageActionsActions,
  selectMessageActionInstance,
  selectOpenOverlays,
  selectOverlaysForInstance,
  selectIsMessageActionOverlayOpen,
  selectMessageActionOverlayData,
} from './messageActionsSlice';
export type {
  MessageActionOverlayType,
  MessageActionInstance,
  MessageActionOverlay,
  MessageActionsState,
} from './messageActionsSlice';
