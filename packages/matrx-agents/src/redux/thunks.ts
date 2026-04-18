/**
 * Thunks barrel — the async action creators consumers dispatch to drive
 * the agent lifecycle. All thunks read their dependencies from the config
 * registry (see `../config/registry.ts`).
 */

// ── Unified entry points (prefer these for NEW code) ───────────────────────
export { launchConversation } from "@/features/agents/redux/execution-system/thunks/launch-conversation.thunk";
export {
  loadConversation,
  type LoadConversationArgs,
} from "@/features/agents/redux/execution-system/thunks/load-conversation.thunk";

// ── Execution thunks ───────────────────────────────────────────────────────
export { executeInstance } from "@/features/agents/redux/execution-system/thunks/execute-instance.thunk";
export { executeChatInstance } from "@/features/agents/redux/execution-system/thunks/execute-chat-instance.thunk";
export { launchAgentExecution } from "@/features/agents/redux/execution-system/thunks/launch-agent-execution.thunk";
export type { LaunchResult } from "@/features/agents/redux/execution-system/thunks/launch-agent-execution.thunk";

// ── Instance creation ──────────────────────────────────────────────────────
export {
  createManualInstance,
  createInstanceFromShortcut,
  createManualInstanceNoAgent,
} from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";

export { smartExecute } from "@/features/agents/redux/execution-system/thunks/smart-execute.thunk";

// ── Message CRUD (direct DB writes outside the agent pipeline) ─────────────
export {
  editMessage,
  forkConversation,
  softDeleteConversation,
  invalidateConversationCache,
} from "@/features/agents/redux/execution-system/message-crud";

// ── Conversation-list RPC thunks ───────────────────────────────────────────
export {
  fetchAgentConversations,
  fetchAgentConversationsNormalized,
} from "@/features/agents/redux/conversation-list";

// ── Conversation-list stream-commit helper (legacy parity) ────────────────
export { upsertConversationFromExecutionAction } from "@/features/agents/redux/conversation-list/record-conversation-from-execution";
