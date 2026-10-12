/**
 * lib/api/run-helpers.ts
 *
 * Named, typed wrappers over `callApi` for the agent / conversation endpoint
 * families (start, continue, fork, warm, compaction, assignments). `callApi`
 * (./call-api.ts) is the injector; these only fix a path + method + body type.
 */

import type { Action } from "redux";
import type { ThunkAction } from "redux-thunk";
import type { RootState } from "@/lib/redux/store";
import type { components } from "@ai-matrx/api/types";
import type { TypedStreamEvent } from "@ai-matrx/agents/generated/stream-events";
import {
  callApi,
  type ApiCallError,
  type ApiCallResult,
  type CallScope,
  type TestOverrides,
} from "@/lib/api/call-api";

// ============================================================================
// SECTION 16 — TYPED CONVENIENCE WRAPPERS
// ============================================================================
//
// These wrappers narrow the generic callApi() to a specific endpoint,
// providing ergonomic call sites without needing to type the path every time.
//
// Pattern: one named export per important endpoint family.
// Add new ones here as we migrate callers from the old system.
//
// These are typed aliases — they carry the full body type inferrence.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The scope fields THIS transport injects (`buildRequestBody` above), so a
 * caller never supplies them by hand. aidream marks them required on the
 * request schema — correct for an external client, wrong for a caller here,
 * which would otherwise have to reach into Redux for an org id the transport is
 * about to inject. Callers may still pass one explicitly, but it must agree;
 * `scopeOverrides` is the deliberate way to redirect the entire request context.
 */
type TransportInjectedScope = "organization_id" | "project_id" | "task_id";

type WithInjectedScope<T> = Omit<T, TransportInjectedScope> &
  Partial<Pick<T, Extract<keyof T, TransportInjectedScope>>>;

/** Body type for POST /ai/agents/{agent_id} */
export type AgentStartBody = WithInjectedScope<
  components["schemas"]["AgentStartRequest"]
>;

/** Body type for POST /ai/prompts/{prompt_id} */
export type PromptStartBody = WithInjectedScope<
  components["schemas"]["PromptStartRequest"]
>;

/** Body type for POST /ai/agents-blocks/{agent_id} */
export type AgentBlocksStartBody =
  components["schemas"]["AgentBlocksStartRequest"];

/** Body type for POST /ai/conversations/{conversation_id} */
export type ConversationContinueBody =
  components["schemas"]["ConversationContinueRequest"];

/** Body type for POST /ai/chat */
export type ChatBody = components["schemas"]["ChatRequest"];

/** LLM parameter overrides */
export type LLMParamsBody = components["schemas"]["LLMParams"];

// ─── Agent: Start new conversation ───────────────────────────────────────────

export interface CallAgentStartOptions {
  agentId: string;
  body: AgentStartBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  onStreamEvent?: (event: TypedStreamEvent) => void;
  onStreamComplete?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;
  onStreamError?: (error: ApiCallError) => void;
  _testOverrides?: TestOverrides;
}

export function callAgentStart(options: CallAgentStartOptions) {
  return callApi({
    path: "/ai/agents/{agent_id}",
    method: "POST",
    pathParams: { agent_id: options.agentId },
    body: options.body,
    stream: true,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    onStreamEvent: options.onStreamEvent,
    onStreamComplete: options.onStreamComplete,
    onStreamError: options.onStreamError,
    _testOverrides: options._testOverrides,
  });
}

// ─── Agent assignments: durable coordinated execution ──────────────────────

export type AgentAssignmentRunBody =
  components["schemas"]["AgentAssignmentRunRequest"];
export type AgentAssignmentBatchResult =
  components["schemas"]["AssignmentBatchResult"];

export interface CallAgentAssignmentsOptions {
  body: AgentAssignmentRunBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  onStreamEvent?: (event: TypedStreamEvent) => void;
  onStreamComplete?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;
  onStreamError?: (error: ApiCallError) => void;
  _testOverrides?: TestOverrides;
}

