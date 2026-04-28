/**
 * codeEditHistorySlice
 *
 * In-memory cache of every AI edit a user has accepted, rejected, or
 * reverted, scoped per (conversation, message, file). Mirrors the
 * Supabase `cx_code_message_file` + `cx_code_edit` tables and powers:
 *
 *   • Per-patch undo within a tab.
 *   • Per-message and per-conversation revert.
 *   • The triple-view inspector (Before / With updates / Modifications
 *     Since) opened from any assistant message.
 *
 * State shape:
 *
 *   byConversation: Record<conversationId, MessageFileSnapshot[]>
 *     — chronological list, newest last. Primary index for the chat
 *       timeline + revert-conversation UX.
 *   byMessage:      Record<messageId, MessageFileSnapshot[]>
 *     — every file a single assistant message touched. Used by the
 *       inline file strip rendered under chat messages.
 *   byFile:         Record<fileIdentityKey, MessageFileSnapshot[]>
 *     — chronological list of every message that has touched the same
 *       logical file. Powers per-tab undo and the timeline column of
 *       the triple view.
 *   pendingWrites:  Record<writeKey, PendingWrite>
 *     — work the flush thunk hasn't yet persisted. Keyed by
 *       `${messageId}:${fileIdentityKey}` (one row per message-file
 *       pair, exactly like the upsert).
 *   hydrationStatus: Record<conversationId, "idle"|"loading"|"loaded"|"error">
 *     — guard for lazy hydration on conversation switch.
 *
 * Slice contract:
 *
 *   • Pure cache. No side effects, no thunks. Mutations come from:
 *       - recordPatchApplied / recordPatchRejected / recordRevert
 *         dispatched by `<TabDiffView>` and the undo/revert thunks;
 *       - mergeFromServer dispatched by the hydration thunk and the
 *         flush thunk after a successful round-trip.
 *
 *   • The three indexes are kept in sync by every mutator. We never
 *     iterate the full state to "rebuild" — every action takes O(1)
 *     amortized work per touched snapshot.
 *
 *   • Snapshots carry a server-assigned `id` only after persistence.
 *     The pendingWrites queue is the source of truth for "what still
 *     needs to be flushed".
 */

import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  fileIdentityKey,
  type FileIdentity,
} from "../utils/fileIdentity";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MessageFileStatus = "in_progress" | "completed" | "reverted";
export type EditEntryStatus = "applied" | "rejected" | "reverted";

export interface AppliedEditEntry {
  /** Server-assigned UUID, undefined until persisted. */
  id?: string;
  /** Stable patch id from `codePatchesSlice` — `${requestId}:${tabId}:${blockIndex}`. */
  patchId: string;
  /** Index of this SEARCH/REPLACE block within the originating message. */
  blockIndex: number;
  search: string;
  replace: string;
  status: EditEntryStatus;
  appliedAt?: string;
  rejectedAt?: string;
  revertedAt?: string;
  rejectReason?: string;
}

export interface MessageFileSnapshot {
  /** Server-assigned UUID, undefined until persisted. */
  id?: string;
  messageId: string;
  conversationId: string;
  organizationId?: string;

  // File identity. Stored as a flattened triple instead of the helper
  // type so Redux DevTools render it cleanly without a circular ref.
  fileAdapter: string;
  filePath: string;
  libraryFileId?: string;

  beforeContent: string;
  afterContent: string;

  edits: AppliedEditEntry[];

  status: MessageFileStatus;
  appliedAt: string;
  revertedAt?: string;
  persistedAt?: string;

  /** Reserved for future commit-tied view. */
  gitCommitSha?: string;
  gitBranch?: string;
}

export interface PendingWrite {
  /** writeKey = `${messageId}:${fileIdentityKey}` */
  key: string;
  messageId: string;
  fileIdentity: FileIdentity;
  /** Wall clock ms; the hook flushes 500ms after this stops moving. */
  queuedAt: number;
  attempts: number;
  lastError?: string;
}

