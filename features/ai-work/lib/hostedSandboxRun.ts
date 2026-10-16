/**
 * hostedSandboxRun — the ONE client for a coding-agent run (Claude Code or
 * Codex) inside a Matrx Sandbox we start for the user.
 *
 * ## What this is
 *
 * `/work/new`'s "Claude Code (hosted)" and "Codex (hosted)" destinations. Both
 * providers share every piece of plumbing here — the stream adoption, the
 * runtime-id read Cancel needs, the payer field and the workspace root — and
 * differ only in their url pair and their request body
 * (`ClaudeManagedRequest` vs `CodexManagedRequest`). The run happens in a Matrx
 * Sandbox on our side (not on the user's Mac — that is the separate
 * `matrxLocalRuntime` lane), streams back as NDJSON, and lands in a canonical
 * conversation the user opens at `/work/conversations/<id>`.
 *
 * ## Rendering
 *
 * Nothing here parses content. The NDJSON body is handed to
 * `adoptForeignStream`, so the run renders through the ONE canonical pipeline
 * (`processStream` → `activeRequests` → the kind registry) exactly as a chat
 * stream does. A second renderer here would be the banned bespoke-stream
 * defect (`features/content-ir/FEATURE.md`).
 *
 * ## THE TWO-HOMES RULE — why these are the `claude/*` paths
 *
 * There is ONE url per operation. `POST /coding-sessions/claude/stream` and
 * `POST /coding-sessions/claude/runtimes/{runtime_id}/cancel` each have two
 * server homes: served inside a hosted Matrx Sandbox they run the turn; served
 * by the app server they find or start the caller's sandbox and forward the
 * same request into it. The client sends the identical body either way, so
 * there is nothing here to branch on. The short-lived `/coding-sessions/hosted/*`
 * POST twins were collapsed into these before they ever shipped — two urls for
 * one operation is two auth stories and a second dispatch path
 * (aidream `scripts/check_bridge_dispatch_surface.py`).
 *
 * The verdict that decides whether this may run at all is the BRIDGE's, never
 * a probe here: `lib/codingBridgeCapability.ts`.
 */

import { callApi } from "@/lib/api/call-api";
import type { AppThunk } from "@/lib/redux/store";
import type { TypedStreamEvent } from "@ai-matrx/agents/generated/stream-events";
import { adoptForeignStream } from "@ai-matrx/chat/agents/redux/execution-system/thunks/adopt-foreign-stream";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import type { HostedBilling } from "@/features/ai-work/lib/ownPlan";
import {
  cancelClaudeManagedRuntime,
  cancelCodexManagedRuntime,
} from "@ai-matrx/api/code";
import { serverApi } from "@/lib/api/server-api";
import type { components } from "@ai-matrx/api/types";

type ClaudeManagedRestRequest = components["schemas"]["ClaudeManagedRestRequest"];
type CodexManagedRestRequest = components["schemas"]["CodexManagedRestRequest"];

/** The coding agents a hosted run can be. Same spelling as `OwnPlanProvider`. */
export type HostedProvider = "claude_code" | "codex";

/** See THE TWO-HOMES RULE. The one url for a hosted turn. */
export const HOSTED_STREAM_PATH = "/coding-sessions/claude/stream" as const;
/** See THE TWO-HOMES RULE. The one url that stops a hosted run. */
export const HOSTED_CANCEL_PATH =
  "/coding-sessions/claude/runtimes/{runtime_id}/cancel" as const;
/** The Codex twin of {@link HOSTED_STREAM_PATH} — the same two-homes rule. */
export const HOSTED_CODEX_STREAM_PATH = "/coding-sessions/codex/stream" as const;
/** The Codex twin of {@link HOSTED_CANCEL_PATH}. */
export const HOSTED_CODEX_CANCEL_PATH =
  "/coding-sessions/codex/runtimes/{runtime_id}/cancel" as const;

/** Each provider's one stream url. */
export const HOSTED_STREAM_PATHS = {
  claude_code: HOSTED_STREAM_PATH,
  codex: HOSTED_CODEX_STREAM_PATH,
} as const satisfies Record<HostedProvider, string>;

/**
 * Default folder inside the sandbox. Never `/home/agent` itself: once the
 * person has an own-plan sign-in in their box (it lives under the home), the
 * server refuses ANY hosted run rooted there, whoever pays. So every hosted
 * run works one level down.
 */
export const HOSTED_WORKSPACE_ROOT = "/home/agent/projects";