export function callAgentAssignments(options: CallAgentAssignmentsOptions) {
  return callApi({
    path: "/ai/agent-assignments",
    method: "POST",
    body: options.body,
    stream: true,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    onStreamEvent: options.onStreamEvent,
    onStreamComplete: options.onStreamComplete,
    onStreamError: options.onStreamError,
    _testOverrides: options._testOverrides,
  });
}

export function callAgentAssignmentSession(
  sessionId: string,
): ThunkAction<
  Promise<ApiCallResult<AgentAssignmentBatchResult>>,
  RootState,
  unknown,
  Action
> {
  return callApi({
    path: "/ai/agent-assignments/sessions/{session_id}",
    method: "GET",
    pathParams: { session_id: sessionId },
    stream: false,
  }) as ThunkAction<
    Promise<ApiCallResult<AgentAssignmentBatchResult>>,
    RootState,
    unknown,
    Action
  >;
}

export function callCancelAgentAssignmentSession(
  sessionId: string,
): ThunkAction<
  Promise<ApiCallResult<AgentAssignmentBatchResult>>,
  RootState,
  unknown,
  Action
> {
  return callApi({
    path: "/ai/agent-assignments/sessions/{session_id}/cancel",
    method: "POST",
    pathParams: { session_id: sessionId },
    stream: false,
  }) as ThunkAction<
    Promise<ApiCallResult<AgentAssignmentBatchResult>>,
    RootState,
    unknown,
    Action
  >;
}

// ─── Agent Blocks: Start new block-streaming conversation ────────────────────

export interface CallAgentBlocksStartOptions {
  agentId: string;
  body: AgentBlocksStartBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  onStreamEvent?: (event: TypedStreamEvent) => void;
  onStreamComplete?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;
  onStreamError?: (error: ApiCallError) => void;
  _testOverrides?: TestOverrides;
}

export function callAgentBlocksStart(options: CallAgentBlocksStartOptions) {
  return callApi({
    path: "/ai/agents-blocks/{agent_id}",
    method: "POST",
    pathParams: { agent_id: options.agentId },
    body: options.body,
    stream: true,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    onStreamEvent: options.onStreamEvent,
    onStreamComplete: options.onStreamComplete,
    onStreamError: options.onStreamError,
    _testOverrides: options._testOverrides,
  });
}

// ─── Conversation: Continue existing conversation ─────────────────────────────

export interface CallConversationContinueOptions {
  conversationId: string;
  body: ConversationContinueBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  onStreamEvent?: (event: TypedStreamEvent) => void;
  onStreamComplete?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;
  onStreamError?: (error: ApiCallError) => void;
  _testOverrides?: TestOverrides;
}

export function callConversationContinue(
  options: CallConversationContinueOptions,
) {
  return callApi({
    path: "/ai/conversations/{conversation_id}",
    method: "POST",
    pathParams: { conversation_id: options.conversationId },
    body: options.body,
    stream: true,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    onStreamEvent: options.onStreamEvent,
    onStreamComplete: options.onStreamComplete,
    onStreamError: options.onStreamError,
    _testOverrides: options._testOverrides,
  });
}

// ─── Cancel: Abort a running request ─────────────────────────────────────────
//
// MOVED (2026-08-29, agents-package production adoption): the cancel flow now
// rides `@ai-matrx/api`'s `cancelAgentRun` over the host transport —
// see `cancelAgentRunRequest` in `lib/api/matrx-transport.ts`. Same URL, same
// auth/org headers, same `ApiCallResult` envelope for callers.

// ─── Warm-up: Pre-load agent into server cache ────────────────────────────────

/**
 * Valid `source` values for warm endpoints.
 * Tells the backend exactly which table to query:
 * - `"prompt"` → `prompts` table
 * - `"builtin"` → `agent.definition` table (migrated from `prompt_builtins`; same UUIDs)
 * - `"prompt_version"` → `prompt_versions` table
 * - `"builtin_version"` → `prompt_builtin_versions` table
 * - `undefined` → fallback chain (prompts → builtins)
 */