export type HydrationStatus = "idle" | "loading" | "loaded" | "error";

export interface CodeEditHistoryState {
  byConversation: Record<string, MessageFileSnapshot[]>;
  byMessage: Record<string, MessageFileSnapshot[]>;
  byFile: Record<string, MessageFileSnapshot[]>;
  pendingWrites: Record<string, PendingWrite>;
  hydrationStatus: Record<string, HydrationStatus>;
}

const initialState: CodeEditHistoryState = {
  byConversation: {},
  byMessage: {},
  byFile: {},
  pendingWrites: {},
  hydrationStatus: {},
};

// ─── Internal helpers ───────────────────────────────────────────────────────

const EMPTY_SNAPSHOT_LIST: MessageFileSnapshot[] = [];
const EMPTY_EDIT_LIST: AppliedEditEntry[] = [];

function snapshotKey(snap: MessageFileSnapshot): string {
  return fileIdentityKey({
    adapter: snap.fileAdapter,
    path: snap.filePath,
    libraryFileId: snap.libraryFileId,
  });
}

function writeKeyFor(messageId: string, fileKey: string): string {
  return `${messageId}:${fileKey}`;
}

/**
 * Find a snapshot index in a list by (messageId, fileIdentity).
 * Returns -1 when not present.
 */
function findIndex(
  list: MessageFileSnapshot[],
  messageId: string,
  fileKey: string,
): number {
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.messageId === messageId && snapshotKey(s) === fileKey) return i;
  }
  return -1;
}

/**
 * Walk the three indexes and replace (or insert) `next` for the
 * (messageId, fileIdentity) pair it carries. Keeps chronological
 * ordering on the conversation/file lists by inserting at the end.
 */
function upsertSnapshot(
  state: CodeEditHistoryState,
  next: MessageFileSnapshot,
) {
  const fileKey = snapshotKey(next);

  // byConversation
  const convList = state.byConversation[next.conversationId] ?? [];
  const convIdx = findIndex(convList, next.messageId, fileKey);
  if (convIdx === -1) {
    convList.push(next);
  } else {
    convList[convIdx] = next;
  }
  state.byConversation[next.conversationId] = convList;

  // byMessage
  const msgList = state.byMessage[next.messageId] ?? [];
  const msgIdx = findIndex(msgList, next.messageId, fileKey);
  if (msgIdx === -1) {
    msgList.push(next);
  } else {
    msgList[msgIdx] = next;
  }
  state.byMessage[next.messageId] = msgList;

  // byFile
  const fileList = state.byFile[fileKey] ?? [];
  const fileIdx = findIndex(fileList, next.messageId, fileKey);
  if (fileIdx === -1) {
    fileList.push(next);
  } else {
    fileList[fileIdx] = next;
  }
  state.byFile[fileKey] = fileList;
}

function removeSnapshotEverywhere(
  state: CodeEditHistoryState,
  conversationId: string,
  messageId: string,
  fileKey: string,
) {
  const conv = state.byConversation[conversationId];
  if (conv) {
    state.byConversation[conversationId] = conv.filter(
      (s) => !(s.messageId === messageId && snapshotKey(s) === fileKey),
    );
  }
  const msg = state.byMessage[messageId];
  if (msg) {
    state.byMessage[messageId] = msg.filter(
      (s) => snapshotKey(s) !== fileKey,
    );
  }
  const file = state.byFile[fileKey];
  if (file) {
    state.byFile[fileKey] = file.filter(
      (s) => s.messageId !== messageId,
    );
  }
}

function recomputeCounters(snap: MessageFileSnapshot): MessageFileSnapshot {
  let applied = 0;
  let rejected = 0;
  let reverted = 0;
  for (const e of snap.edits) {
    if (e.status === "applied") applied++;
    else if (e.status === "rejected") rejected++;
    else if (e.status === "reverted") reverted++;
  }
  // status: completed when nothing is pending and nothing has been
  // reverted; reverted when every applied edit has been undone;
  // in_progress otherwise (including "no resolved edits yet" — though
  // we never actually create a snapshot with zero resolved edits).
  let status: MessageFileStatus = "in_progress";
  if (snap.status === "reverted") {
    status = "reverted";
  } else if (applied === 0 && reverted > 0) {
    status = "reverted";
  } else if (applied > 0 || rejected > 0) {
    status = "completed";
  }
  return { ...snap, status };
}

