/**
 * features/conversation/state — Re-export of Redux chatConversations module.
 *
 * The slice lives at lib/redux/chatConversations/ (where Redux slices belong).
 * This barrel lets feature-internal code import from a consistent path:
 *
 *   import { chatConversationsActions, sendMessage } from '@/features/conversation/state';
 */

export {
    chatConversationsReducer,
    chatConversationsActions,
} from '@/lib/redux/chatConversations/slice';

export * from '@/lib/redux/chatConversations/types';
export * from '@/lib/redux/chatConversations/selectors';
export { sendMessage } from '@/lib/redux/chatConversations/thunks/sendMessage';
export { loadConversationHistory } from '@/lib/redux/chatConversations/thunks/loadConversationHistory';