export type WarmSource =
  "prompt" | "builtin" | "prompt_version" | "builtin_version";

export function callWarmAgent(agentId: string, source?: WarmSource) {
  return callApi({
    path: "/ai/agents/{agent_id}/warm",
    // Background (rejoin / warm-up): never opens the workspace picker.
    method: "POST",
    pathParams: { agent_id: agentId },
    body: (source ? { source } : undefined) as any,
    stream: false,
  });
}

export function callWarmConversation(conversationId: string) {
  return callApi({
    path: "/ai/conversations/{conversation_id}/warm",
    // Background (rejoin / warm-up): never opens the workspace picker.
    method: "POST",
    pathParams: { conversation_id: conversationId },
    stream: false,
  });
}

// ─── Prompt: Start new conversation ──────────────────────────────────────────

export interface CallPromptStartOptions {
  promptId: string;
  body: PromptStartBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  onStreamStart?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;
  onStreamEvent?: (event: TypedStreamEvent) => void;
  onStreamComplete?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;
  onStreamError?: (error: ApiCallError) => void;
  _testOverrides?: TestOverrides;
}

export function callPromptStart(options: CallPromptStartOptions) {
  return callApi({
    path: "/ai/prompts/{prompt_id}",
    method: "POST",
    pathParams: { prompt_id: options.promptId },
    body: options.body,
    stream: true,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    onStreamStart: options.onStreamStart,
    onStreamEvent: options.onStreamEvent,
    onStreamComplete: options.onStreamComplete,
    onStreamError: options.onStreamError,
    _testOverrides: options._testOverrides,
  });
}

export function callWarmPrompt(promptId: string) {
  return callApi({
    path: "/ai/prompts/{prompt_id}/warm",
    // Background (rejoin / warm-up): never opens the workspace picker.
    method: "POST",
    pathParams: { prompt_id: promptId },
    stream: false,
  });
}

// ─── Conversation: Observational Memory cost summary ─────────────────────────
//
// Admin-only. Aggregates every `cx_observational_memory_event` row for the
// conversation and returns the authoritative totals + per-event-type
// breakdown. Non-admin callers receive 403 Forbidden from the backend;
// this helper exposes that as a typed ApiCallError, never throws.

export type MemoryCostSummary = components["schemas"]["MemoryCostSummary"];

export function callConversationMemoryCost(
  conversationId: string,
  options?: {
    signal?: AbortSignal;
    scopeOverrides?: Partial<CallScope>;
    _testOverrides?: TestOverrides;
  },
): ThunkAction<
  Promise<ApiCallResult<MemoryCostSummary>>,
  RootState,
  unknown,
  Action
> {
  return callApi({
    path: "/ai/conversations/{conversation_id}/memory_cost",
    method: "GET",
    pathParams: { conversation_id: conversationId },
    stream: false,
    signal: options?.signal,
    scopeOverrides: options?.scopeOverrides,
    _testOverrides: options?._testOverrides,
  }) as ThunkAction<
    Promise<ApiCallResult<MemoryCostSummary>>,
    RootState,
    unknown,
    Action
  >;
}

// ============================================================================
// SECTION 17 — CONVERSATION API (BATCH / FORK / COMPACTION)
// ============================================================================
//
// Wrappers for the new server-side conversation operations documented in
// docs/FE_CONVERSATION_API_CHANGES.md. These are ADDITIVE: they live alongside
// the existing direct-Supabase RPC thunks (forkConversation, deleteMessage,
// editMessage, etc.) so callers can opt in per surface without losing the
// existing implementation. Final consolidation can happen once the new
// endpoints are validated end-to-end in this codebase.

// ─── Conversation: Fork (extended) ───────────────────────────────────────────
//
// POST /cx/conversations/{id}/fork — copy a conversation up to a chosen point.
// Backwards-compatible extension of the legacy fork: now accepts
// `from_message_id` + `exclusive` in addition to `up_to_position`.