function makeWrite(
  messageId: string,
  fileIdentity: FileIdentity,
): PendingWrite {
  const key = writeKeyFor(messageId, fileIdentityKey(fileIdentity));
  return { key, messageId, fileIdentity, queuedAt: Date.now(), attempts: 0 };
}

// ─── Slice ──────────────────────────────────────────────────────────────────

const slice = createSlice({
  name: "codeEditHistory",
  initialState,
  reducers: {
    /**
     * Record a freshly-applied SEARCH/REPLACE block. Captures the
     * before/after content for triple-view, appends a per-edit entry,
     * and queues a flush.
     *
     * `beforeContent` is the file content **right before this patch
     * was applied** — i.e. for the FIRST edit in a (message, file)
     * pair this is the canonical baseline; for subsequent edits it
     * gets ignored (we keep the baseline immutable).
     */
    recordPatchApplied(
      state,
      action: PayloadAction<{
        messageId: string;
        conversationId: string;
        organizationId?: string;
        fileIdentity: FileIdentity;
        beforeContent: string;
        afterContent: string;
        patchId: string;
        blockIndex: number;
        search: string;
        replace: string;
      }>,
    ) {
      const p = action.payload;
      const fileKey = fileIdentityKey(p.fileIdentity);
      const list = state.byMessage[p.messageId] ?? [];
      const idx = findIndex(list, p.messageId, fileKey);

      let snap: MessageFileSnapshot;
      if (idx === -1) {
        snap = {
          messageId: p.messageId,
          conversationId: p.conversationId,
          organizationId: p.organizationId,
          fileAdapter: p.fileIdentity.adapter,
          filePath: p.fileIdentity.path,
          libraryFileId: p.fileIdentity.libraryFileId,
          beforeContent: p.beforeContent,
          afterContent: p.afterContent,
          edits: [],
          status: "in_progress",
          appliedAt: new Date().toISOString(),
        };
      } else {
        snap = { ...list[idx], afterContent: p.afterContent };
      }

      const edits = snap.edits.filter((e) => e.patchId !== p.patchId);
      edits.push({
        patchId: p.patchId,
        blockIndex: p.blockIndex,
        search: p.search,
        replace: p.replace,
        status: "applied",
        appliedAt: new Date().toISOString(),
      });
      snap = recomputeCounters({ ...snap, edits });

      upsertSnapshot(state, snap);

      const writeKey = writeKeyFor(p.messageId, fileKey);
      const existing = state.pendingWrites[writeKey];
      state.pendingWrites[writeKey] = existing
        ? { ...existing, queuedAt: Date.now(), lastError: undefined }
        : makeWrite(p.messageId, p.fileIdentity);
    },

    /**
     * Record a rejection. Same shape as `recordPatchApplied` but the
     * edit lands in `rejected` state and `afterContent` is left at
     * whatever the caller passes — typically the unchanged buffer.
     */
    recordPatchRejected(
      state,
      action: PayloadAction<{
        messageId: string;
        conversationId: string;
        organizationId?: string;
        fileIdentity: FileIdentity;
        beforeContent: string;
        afterContent: string;
        patchId: string;
        blockIndex: number;
        search: string;
        replace: string;
        reason?: string;
      }>,
    ) {
      const p = action.payload;
      const fileKey = fileIdentityKey(p.fileIdentity);
      const list = state.byMessage[p.messageId] ?? [];
      const idx = findIndex(list, p.messageId, fileKey);

      let snap: MessageFileSnapshot;
      if (idx === -1) {
        snap = {
          messageId: p.messageId,
          conversationId: p.conversationId,
          organizationId: p.organizationId,
          fileAdapter: p.fileIdentity.adapter,
          filePath: p.fileIdentity.path,
          libraryFileId: p.fileIdentity.libraryFileId,
          beforeContent: p.beforeContent,
          afterContent: p.afterContent,
          edits: [],
          status: "in_progress",
          appliedAt: new Date().toISOString(),
        };
      } else {
        snap = { ...list[idx], afterContent: p.afterContent };
      }

      const edits = snap.edits.filter((e) => e.patchId !== p.patchId);
      edits.push({
        patchId: p.patchId,
        blockIndex: p.blockIndex,
        search: p.search,
        replace: p.replace,
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectReason: p.reason,
      });
      snap = recomputeCounters({ ...snap, edits });

      upsertSnapshot(state, snap);

      const writeKey = writeKeyFor(p.messageId, fileKey);
      const existing = state.pendingWrites[writeKey];
      state.pendingWrites[writeKey] = existing
        ? { ...existing, queuedAt: Date.now(), lastError: undefined }
        : makeWrite(p.messageId, p.fileIdentity);
    },

    /**
     * Mark one or more edits within a single (message, file) snapshot
     * as `reverted`. Used by the per-patch undo and per-message revert
     * thunks. If `revertWholeFile` is true the snapshot itself is
     * marked `reverted` (used by message / conversation revert).
     */
    recordRevert(
      state,
      action: PayloadAction<{
        messageId: string;
        fileIdentity: FileIdentity;
        patchIds?: string[];
        revertWholeFile?: boolean;
      }>,
    ) {
      const p = action.payload;
      const fileKey = fileIdentityKey(p.fileIdentity);
      const list = state.byMessage[p.messageId];
      if (!list) return;
      const idx = findIndex(list, p.messageId, fileKey);
      if (idx === -1) return;

      const orig = list[idx];
      const ts = new Date().toISOString();
      const patchSet = p.patchIds ? new Set(p.patchIds) : null;

      const edits = orig.edits.map((e) => {
        if (patchSet && !patchSet.has(e.patchId)) return e;
        if (e.status !== "applied" && !p.revertWholeFile) return e;
        return { ...e, status: "reverted" as EditEntryStatus, revertedAt: ts };
      });

      let snap = recomputeCounters({ ...orig, edits });
      if (p.revertWholeFile) {
        snap = { ...snap, status: "reverted", revertedAt: ts };
      }

      upsertSnapshot(state, snap);

      const writeKey = writeKeyFor(p.messageId, fileKey);
      const existing = state.pendingWrites[writeKey];
      state.pendingWrites[writeKey] = existing
        ? { ...existing, queuedAt: Date.now(), lastError: undefined }
        : makeWrite(p.messageId, p.fileIdentity);
    },

    /**
     * Mark a (message, file) snapshot as persisted with the
     * server-assigned ids. Removes the corresponding pendingWrite
     * entry so the flush hook stops retrying.
     */
    markPersisted(
      state,
      action: PayloadAction<{
        messageId: string;
        fileIdentity: FileIdentity;
        messageFileId: string;
        editIds: Array<{ blockIndex: number; id: string }>;
        persistedAt: string;
      }>,
    ) {
      const p = action.payload;
      const fileKey = fileIdentityKey(p.fileIdentity);
      const list = state.byMessage[p.messageId];
      if (!list) return;
      const idx = findIndex(list, p.messageId, fileKey);
      if (idx === -1) return;

      const orig = list[idx];
      const idByBlock = new Map<number, string>();
      for (const e of p.editIds) idByBlock.set(e.blockIndex, e.id);

      const snap: MessageFileSnapshot = {
        ...orig,
        id: p.messageFileId,
        persistedAt: p.persistedAt,
        edits: orig.edits.map((e) => {
          const id = idByBlock.get(e.blockIndex);
          return id ? { ...e, id } : e;
        }),
      };

      upsertSnapshot(state, snap);
      delete state.pendingWrites[writeKeyFor(p.messageId, fileKey)];
    },

    /**
     * Record a flush failure — leaves the entry in `pendingWrites` so
     * the hook can retry, but bumps `attempts` and stores the error.
     */
    markWriteError(
      state,
      action: PayloadAction<{
        messageId: string;
        fileIdentity: FileIdentity;
        error: string;
      }>,
    ) {
      const key = writeKeyFor(
        action.payload.messageId,
        fileIdentityKey(action.payload.fileIdentity),
      );
      const existing = state.pendingWrites[key];
      if (!existing) return;
      state.pendingWrites[key] = {
        ...existing,
        attempts: existing.attempts + 1,
        lastError: action.payload.error,
      };
    },

    /**
     * Bulk merge of snapshots fetched from Supabase during hydration.
     * Server data wins for already-persisted rows; pending entries
     * (no `id`) are preserved so an in-flight flush isn't clobbered.
     */
    mergeFromServer(
      state,
      action: PayloadAction<{
        conversationId: string;
        snapshots: MessageFileSnapshot[];
      }>,
    ) {
      const { conversationId, snapshots } = action.payload;
      // Build the new conversation list from scratch.
      const existing = state.byConversation[conversationId] ?? [];
      const pendingByKey = new Map<string, MessageFileSnapshot>();
      for (const s of existing) {
        if (!s.id) {
          pendingByKey.set(`${s.messageId}:${snapshotKey(s)}`, s);
        }
      }

      // Wipe existing indexes for this conversation, then re-add
      // server snapshots + preserved pending ones.
      for (const s of existing) {
        const fileKey = snapshotKey(s);
        const file = state.byFile[fileKey];
        if (file) {
          state.byFile[fileKey] = file.filter(
            (other) =>
              !(
                other.conversationId === conversationId &&
                other.messageId === s.messageId &&
                snapshotKey(other) === fileKey
              ),
          );
        }
        const msg = state.byMessage[s.messageId];
        if (msg) {
          state.byMessage[s.messageId] = msg.filter(
            (other) =>
              !(
                other.conversationId === conversationId &&
                snapshotKey(other) === fileKey
              ),
          );
        }
      }
      state.byConversation[conversationId] = [];

      for (const s of snapshots) {
        upsertSnapshot(state, s);
      }
      for (const s of pendingByKey.values()) {
        // Skip if server version superseded the pending one.
        const fileKey = snapshotKey(s);
        const list = state.byMessage[s.messageId] ?? [];
        if (findIndex(list, s.messageId, fileKey) === -1) {
          upsertSnapshot(state, s);
        }
      }

      state.hydrationStatus[conversationId] = "loaded";
    },

    setHydrationStatus(
      state,
      action: PayloadAction<{
        conversationId: string;
        status: HydrationStatus;
      }>,
    ) {
      state.hydrationStatus[action.payload.conversationId] =
        action.payload.status;
    },

    /** Remove every snapshot for one conversation — used on logout. */
    clearConversation(state, action: PayloadAction<{ conversationId: string }>) {
      const list = state.byConversation[action.payload.conversationId];
      if (list) {
        for (const s of list) {
          removeSnapshotEverywhere(
            state,
            s.conversationId,
            s.messageId,
            snapshotKey(s),
          );
        }
      }
      delete state.byConversation[action.payload.conversationId];
      delete state.hydrationStatus[action.payload.conversationId];
      // Clear any pending writes for that conversation.
      for (const key of Object.keys(state.pendingWrites)) {
        const w = state.pendingWrites[key];
        // pendingWrites doesn't carry conversationId — look up via
        // byMessage to decide whether to drop. If the snapshot is
        // already gone we can drop without harm.
        if (!state.byMessage[w.messageId]) {
          delete state.pendingWrites[key];
        }
      }
    },

    clearAll(state) {
      state.byConversation = {};
      state.byMessage = {};
      state.byFile = {};
      state.pendingWrites = {};
      state.hydrationStatus = {};
    },
  },
});

