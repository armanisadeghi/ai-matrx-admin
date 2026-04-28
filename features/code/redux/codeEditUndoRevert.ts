/**
 * codeEditUndoRevert — undo / revert thunks for the AI edit history.
 *
 * Three operations, all chronological:
 *
 *   • `undoLastEditThunk(args?)` — undo the most recent AI accept on
 *     the active tab (or a caller-specified tab). Inverse-applies the
 *     edit's REPLACE→SEARCH transform on the current buffer, marks the
 *     edit `reverted` in history, and re-stages the originating patch
 *     in `codePatchesSlice` so the user can accept it again.
 *
 *   • `revertMessageThunk({messageId, conversationId})` — for every
 *     file the message touched, restore to its `beforeContent`.
 *     Surfaces a confirmation when later messages also touched the
 *     same files; the dialog summarises which messages will lose
 *     their accepted edits as a side effect.
 *
 *   • `revertConversationThunk({conversationId})` — same as message
 *     revert applied to every snapshot in the conversation. For each
 *     file, restores to the EARLIEST snapshot's `beforeContent`.
 *
 * In all three: the actual buffer mutation flows through
 * `updateTabContent` so cloud / library / sandbox / mock all "just
 * work" without any new save code.
 *
 * Each thunk also queues a flush write into Supabase via the regular
 * pendingWrites pipeline (the `recordRevert` reducer handles that
 * automatically) so the persisted history stays in sync.
 */

import type { AppDispatch, RootState } from "@/lib/redux/store";
import { applyCodeEdits } from "@/features/code-editor/agent-code-editor/utils/applyCodeEdits";
import { updateTabContent } from "./tabsSlice";
import {
  recordRevert,
  selectCodeEditHistory,
  type AppliedEditEntry,
  type MessageFileSnapshot,
} from "./codeEditHistorySlice";
import { restagePatch } from "./codePatchesSlice";
import {
  fileIdentityKey,
  fileIdentityToTabId,
  type FileIdentity,
} from "../utils/fileIdentity";

// ─── Helpers ────────────────────────────────────────────────────────────────

function snapshotIdentity(snap: MessageFileSnapshot): FileIdentity {
  return {
    adapter: snap.fileAdapter,
    path: snap.filePath,
    libraryFileId: snap.libraryFileId,
  };
}

function snapshotKey(snap: MessageFileSnapshot): string {
  return fileIdentityKey(snapshotIdentity(snap));
}

/**
 * Find the most-recently-applied edit on a given tab. Returns null if
 * there's nothing reasonable to undo (no history, only rejected
 * edits, only already-reverted edits).
 */
function findLastAppliedForTab(
  state: RootState,
  tabId: string,
): { snapshot: MessageFileSnapshot; edit: AppliedEditEntry } | null {
  const tab = state.codeTabs?.byId?.[tabId];
  if (!tab) return null;
  // We don't have direct access to fileIdentity from a tab id, so we
  // walk every snapshot in byMessage looking for one that matches
  // this tab. Cheap because most history maps are tiny per session.
  // The byFile index is keyed by fileIdentity, but we want the
  // identity FROM the tab, which we already compute below — using
  // selectSnapshotsForFile would require importing tabToFileIdentity
  // and re-deriving the same thing. Inline to avoid the cycle.
  const history = selectCodeEditHistory(state);
  // We accept the slight O(N) walk: history is bounded by what fits
  // in the chat scroll plus current session, which never gets huge
  // before users start a new conversation.
  let best: { snapshot: MessageFileSnapshot; edit: AppliedEditEntry } | null =
    null;
  let bestTime = -Infinity;
  for (const fileKey in history.byFile) {
    const list = history.byFile[fileKey];
    if (!list) continue;
    // Match on tab.id by reconstructing the candidate id for the
    // identity we stored. Cheap string compare.
    const sample = list[0];
    const candidateId = fileIdentityToTabId({
      adapter: sample.fileAdapter,
      path: sample.filePath,
      libraryFileId: sample.libraryFileId,
    });
    if (candidateId !== tabId && sample.filePath !== tab.path) continue;
    for (const snap of list) {
      if (snap.status === "reverted") continue;
      for (const edit of snap.edits) {
        if (edit.status !== "applied") continue;
        const t = Date.parse(edit.appliedAt ?? snap.appliedAt);
        if (Number.isFinite(t) && t > bestTime) {
          bestTime = t;
          best = { snapshot: snap, edit };
        }
      }
    }
  }
  return best;
}