export type ConversationForkBody = components["schemas"]["ForkRequest"];
export type ConversationForkResponse =
  components["schemas"]["ForkConversationResponse"];

export interface CallConversationForkOptions {
  conversationId: string;
  body: ConversationForkBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  _testOverrides?: TestOverrides;
}

export function callConversationFork(
  options: CallConversationForkOptions,
): ThunkAction<
  Promise<ApiCallResult<ConversationForkResponse>>,
  RootState,
  unknown,
  Action
> {
  return callApi({
    path: "/cx/conversations/{conversation_id}/fork",
    method: "POST",
    pathParams: { conversation_id: options.conversationId },
    body: options.body,
    stream: false,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    _testOverrides: options._testOverrides,
  }) as ThunkAction<
    Promise<ApiCallResult<ConversationForkResponse>>,
    RootState,
    unknown,
    Action
  >;
}

// ─── Conversation: Fork-and-Run (streaming) ──────────────────────────────────
//
// POST /ai/conversations/{id}/fork-and-run — one-shot fork + new turn. The
// first NDJSON event is `kind: "conversation.forked"` (see
// `features/agents/types/conversation-stream-events.ts`), then standard agent
// stream output. This collapses the "edit a message → fork → continue" flow
// into a single atomic round trip.

export type ConversationForkAndRunBody =
  components["schemas"]["ForkAndRunRequest"];

export interface CallConversationForkAndRunOptions {
  conversationId: string;
  body: ConversationForkAndRunBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  onStreamStart?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;
  onStreamEvent?: (event: TypedStreamEvent) => void;
  onStreamComplete?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;
  onStreamError?: (error: ApiCallError) => void;
  _testOverrides?: TestOverrides;
}

export function callConversationForkAndRun(
  options: CallConversationForkAndRunOptions,
) {
  return callApi({
    path: "/ai/conversations/{conversation_id}/fork-and-run",
    method: "POST",
    pathParams: { conversation_id: options.conversationId },
    body: options.body,
    stream: true,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    onStreamStart: options.onStreamStart,
    onStreamEvent: options.onStreamEvent,
    onStreamComplete: options.onStreamComplete,
    onStreamError: options.onStreamError,
    _testOverrides: options._testOverrides,
  });
}

// ─── Conversation: settings, delete, sandbox binding (THE ADMIN SEAT's doors) ──
//
// PATCH /cx/conversations/{id} (title / status / exclude_from_kg), DELETE /cx/conversations/{id}
// (soft delete), PUT|DELETE /ai/conversations/{id}/sandbox. On user pages the chat package writes
// these straight to Supabase; on an admin page (`adminSeatOpen`) it calls these, and callApi binds
// the platform tenant + the admin-lane header, which the server's require_owned_conversation admits.

export type ConversationSettingsBody = components["schemas"]["ConversationSettingsUpdate"];
export type ConversationSettingsResult = components["schemas"]["ConversationSettingsResponse"];
export type ConversationDeleteResult = components["schemas"]["ConversationDeleteResponse"];
export type SandboxBindBody = components["schemas"]["SandboxBindRequest"];
type SandboxBindingStateResult = components["schemas"]["SandboxBindingState"];

interface ConversationDoorOptions<B = never> {
  conversationId: string;
  body?: B;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
}

export function callConversationUpdate(
  options: ConversationDoorOptions<ConversationSettingsBody> & { body: ConversationSettingsBody },
): ThunkAction<Promise<ApiCallResult<ConversationSettingsResult>>, RootState, unknown, Action> {
  return callApi({
    path: "/cx/conversations/{conversation_id}",
    method: "PATCH",
    pathParams: { conversation_id: options.conversationId },
    body: options.body,
    stream: false,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
  }) as ThunkAction<Promise<ApiCallResult<ConversationSettingsResult>>, RootState, unknown, Action>;
}

