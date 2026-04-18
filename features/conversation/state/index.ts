/**
 * features/conversation/redux — Re-export of Redux chatConversations module.
 *
 * The slice lives at @/features/cx-conversation/redux/ (where Redux slices belong).
 * This barrel lets feature-internal code import from a consistent path:
 *
 *   import { chatConversationsActions, sendMessage } from '@/features/conversation/redux';
 */

export {
  chatConversationsReducer,
  chatConversationsActions,
} from "@/features/agents/redux/old/OLD-cx-message-actions/slice";

export * from "@/features/agents/redux/old/OLD-cx-message-actions/types";
export * from "@/features/agents/redux/old/OLD-cx-message-actions/selectors";
export { sendMessage } from "@/features/agents/redux/old/OLD-cx-message-actions/thunks/sendMessage";
export { loadConversationHistory } from "@/features/agents/redux/old/OLD-cx-message-actions/thunks/loadConversationHistory";