interface UndoArgs {
  /** Tab id to undo on. Defaults to the active tab. */
  tabId?: string;
}

export function undoLastEditThunk(
  args: UndoArgs = {},
): (dispatch: AppDispatch, getState: () => RootState) => boolean {
  return (dispatch, getState): boolean => {
    const state = getState();
    const tabId = args.tabId ?? state.codeTabs?.activeId ?? null;
    if (!tabId) return false;
    const tab = state.codeTabs?.byId?.[tabId];
    if (!tab) return false;
    const target = findLastAppliedForTab(state, tabId);
    if (!target) return false;
    const { snapshot, edit } = target;

    // Inverse-apply on the current buffer: swap search/replace. This
    // is correct even when later edits have shifted surrounding code,
    // as long as the replacement text is still uniquely identifiable.
    const inverse = applyCodeEdits(tab.content, [
      { id: edit.patchId, search: edit.replace, replace: edit.search },
    ]);
    if (!inverse.success || !inverse.code) {
      // eslint-disable-next-line no-console
      console.warn(
        `[codeEditHistory] undo failed for patch ${edit.patchId}: ${inverse.errors[0] ?? "no match"}`,
      );
      return false;
    }

    dispatch(
      updateTabContent({
        id: tab.id,
        content: inverse.code,
        source: "ai-undo",
      }),
    );
    dispatch(
      recordRevert({
        messageId: snapshot.messageId,
        fileIdentity: snapshotIdentity(snapshot),
        patchIds: [edit.patchId],
      }),
    );
    // Re-stage so the user can re-accept; if the patch was already
    // cleared from `codePatchesSlice`, this is a no-op.
    dispatch(restagePatch({ tabId: tab.id, patchId: edit.patchId }));
    return true;
  };
}

// ─── Revert message ─────────────────────────────────────────────────────────

interface RevertMessageArgs {
  messageId: string;
  /**
   * If true, callers have already shown the confirmation dialog and
   * acknowledged the cascading effect on later messages. Without this
   * flag the thunk returns `requiresConfirmation: true` instead of
   * mutating state.
   */
  confirmCascading?: boolean;
}

export interface RevertMessageOutcome {
  /** Whether any state changed. */
  mutated: boolean;
  /** Set when the caller needs to surface a confirmation dialog. */
  requiresConfirmation?: {
    laterMessageIds: string[];
    affectedFiles: string[];
  };
  /** Files whose buffer couldn't be reverted via inverse-apply. */
  unreverted: string[];
}