export function callConversationDelete(
  options: ConversationDoorOptions,
): ThunkAction<Promise<ApiCallResult<ConversationDeleteResult>>, RootState, unknown, Action> {
  return callApi({
    path: "/cx/conversations/{conversation_id}",
    method: "DELETE",
    pathParams: { conversation_id: options.conversationId },
    stream: false,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
  }) as ThunkAction<Promise<ApiCallResult<ConversationDeleteResult>>, RootState, unknown, Action>;
}

export function callConversationSandboxBind(
  options: ConversationDoorOptions<SandboxBindBody> & { body: SandboxBindBody },
): ThunkAction<Promise<ApiCallResult<SandboxBindingStateResult>>, RootState, unknown, Action> {
  return callApi({
    path: "/ai/conversations/{conversation_id}/sandbox",
    method: "PUT",
    pathParams: { conversation_id: options.conversationId },
    body: options.body,
    stream: false,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
  }) as ThunkAction<Promise<ApiCallResult<SandboxBindingStateResult>>, RootState, unknown, Action>;
}

export function callConversationSandboxUnbind(
  options: ConversationDoorOptions,
): ThunkAction<Promise<ApiCallResult<SandboxBindingStateResult>>, RootState, unknown, Action> {
  return callApi({
    path: "/ai/conversations/{conversation_id}/sandbox",
    method: "DELETE",
    pathParams: { conversation_id: options.conversationId },
    stream: false,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
  }) as ThunkAction<Promise<ApiCallResult<SandboxBindingStateResult>>, RootState, unknown, Action>;
}

// ─── Messages: Batch delete with tool-pair cascade ───────────────────────────
//
// POST /cx/conversations/{id}/messages/delete — moves messages to Trash
// (deleted_at on the messages + their tool calls / artifacts / media). Smarter than the
// per-row legacy path: keeps tool_use / tool_result adjacency intact so the
// next provider call never sees an orphan tool block. Pass `dry_run: true` to
// preview the resolved set without writing.

export type MessageSelector = components["schemas"]["MessageSelector"];
export type BatchDeleteBody = components["schemas"]["BatchDeleteRequest"];
export type BatchDeleteResult = components["schemas"]["BatchDeleteResponse"];

export interface CallBatchDeleteMessagesOptions {
  conversationId: string;
  body: BatchDeleteBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  _testOverrides?: TestOverrides;
}

export function callBatchDeleteMessages(
  options: CallBatchDeleteMessagesOptions,
): ThunkAction<
  Promise<ApiCallResult<BatchDeleteResult>>,
  RootState,
  unknown,
  Action
> {
  return callApi({
    path: "/cx/conversations/{conversation_id}/messages/delete",
    method: "POST",
    pathParams: { conversation_id: options.conversationId },
    body: options.body,
    stream: false,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    _testOverrides: options._testOverrides,
  }) as ThunkAction<
    Promise<ApiCallResult<BatchDeleteResult>>,
    RootState,
    unknown,
    Action
  >;
}

// ─── Messages: Replace (user-initiated compaction) ───────────────────────────
//
// POST /cx/conversations/{id}/messages/replace — soft-delete the selected
// rows and insert a single visible summary message in their place. Reversible
// via /messages/restore using the returned `compaction_group_id`.

export type ReplaceMessagesBody = components["schemas"]["ReplaceRequest"];
export type ReplaceMessagesResult = components["schemas"]["ReplaceResponse"];

export interface CallReplaceMessagesOptions {
  conversationId: string;
  body: ReplaceMessagesBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  _testOverrides?: TestOverrides;
}

export function callReplaceMessages(
  options: CallReplaceMessagesOptions,
): ThunkAction<
  Promise<ApiCallResult<ReplaceMessagesResult>>,
  RootState,
  unknown,
  Action
> {
  return callApi({
    path: "/cx/conversations/{conversation_id}/messages/replace",
    method: "POST",
    pathParams: { conversation_id: options.conversationId },
    body: options.body,
    stream: false,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    _testOverrides: options._testOverrides,
  }) as ThunkAction<
    Promise<ApiCallResult<ReplaceMessagesResult>>,
    RootState,
    unknown,
    Action
  >;
}

