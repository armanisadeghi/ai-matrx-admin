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
} from "../_legacy-stubs";

export * from "../_legacy-stubs";
export { sendMessage, loadConversationHistory } from "../_legacy-stubs";
