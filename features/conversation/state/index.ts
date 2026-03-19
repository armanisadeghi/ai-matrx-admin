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
} from '@/features/cx-conversation/redux/slice';

export * from '@/features/cx-conversation/redux/types';
export * from '@/features/cx-conversation/redux/selectors';
export { sendMessage } from '@/features/cx-conversation/redux/thunks/sendMessage';
export { loadConversationHistory } from '@/features/cx-conversation/redux/thunks/loadConversationHistory';
