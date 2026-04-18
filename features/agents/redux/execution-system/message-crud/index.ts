/**
 * message-crud — direct DB writes that bypass the agent stream.
 *
 * These thunks let a user edit / fork / delete conversation state without
 * going through an LLM call. Each one that mutates DB rows ALSO flips the
 * conversation's cache-bypass flag so the next outbound AI request carries
 * `cache_bypass: { conversation: true }` — never forget to invalidate.
 */

export * from "./cache-bypass.slice";
export { editMessage } from "./edit-message.thunk";
export { forkConversation } from "./fork-conversation.thunk";
export { softDeleteConversation } from "./soft-delete-conversation.thunk";
export { invalidateConversationCache } from "./invalidate-conversation-cache.thunk";