export function revertMessageThunk(
  args: RevertMessageArgs,
): (dispatch: AppDispatch, getState: () => RootState) => RevertMessageOutcome {
  return (dispatch, getState): RevertMessageOutcome => {
    const state = getState();
    const history = selectCodeEditHistory(state);
    const targetSnaps = history.byMessage[args.messageId];
    if (!targetSnaps || targetSnaps.length === 0) {
      return { mutated: false, unreverted: [] };
    }

    // Find any LATER snapshots that touch the same files. Chronology
    // is approximated by `appliedAt` (server-assigned `created_at`
    // after persistence). Same-message snapshots are excluded.
    const targetTimestamps = targetSnaps.map((s) => Date.parse(s.appliedAt));
    const targetMaxTime = Math.max(...targetTimestamps);
    const fileKeys = new Set(targetSnaps.map(snapshotKey));

    const laterMessageIds = new Set<string>();
    const affectedFiles = new Set<string>();
    for (const fileKey of fileKeys) {
      const list = history.byFile[fileKey];
      if (!list) continue;
      for (const s of list) {
        if (s.messageId === args.messageId) continue;
        if (s.status === "reverted") continue;
        const t = Date.parse(s.appliedAt);
        if (!Number.isFinite(t)) continue;
        if (t > targetMaxTime) {
          laterMessageIds.add(s.messageId);
          affectedFiles.add(s.filePath);
        }
      }
    }

    if (!args.confirmCascading && laterMessageIds.size > 0) {
      return {
        mutated: false,
        requiresConfirmation: {
          laterMessageIds: [...laterMessageIds],
          affectedFiles: [...affectedFiles],
        },
        unreverted: [],
      };
    }

    const unreverted: string[] = [];

    // Walk newest→oldest to maximise the chance that inverse-applying
    // each edit succeeds (we strip the most recent contributions
    // first, exposing earlier ones).
    const ordered = [...targetSnaps].sort(
      (a, b) => (Date.parse(b.appliedAt) || 0) - (Date.parse(a.appliedAt) || 0),
    );

    for (const snap of ordered) {
      const tabId = fileIdentityToTabId(snapshotIdentity(snap));
      const tab = getState().codeTabs?.byId?.[tabId];
      if (!tab) {
        // The tab isn't open; we still record the revert so future
        // hydration sees a consistent state. The buffer mutation
        // happens the next time the tab opens (via the snapshot's
        // before/after content — out of scope for v1).
        dispatch(
          recordRevert({
            messageId: snap.messageId,
            fileIdentity: snapshotIdentity(snap),
            revertWholeFile: true,
          }),
        );
        continue;
      }

      // Inverse-apply each applied edit in reverse blockIndex order so
      // overlapping edits unwind cleanly.
      let working = tab.content;
      let allApplied = true;
      const appliedEdits = snap.edits
        .filter((e) => e.status === "applied")
        .slice()
        .sort((a, b) => b.blockIndex - a.blockIndex);

      for (const edit of appliedEdits) {
        const result = applyCodeEdits(working, [
          { id: edit.patchId, search: edit.replace, replace: edit.search },
        ]);
        if (result.success && result.code) {
          working = result.code;
        } else {
          allApplied = false;
          break;
        }
      }

      if (!allApplied) {
        // Fallback: hard-reset the buffer to the snapshot's
        // beforeContent. This is only safe if no later message has
        // edited the file — the confirmCascading flag covers that case.
        if (laterMessageIds.size === 0 || args.confirmCascading) {
          working = snap.beforeContent;
        } else {
          unreverted.push(snap.filePath);
          continue;
        }
      }

      if (working !== tab.content) {
        dispatch(
          updateTabContent({
            id: tab.id,
            content: working,
            source: "ai-undo",
          }),
        );
      }
      dispatch(
        recordRevert({
          messageId: snap.messageId,
          fileIdentity: snapshotIdentity(snap),
          revertWholeFile: true,
        }),
      );
    }

    return {
      mutated: true,
      unreverted,
    };
  };
}

// ─── Revert conversation ────────────────────────────────────────────────────

interface RevertConversationArgs {
  conversationId: string;
}

export interface RevertConversationOutcome {
  mutated: boolean;
  unreverted: string[];
}

export function revertConversationThunk(
  args: RevertConversationArgs,
): (
  dispatch: AppDispatch,
  getState: () => RootState,
) => RevertConversationOutcome {
  return (dispatch, getState): RevertConversationOutcome => {
    const state = getState();
    const history = selectCodeEditHistory(state);
    const list = history.byConversation[args.conversationId];
    if (!list || list.length === 0) {
      return { mutated: false, unreverted: [] };
    }

    // For each file: find the chronologically-earliest snapshot, set
    // tab content to its `beforeContent`, mark every snapshot for
    // that file in this conversation as reverted.
    const byFileEarliest = new Map<string, MessageFileSnapshot>();
    for (const snap of list) {
      const key = snapshotKey(snap);
      const existing = byFileEarliest.get(key);
      if (
        !existing ||
        Date.parse(snap.appliedAt) < Date.parse(existing.appliedAt)
      ) {
        byFileEarliest.set(key, snap);
      }
    }

    const unreverted: string[] = [];
    for (const [, snap] of byFileEarliest) {
      const tabId = fileIdentityToTabId(snapshotIdentity(snap));
      const tab = getState().codeTabs?.byId?.[tabId];
      if (tab && tab.content !== snap.beforeContent) {
        dispatch(
          updateTabContent({
            id: tab.id,
            content: snap.beforeContent,
            source: "ai-undo",
          }),
        );
      } else if (!tab) {
        // Tab isn't open — record revert anyway so future hydration
        // is consistent.
      }
    }

    // Mark every snapshot in the conversation as reverted.
    for (const snap of list) {
      dispatch(
        recordRevert({
          messageId: snap.messageId,
          fileIdentity: snapshotIdentity(snap),
          revertWholeFile: true,
        }),
      );
    }

    return { mutated: true, unreverted };
  };
}