export const {
  recordPatchApplied,
  recordPatchRejected,
  recordRevert,
  markPersisted,
  markWriteError,
  mergeFromServer,
  setHydrationStatus,
  clearConversation,
  clearAll,
} = slice.actions;

export default slice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────

type WithCodeEditHistory = { codeEditHistory: CodeEditHistoryState };

export const selectCodeEditHistory = (state: WithCodeEditHistory) =>
  state.codeEditHistory ?? initialState;

export const selectSnapshotsForConversation =
  (conversationId: string | null | undefined) =>
  (state: WithCodeEditHistory): MessageFileSnapshot[] => {
    if (!conversationId) return EMPTY_SNAPSHOT_LIST;
    return (
      selectCodeEditHistory(state).byConversation[conversationId] ??
      EMPTY_SNAPSHOT_LIST
    );
  };

export const selectSnapshotsForMessage =
  (messageId: string | null | undefined) =>
  (state: WithCodeEditHistory): MessageFileSnapshot[] => {
    if (!messageId) return EMPTY_SNAPSHOT_LIST;
    return (
      selectCodeEditHistory(state).byMessage[messageId] ??
      EMPTY_SNAPSHOT_LIST
    );
  };

export const selectSnapshotsForFile =
  (fileIdentity: FileIdentity | null | undefined) =>
  (state: WithCodeEditHistory): MessageFileSnapshot[] => {
    if (!fileIdentity) return EMPTY_SNAPSHOT_LIST;
    const key = fileIdentityKey(fileIdentity);
    return selectCodeEditHistory(state).byFile[key] ?? EMPTY_SNAPSHOT_LIST;
  };

