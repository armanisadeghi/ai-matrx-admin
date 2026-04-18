/**
 * Execution-system thunks — public API.
 *
 * Prefer the unified entry points for all NEW code:
 *
 *   - `launchConversation(invocation)` — every surface (Chat, Runner,
 *     Shortcut, App, Builder) hands a `ConversationInvocation` here.
 *   - `loadConversation({ conversationId, surfaceKey })` — rehydrate a
 *     past conversation; restores all six per-conversation dimensions.
 *
 * The legacy thunks below still run — `launchConversation` adapts the
 * grouped invocation shape onto `launchAgentExecution` during the
 * migration window. When Phase 4 retires the legacy flat surface,
 * `launchAgentExecution` collapses into `launchConversation`.
 */

// ── Unified (new) ───────────────────────────────────────────────────────────
export {
  launchConversation,
  type LaunchResult,
} from "./launch-conversation.thunk";
export {
  loadConversation,
  type LoadConversationArgs,
} from "./load-conversation.thunk";

// ── Legacy (still active — to be collapsed into launchConversation) ─────────
export { launchAgentExecution } from "./launch-agent-execution.thunk";
export {
  createManualInstance,
  createInstanceFromShortcut,
  createManualInstanceNoAgent,
} from "./create-instance.thunk";
export { executeInstance } from "./execute-instance.thunk";
export { executeChatInstance } from "./execute-chat-instance.thunk";
export { smartExecute } from "./smart-execute.thunk";
