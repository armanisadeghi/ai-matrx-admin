/**
 * codeEditHistoryThunks
 *
 * Recording thunks invoked by `<TabDiffView>` whenever the user
 * accepts or rejects an AI patch. They translate a (`requestId`,
 * `tabId`) pair into the canonical (`conversationId`, `messageId`,
 * `fileIdentity`) tuple expected by `codeEditHistorySlice` and
 * dispatch the right reducer.
 *
 * messageId race
 * ──────────────
 * The patch tray sees `requestId` long before the assistant message
 * is server-reserved, because the agent stream emits SEARCH/REPLACE
 * blocks as it goes. `MessageRecord._streamRequestId` only appears
 * once `record_reserved cx_message` has come back from the server.
 * In the rare case where the user accepts a patch in that brief
 * window, we have a `requestId` but no `messageId`.
 *
 * The thunk handles this by polling the store on a short interval
 * (capped at 10s) until either:
 *   1. The matching MessageRecord shows up — we resolve and dispatch
 *      the slice action immediately.
 *   2. The timeout elapses — we drop the deferred entry. Losing a
 *      single user-action history row in the event the message id
 *      never resolves is the right failure mode; we don't want a
 *      leaked timer or a phantom history row tied to an unknown
 *      message.
 *
 * The polling subscription is module-local so multiple deferred
 * actions share one watcher and we don't end up with N timers per
 * pending record.
 */

import { unwrapResult } from "@reduxjs/toolkit";
import type { AppThunk, RootState } from "@/lib/redux/store";
import {
  recordPatchApplied,
  recordPatchRejected,
  recordRevert,
} from "./codeEditHistorySlice";
import type { FileIdentity } from "../utils/fileIdentity";

void unwrapResult; // keeps the import shape parallel to other thunk files

// ─── messageId resolution ────────────────────────────────────────────────────

/**
 * Find the assistant `cx_message.id` whose `_streamRequestId` matches
 * the given request id. Walks the messages slice keyed by the
 * conversationId attached to the active request. Returns null when
 * the message hasn't been reserved yet (the race we defer through).
 */
function resolveMessageId(
  state: RootState,
  requestId: string,
): { messageId: string; conversationId: string } | null {
  const request = state.activeRequests?.byRequestId?.[requestId];
  if (!request) return null;
  const conversationId = request.conversationId;
  const entry = state.messages?.byConversationId?.[conversationId];
  if (!entry) return null;
  // Walk newest→oldest so streaming-message lookup is O(1) in the
  // common case.
  for (let i = entry.orderedIds.length - 1; i >= 0; i--) {
    const id = entry.orderedIds[i];
    const rec = entry.byId[id];
    if (rec?.role === "assistant" && rec._streamRequestId === requestId) {
      return { messageId: id, conversationId };
    }
  }
  return null;
}

interface DeferredEntry {
  requestId: string;
  /** Unix ms — used to age out stale entries. */
  queuedAt: number;
  run: (resolved: { messageId: string; conversationId: string }) => void;
}

const DEFERRAL_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 120;

const deferredQueue = new Map<symbol, DeferredEntry>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

function ensurePoller(getState: () => RootState) {
  if (pollTimer || deferredQueue.size === 0) return;
  pollTimer = setInterval(() => {
    if (deferredQueue.size === 0) {
      stopPoller();
      return;
    }
    const now = Date.now();
    const state = getState();
    for (const [key, entry] of deferredQueue) {
      if (now - entry.queuedAt > DEFERRAL_TIMEOUT_MS) {
        deferredQueue.delete(key);
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn(
            `[codeEditHistory] gave up resolving messageId for request ${entry.requestId} after ${DEFERRAL_TIMEOUT_MS}ms`,
          );
        }
        continue;
      }
      const resolved = resolveMessageId(state, entry.requestId);
      if (resolved) {
        deferredQueue.delete(key);
        entry.run(resolved);
      }
    }
    if (deferredQueue.size === 0) stopPoller();
  }, POLL_INTERVAL_MS);
}

function stopPoller() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Resolve `messageId` synchronously when possible, otherwise queue
 * `run` until the message arrives or the timeout fires.
 */
function withMessageId(
  getState: () => RootState,
  requestId: string,
  run: (resolved: { messageId: string; conversationId: string }) => void,
): void {
  const synchronous = resolveMessageId(getState(), requestId);
  if (synchronous) {
    run(synchronous);
    return;
  }
  const key = Symbol(requestId);
  deferredQueue.set(key, {
    requestId,
    queuedAt: Date.now(),
    run,
  });
  ensurePoller(getState);
}

// ─── Recording thunks ────────────────────────────────────────────────────────

interface RecordAppliedArgs {
  requestId: string;
  fileIdentity: FileIdentity;
  beforeContent: string;
  afterContent: string;
  patchId: string;
  blockIndex: number;
  search: string;
  replace: string;
}

export function recordPatchAcceptedThunk(args: RecordAppliedArgs): AppThunk {
  return (dispatch, getState) => {
    withMessageId(getState, args.requestId, ({ messageId, conversationId }) => {
      dispatch(
        recordPatchApplied({
          messageId,
          conversationId,
          fileIdentity: args.fileIdentity,
          beforeContent: args.beforeContent,
          afterContent: args.afterContent,
          patchId: args.patchId,
          blockIndex: args.blockIndex,
          search: args.search,
          replace: args.replace,
        }),
      );
    });
  };
}

interface RecordRejectedArgs extends RecordAppliedArgs {
  reason?: string;
}

export function recordPatchRejectedThunk(args: RecordRejectedArgs): AppThunk {
  return (dispatch, getState) => {
    withMessageId(getState, args.requestId, ({ messageId, conversationId }) => {
      dispatch(
        recordPatchRejected({
          messageId,
          conversationId,
          fileIdentity: args.fileIdentity,
          beforeContent: args.beforeContent,
          afterContent: args.afterContent,
          patchId: args.patchId,
          blockIndex: args.blockIndex,
          search: args.search,
          replace: args.replace,
          reason: args.reason,
        }),
      );
    });
  };
}

interface RecordRevertArgs {
  messageId: string;
  fileIdentity: FileIdentity;
  patchIds?: string[];
  revertWholeFile?: boolean;
}

/**
 * Revert is dispatched by undo / revert thunks that already know the
 * `messageId` (no race). Provided here for symmetry so call-sites
 * never reach into the slice directly.
 */
export function recordRevertThunk(args: RecordRevertArgs): AppThunk {
  return (dispatch) => {
    dispatch(recordRevert(args));
  };
}

// ─── Test hooks ──────────────────────────────────────────────────────────────

/**
 * Internal: drain the deferred queue immediately. Tests use this to
 * avoid waiting for the poll interval. Not exported through the
 * public barrel.
 */
export function __flushDeferredForTests(getState: () => RootState) {
  const state = getState();
  for (const [key, entry] of deferredQueue) {
    const resolved = resolveMessageId(state, entry.requestId);
    if (resolved) {
      deferredQueue.delete(key);
      entry.run(resolved);
    }
  }
  if (deferredQueue.size === 0) stopPoller();
}

export function __resetDeferredForTests() {
  deferredQueue.clear();
  stopPoller();
}