/**
 * Last applied (or rejected) edit on a given file across the whole
 * history — the entry that an "undo last AI edit" command should
 * target. Returns `null` when there is nothing to undo.
 */
export const selectLastResolvedEditForFile = (
  fileIdentity: FileIdentity | null | undefined,
) =>
  createSelector([selectSnapshotsForFile(fileIdentity)], (snaps) => {
    if (snaps.length === 0)
      return null as null | {
        snapshot: MessageFileSnapshot;
        edit: AppliedEditEntry;
      };
    // Walk newest→oldest snapshot, newest→oldest edit within snapshot.
    for (let i = snaps.length - 1; i >= 0; i--) {
      const s = snaps[i];
      if (s.status === "reverted") continue;
      for (let j = s.edits.length - 1; j >= 0; j--) {
        const e = s.edits[j];
        if (e.status === "applied" || e.status === "rejected") {
          return { snapshot: s, edit: e };
        }
      }
    }
    return null;
  });

export const selectHydrationStatus =
  (conversationId: string | null | undefined) =>
  (state: WithCodeEditHistory): HydrationStatus => {
    if (!conversationId) return "idle";
    return (
      selectCodeEditHistory(state).hydrationStatus[conversationId] ?? "idle"
    );
  };

export const selectPendingWrites = (
  state: WithCodeEditHistory,
): Record<string, PendingWrite> =>
  selectCodeEditHistory(state).pendingWrites;

export const selectHasPendingWrites = createSelector(
  [selectPendingWrites],
  (writes): boolean => Object.keys(writes).length > 0,
);

/**
 * Convenience: list of every distinct messageId in a conversation that
 * has at least one history snapshot. Used by the chat-level revert UI
 * and the timeline column of the sidebar history section.
 */
export const selectMessageIdsWithEditsInConversation = (
  conversationId: string | null | undefined,
) =>
  createSelector(
    [selectSnapshotsForConversation(conversationId)],
    (snaps): string[] => {
      const seen = new Set<string>();
      const order: string[] = [];
      for (const s of snaps) {
        if (!seen.has(s.messageId)) {
          seen.add(s.messageId);
          order.push(s.messageId);
        }
      }
      return order;
    },
  );

// Exported for tests + the flush thunk so it doesn't have to recompute.
export const __internals = {
  snapshotKey,
  writeKeyFor,
  recomputeCounters,
  EMPTY_EDIT_LIST,
};