export interface HostedRunRequest {
  /** Which coding agent runs. Claude Code when omitted. */
  provider?: "claude_code";
  /** The conversation id the caller minted with `crypto.randomUUID()`. */
  conversationId: string;
  /** What the user typed. Never machine content. */
  prompt: string;
  workspaceRoot?: string;
  maxTurns?: number;
  model?: string | null;
  agentId?: string | null;
  mandateKey?: AnyMandateKey | null;
  permissionMode?: "acceptEdits" | "plan";
  /**
   * Who pays: AI Matrx credits (`platform`, the default) or the person's own
   * signed-in vendor plan (`own_plan`).
   */
  billing?: HostedBilling;
  /**
   * Continues an earlier hosted session in the same conversation: the
   * `session_id` that run's stream reported (`readHostedSessionId`). Turns the
   * request into a `resume`; a start never carries one.
   */
  sessionId?: string | null;
}

/**
 * A hosted Codex run (`CodexManagedRequest` on the server).
 *
 * `model` is REQUIRED by the server: omitted, the Codex CLI silently picks its
 * own built-in default, which the platform key may not reach. The caller names
 * it from the platform model catalog — nothing here chooses one.
 *
 * `threadId` continues an existing Codex thread: it turns the request into a
 * `resume` of the same conversation. It is the `session_id` the previous run's
 * stream reported (`readHostedSessionId`). A start never carries one — the
 * server refuses a start that does.
 */
export interface CodexHostedRunRequest {
  provider: "codex";
  conversationId: string;
  /** What the user typed. Never machine content. */
  prompt: string;
  /** The provider model identifier, e.g. `gpt-5`. */
  model: string;
  workspaceRoot?: string;
  threadId?: string | null;
  /** `workspace-write` for a normal coding run; `read-only` only looks. */
  sandboxMode?: "read-only" | "workspace-write";
  turnTimeoutSeconds?: number;
  maxBudgetUsd?: number;
  billing?: HostedBilling;
}

export type AnyHostedRunRequest = HostedRunRequest | CodexHostedRunRequest;

/** The stream url and the exact body one hosted request sends, typed per provider. */
export type HostedRunWire =
  | { path: typeof HOSTED_CODEX_STREAM_PATH; body: CodexManagedRestRequest }
  | { path: typeof HOSTED_STREAM_PATH; body: ClaudeManagedRestRequest };

export function hostedRunWire(request: AnyHostedRunRequest): HostedRunWire {
  const billing: HostedBilling = request.billing ?? "platform";
  const workspaceRoot = request.workspaceRoot ?? HOSTED_WORKSPACE_ROOT;
  if (request.provider === "codex") {
    const threadId = nonEmptyString(request.threadId);
    return {
      path: HOSTED_STREAM_PATHS.codex,
      body: {
        action: threadId ? "resume" : "start",
        conversation: {
          conversation_id: request.conversationId,
          is_new: !threadId,
          store: true,
        },
        prompt: request.prompt,
        workspace_root: workspaceRoot,
        // Present ONLY on a resume: the server refuses a start carrying one.
        ...(threadId ? { thread_id: threadId } : {}),
        model: request.model,
        sandbox_mode: request.sandboxMode ?? "workspace-write",
        ...(request.turnTimeoutSeconds !== undefined
          ? { turn_timeout_seconds: request.turnTimeoutSeconds }
          : {}),
        ...(request.maxBudgetUsd !== undefined
          ? { max_budget_usd: request.maxBudgetUsd }
          : {}),
        billing,
      },
    };
  }
  const sessionId = nonEmptyString(request.sessionId);
  return {
    path: HOSTED_STREAM_PATHS.claude_code,
    body: {
      action: sessionId ? "resume" : "start",
      conversation: {
        conversation_id: request.conversationId,
        is_new: !sessionId,
        store: true,
      },
      prompt: request.prompt,
      workspace_root: workspaceRoot,
      // Present ONLY on a resume: a start's session id is the server's to mint.
      ...(sessionId ? { session_id: sessionId } : {}),
      max_turns: request.maxTurns ?? 20,
      model: request.model ?? null,
      agent_id: request.agentId ?? null,
      mandate_key: request.mandateKey ?? null,
      permission_mode: request.permissionMode ?? "acceptEdits",
      billing,
    },
  };
}

export interface HostedRunHandle {
  /** The ids the adopted stream landed under, once the stream connected. */
  requestId: string | null;
  /** The sandbox run id Cancel needs, when the stream reported one. */
  runtimeId: string | null;
  /**
   * The provider's own session id (for Codex, its thread id — what a later
   * `resume` sends as `thread_id`), when the stream reported one.
   */
  sessionId: string | null;
  /** The server's own sentence when the run could not start. */
  error: string | null;
}