// ─── Messages: Hide (system-initiated compaction) ────────────────────────────
//
// POST /cx/conversations/{id}/messages/hide — flip `is_visible_to_model=false`
// on the selected rows. User still sees them; nothing is soft-deleted;
// positions don't move. Reversible via /messages/restore.

export type HideMessagesBody = components["schemas"]["HideRequest"];
export type HideMessagesResult = components["schemas"]["HideResponse"];

export interface CallHideMessagesOptions {
  conversationId: string;
  body: HideMessagesBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  _testOverrides?: TestOverrides;
}

export function callHideMessages(
  options: CallHideMessagesOptions,
): ThunkAction<
  Promise<ApiCallResult<HideMessagesResult>>,
  RootState,
  unknown,
  Action
> {
  return callApi({
    path: "/cx/conversations/{conversation_id}/messages/hide",
    method: "POST",
    pathParams: { conversation_id: options.conversationId },
    body: options.body,
    stream: false,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    _testOverrides: options._testOverrides,
  }) as ThunkAction<
    Promise<ApiCallResult<HideMessagesResult>>,
    RootState,
    unknown,
    Action
  >;
}

// ─── Messages: Restore (undo a replace or hide) ──────────────────────────────
//
// POST /cx/conversations/{id}/messages/restore — reverse a previous
// /messages/replace or /messages/hide. Identify the op via either
// `compaction_group_id` or `summary_message_id` (replace only).
//
// NOTE the response schema is namespaced — there's an unrelated
// `RestoreResponse` in the file_analysis router. The generated `paths`
// already resolves to the right one; the typed return below points at the
// namespaced schema for callers that want to type it explicitly.

export type RestoreCompactionBody = components["schemas"]["RestoreRequest"];
export type RestoreCompactionResult =
  components["schemas"]["aidream__services__conversation_context__compaction__RestoreResponse"];

export interface CallRestoreCompactionOptions {
  conversationId: string;
  body: RestoreCompactionBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  _testOverrides?: TestOverrides;
}

export function callRestoreCompaction(
  options: CallRestoreCompactionOptions,
): ThunkAction<
  Promise<ApiCallResult<RestoreCompactionResult>>,
  RootState,
  unknown,
  Action
> {
  return callApi({
    path: "/cx/conversations/{conversation_id}/messages/restore",
    method: "POST",
    pathParams: { conversation_id: options.conversationId },
    body: options.body,
    stream: false,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    _testOverrides: options._testOverrides,
  }) as ThunkAction<
    Promise<ApiCallResult<RestoreCompactionResult>>,
    RootState,
    unknown,
    Action
  >;
}

// ─── Turns: Compact one or more whole turns ──────────────────────────────────
//
// POST /cx/conversations/{id}/turns/compact — turn = role:"user" → next
// role:"user" (exclusive). Server resolves the turn boundary and delegates to
// /messages/replace (mode="user") or /messages/hide (mode="system"). Caller
// supplies the summary content; this endpoint does not run an LLM.

export type CompactTurnsBody = components["schemas"]["CompactTurnsRequest"];
export type CompactTurnsResult = components["schemas"]["CompactTurnsResponse"];

export interface CallCompactTurnsOptions {
  conversationId: string;
  body: CompactTurnsBody;
  signal?: AbortSignal;
  scopeOverrides?: Partial<CallScope>;
  _testOverrides?: TestOverrides;
}

export function callCompactTurns(
  options: CallCompactTurnsOptions,
): ThunkAction<
  Promise<ApiCallResult<CompactTurnsResult>>,
  RootState,
  unknown,
  Action
> {
  return callApi({
    path: "/cx/conversations/{conversation_id}/turns/compact",
    method: "POST",
    pathParams: { conversation_id: options.conversationId },
    body: options.body,
    stream: false,
    signal: options.signal,
    scopeOverrides: options.scopeOverrides,
    _testOverrides: options._testOverrides,
  }) as ThunkAction<
    Promise<ApiCallResult<CompactTurnsResult>>,
    RootState,
    unknown,
    Action
  >;
}