export interface StartHostedRunCallbacks {
  /** Fires the instant the stream is adopted — before any event is processed. */
  onAdopted?: (ids: { requestId: string; conversationId: string }) => void;
  /** Fires the first time the stream reports a runtime id (Cancel's input). */
  onRuntimeId?: (runtimeId: string) => void;
  /** Fires the first time the stream reports the provider's session id. */
  onSessionId?: (sessionId: string) => void;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * The runtime id an event reports, or null.
 *
 * The sandbox run id arrives on the run's own early events — the
 * `MatrxRuntimeWarning`-shaped event carries it as `runtime_id`, and the init
 * (in its `metadata`) and data events carry the same field — Claude's and
 * Codex's alike. It is read tolerantly (root, and one level
 * of `data` nesting, plus the `matrx_runtime_id` spelling) because Cancel is
 * useless without it and a missing id must never be guessed.
 */
export function readHostedRuntimeId(event: TypedStreamEvent): string | null {
  const payload = asRecord((event as { data?: unknown }).data);
  const candidates = [payload, asRecord(payload?.data), asRecord(payload?.metadata)];
  for (const source of candidates) {
    if (!source) continue;
    const found =
      nonEmptyString(source.runtime_id) ??
      nonEmptyString(source.matrx_runtime_id);
    if (found) return found;
  }
  return null;
}

/**
 * The provider session id an event reports, or null.
 *
 * Codex: the init event's metadata carries `session_id` (the Codex thread id)
 * and every Codex data frame
 * (`{"event":"data","data":{"sdk_message_type":"CodexManagedEvent",…}}`)
 * carries it beside `runtime_id` once `thread.started` has been seen. The
 * `thread.started` line itself names it as `event.thread_id`. Read with the
 * same tolerance as the runtime id; never guessed.
 */
export function readHostedSessionId(event: TypedStreamEvent): string | null {
  const payload = asRecord((event as { data?: unknown }).data);
  const sources = [payload, asRecord(payload?.data), asRecord(payload?.metadata)];
  for (const source of sources) {
    if (!source) continue;
    const found = nonEmptyString(source.session_id);
    if (found) return found;
    if (source.sdk_message_type === "CodexManagedEvent") {
      const inner = asRecord(source.event);
      if (inner?.type === "thread.started") {
        const thread = nonEmptyString(inner.thread_id);
        if (thread) return thread;
      }
    }
  }
  return null;
}

/**
 * Start the hosted run and adopt its stream.
 *
 * Resolves when the stream ends (cleanly or not). A failure BEFORE the stream
 * is a normal JSON error envelope; its `message` is returned verbatim in
 * `error` for the caller to surface — nothing is swallowed and nothing is
 * re-worded.
 */
export function startHostedRun(
  request: AnyHostedRunRequest,
  callbacks: StartHostedRunCallbacks = {},
): AppThunk<Promise<HostedRunHandle>> {
  return async (dispatch) => {
    const abortController = new AbortController();
    let requestId: string | null = null;
    let runtimeId: string | null = null;
    let sessionId: string | null = null;
    const wire = hostedRunWire(request);

    const consumeStream = dispatch(
      adoptForeignStream({
        abortController,
        onAdopted: (ids) => {
          requestId = ids.requestId;
          callbacks.onAdopted?.(ids);
        },
        onEvent: (event) => {
          if (!runtimeId) {
            const found = readHostedRuntimeId(event);
            if (found) {
              runtimeId = found;
              callbacks.onRuntimeId?.(found);
            }
          }
          if (!sessionId) {
            const found = readHostedSessionId(event);
            if (found) {
              sessionId = found;
              callbacks.onSessionId?.(found);
            }
          }
        },
      }),
    );

    const result = await dispatch(
      callApi({
        path: wire.path,
        method: "POST",
        stream: true,
        signal: abortController.signal,
        consumeStream,
        body: wire.body,
      }),
    );

    return {
      requestId,
      runtimeId,
      sessionId,
      error: result.error ? result.error.message : null,
    };
  };
}

/**
 * Stop a hosted run.
 *
 * Throws on refusal so the caller surfaces the server's sentence; a cancel that
 * silently did nothing is the lie this platform treats as a defect.
 */
export async function cancelHostedRun(
  runtimeId: string,
  provider: HostedProvider = "claude_code",
): Promise<{ runtimeId: string; cancelled: boolean }> {
  const args = { path: { runtime_id: runtimeId } };
  const data =
    provider === "codex"
      ? await cancelCodexManagedRuntime(serverApi, args)
      : await cancelClaudeManagedRuntime(serverApi, args);
  return { runtimeId: data.runtime_id, cancelled: data.cancelled };
}
