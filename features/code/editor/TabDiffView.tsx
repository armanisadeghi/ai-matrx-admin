"use client";

/**
 * TabDiffView — replaces Monaco for any tab that has pending AI patches.
 *
 * The whole "review surface" concept lives inside the file's own tab
 * (mirrors Cursor exactly): when the agent emits SEARCH/REPLACE blocks
 * that match this tab, the tab swaps from `<MonacoEditor>` to this
 * component until the user has accepted or rejected every edit. Once
 * the patch list is empty for this tab, `<EditorArea>` swaps back to
 * the normal editor automatically — no separate tab, no extra layers.
 *
 * Layout:
 *   ┌─ Slim toolbar (file-level) ────────────────────────────────────┐
 *   │ [‹ Prev file] [Next file ›] · N edits · +A -D       [Reject][Accept]
 *   ├─ Monaco DiffEditor (inline, theme-aware, both sides read-only) ┤
 *   │   original = tab.content                                       │
 *   │   modified = tab.content with all pending patches applied      │
 *   │                                                                │
 *   │   Each hunk gets its own inline [Accept] [Reject] pair rendered│
 *   │   as a Monaco content widget on the modified pane (Cursor /    │
 *   │   VSCode style). Per-hunk actions go through the same          │
 *   │   acceptPatch / rejectPatch path the toolbar uses.             │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Apply pipeline: identical to before. Accept dispatches `applyCodeEdits`
 * → `updateTabContent`; the existing dirty + save pipeline carries the
 * change to whatever filesystem owns the tab (cloud / library / sandbox
 * / mock). Reject just marks the patch rejected; the buffer is untouched.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import {
  DiffEditor,
  type DiffOnMount,
  type Monaco,
} from "@monaco-editor/react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { applyCodeEdits } from "@/features/code-editor/agent-code-editor/utils/applyCodeEdits";
import { generateUnifiedDiff } from "@/features/code-editor/agent-code-editor/utils/generateDiff";
import { useMonacoTheme } from "./useMonacoTheme";
import { setActiveTab, updateTabContent } from "../redux/tabsSlice";
import {
  markPatchApplied,
  markPatchRejected,
  selectPendingPatchesForTab,
  selectTabIdsWithPendingChanges,
  type PendingPatch,
} from "../redux/codePatchesSlice";
import type { EditorFile } from "../types";

interface TabDiffViewProps {
  tab: EditorFile;
}

interface PatchAnchor {
  patchId: string;
  modifiedLine: number;
  domNode: HTMLDivElement;
}

export const TabDiffView: React.FC<TabDiffViewProps> = ({ tab }) => {
  const dispatch = useAppDispatch();
  const isDark = useMonacoTheme();

  // Memoize the factory selector per tabId — see redux-selector-rules
  // Rule 7. Reuses the same memoized selector instance across renders.
  const selectPending = useMemo(
    () => selectPendingPatchesForTab(tab.id),
    [tab.id],
  );
  const patches = useAppSelector(selectPending);

  // Compute the proposed content (current buffer + every pending patch
  // applied in order) and per-patch dry-run results in a single pass.
  // Rerun only when the buffer or the patch list changes — applyCodeEdits
  // is pure, so the memo is exhaustive.
  const { proposedContent, perPatchOk, additions, deletions } = useMemo(() => {
    let working = tab.content;
    const ok: Record<string, boolean> = {};
    for (const patch of patches) {
      const applied = applyCodeEdits(working, [
        { id: patch.patchId, search: patch.search, replace: patch.replace },
      ]);
      if (applied.success && applied.code) {
        working = applied.code;
        ok[patch.patchId] = true;
      } else {
        ok[patch.patchId] = false;
      }
    }
    const stats = generateUnifiedDiff(tab.content, working);
    return {
      proposedContent: working,
      perPatchOk: ok,
      additions: stats.additions,
      deletions: stats.deletions,
    };
  }, [tab.content, patches]);

  // ── Per-tab navigation: prev / next file with pending changes ─────────
  const tabIdsWithPending = useAppSelector(selectTabIdsWithPendingChanges);
  const navIndex = tabIdsWithPending.indexOf(tab.id);
  const prevTabId = navIndex > 0 ? tabIdsWithPending[navIndex - 1] : null;
  const nextTabId =
    navIndex >= 0 && navIndex < tabIdsWithPending.length - 1
      ? tabIdsWithPending[navIndex + 1]
      : null;
  const navPosition =
    navIndex >= 0 ? `${navIndex + 1} of ${tabIdsWithPending.length}` : "1 of 1";
  const goPrev = useCallback(() => {
    if (prevTabId) dispatch(setActiveTab(prevTabId));
  }, [dispatch, prevTabId]);
  const goNext = useCallback(() => {
    if (nextTabId) dispatch(setActiveTab(nextTabId));
  }, [dispatch, nextTabId]);

  // ── Apply / reject actions ────────────────────────────────────────────
  const acceptPatch = useCallback(
    (patch: PendingPatch) => {
      const result = applyCodeEdits(tab.content, [
        { id: patch.patchId, search: patch.search, replace: patch.replace },
      ]);
      if (!result.success || !result.code) {
        dispatch(
          markPatchRejected({
            tabId: tab.id,
            patchId: patch.patchId,
            reason: result.errors[0] ?? "apply failed",
          }),
        );
        return;
      }
      dispatch(updateTabContent({ id: tab.id, content: result.code }));
      dispatch(markPatchApplied({ tabId: tab.id, patchId: patch.patchId }));
    },
    [dispatch, tab.id, tab.content],
  );

  const rejectPatch = useCallback(
    (patch: PendingPatch) => {
      dispatch(
        markPatchRejected({
          tabId: tab.id,
          patchId: patch.patchId,
          reason: "user rejected",
        }),
      );
    },
    [dispatch, tab.id],
  );

  const acceptAll = useCallback(() => {
    let working = tab.content;
    const applied: string[] = [];
    const rejectedWithReason: Array<{ patchId: string; reason: string }> = [];
    for (const patch of patches) {
      const result = applyCodeEdits(working, [
        { id: patch.patchId, search: patch.search, replace: patch.replace },
      ]);
      if (result.success && result.code) {
        working = result.code;
        applied.push(patch.patchId);
      } else {
        rejectedWithReason.push({
          patchId: patch.patchId,
          reason: result.errors[0] ?? "apply failed",
        });
      }
    }
    if (working !== tab.content) {
      dispatch(updateTabContent({ id: tab.id, content: working }));
    }
    for (const patchId of applied) {
      dispatch(markPatchApplied({ tabId: tab.id, patchId }));
    }
    for (const { patchId, reason } of rejectedWithReason) {
      dispatch(markPatchRejected({ tabId: tab.id, patchId, reason }));
    }
  }, [dispatch, patches, tab.id, tab.content]);

  const rejectAll = useCallback(() => {
    for (const patch of patches) {
      dispatch(
        markPatchRejected({
          tabId: tab.id,
          patchId: patch.patchId,
          reason: "user rejected (file)",
        }),
      );
    }
  }, [dispatch, patches, tab.id]);

  // ── Monaco wiring for per-hunk inline action widgets ──────────────────
  // We track the diff editor + monaco namespace in state so effects
  // re-run after the editor mounts (refs alone wouldn't trigger a
  // rerun, content widgets need to be added AFTER the editor exists).
  const [diffEditor, setDiffEditor] =
    useState<MonacoEditorNS.IStandaloneDiffEditor | null>(null);
  const [monacoApi, setMonacoApi] = useState<Monaco | null>(null);
  const [anchors, setAnchors] = useState<PatchAnchor[]>([]);

  // Refs to current callbacks so the React-portal buttons always call
  // the latest version without us re-creating widgets on every render.
  const acceptPatchRef = useRef(acceptPatch);
  const rejectPatchRef = useRef(rejectPatch);
  acceptPatchRef.current = acceptPatch;
  rejectPatchRef.current = rejectPatch;

  const handleDiffMount: DiffOnMount = useCallback((editor, monaco) => {
    editor.getOriginalEditor().updateOptions({ readOnly: true });
    editor.getModifiedEditor().updateOptions({ readOnly: true });
    setDiffEditor(editor);
    setMonacoApi(monaco);
  }, []);

  // Whenever the diff editor finishes computing (or our patch list
  // changes after an accept), recompute which patch corresponds to
  // which Monaco hunk and rebuild the anchor list. We assume a 1:1
  // mapping between SEARCH/REPLACE blocks and Monaco hunks, sorted by
  // their original-side line position — which holds for the SEARCH/
  // REPLACE format the agent emits because each block is a contiguous
  // edit.
  useEffect(() => {
    if (!diffEditor) return;
    let cancelled = false;

    const compute = () => {
      if (cancelled) return;
      const changes = diffEditor.getLineChanges() ?? [];
      if (changes.length === 0) {
        setAnchors([]);
        return;
      }

      const positions: Array<{
        patch: PendingPatch;
        originalStart: number;
      }> = [];
      for (const patch of patches) {
        const idx = tab.content.indexOf(patch.search);
        if (idx === -1) continue; // fuzzy-only patch — skip inline widget
        const startLine = tab.content.substring(0, idx).split("\n").length;
        positions.push({ patch, originalStart: startLine });
      }
      positions.sort((a, b) => a.originalStart - b.originalStart);

      const next: PatchAnchor[] = [];
      const n = Math.min(positions.length, changes.length);
      for (let i = 0; i < n; i++) {
        const change = changes[i];
        const patch = positions[i].patch;
        const modifiedLine = Math.max(
          1,
          change.modifiedStartLineNumber || change.modifiedEndLineNumber || 1,
        );
        const dom = document.createElement("div");
        // Allow the React-portal button container to receive clicks
        // even though Monaco overlays default to pointer-events:none.
        dom.style.pointerEvents = "auto";
        next.push({
          patchId: patch.patchId,
          modifiedLine,
          domNode: dom,
        });
      }
      setAnchors(next);
    };

    compute();
    const sub = diffEditor.onDidUpdateDiff(compute);
    return () => {
      cancelled = true;
      sub.dispose();
    };
  }, [diffEditor, patches, tab.content]);

  // Register Monaco content widgets for each anchor. Re-runs whenever
  // the anchor list changes (i.e. after a patch is accepted / rejected
  // and the diff is recomputed).
  useEffect(() => {
    if (!diffEditor || !monacoApi || anchors.length === 0) return;
    const modifiedEditor = diffEditor.getModifiedEditor();
    const widgets: MonacoEditorNS.IContentWidget[] = [];
    for (const anchor of anchors) {
      const widget: MonacoEditorNS.IContentWidget = {
        getId: () => `tab-diff-action:${anchor.patchId}`,
        getDomNode: () => anchor.domNode,
        getPosition: () => ({
          position: { lineNumber: anchor.modifiedLine, column: 1 },
          preference: [
            monacoApi.editor.ContentWidgetPositionPreference.ABOVE,
            monacoApi.editor.ContentWidgetPositionPreference.BELOW,
          ],
        }),
      };
      modifiedEditor.addContentWidget(widget);
      widgets.push(widget);
    }
    return () => {
      for (const widget of widgets) {
        modifiedEditor.removeContentWidget(widget);
      }
    };
  }, [diffEditor, monacoApi, anchors]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Slim toolbar ───────────────────────────────────────────── */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b px-2 py-1 text-[12px]",
          "border-blue-200 bg-blue-50/60",
          "dark:border-blue-900/60 dark:bg-blue-950/30",
        )}
      >
        {/* Prev / next file with pending changes */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={!prevTabId}
            title={
              prevTabId
                ? "Previous file with pending changes"
                : "No previous file"
            }
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded",
              prevTabId
                ? "text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
                : "cursor-not-allowed text-neutral-400 dark:text-neutral-600",
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!nextTabId}
            title={
              nextTabId ? "Next file with pending changes" : "No next file"
            }
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded",
              nextTabId
                ? "text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
                : "cursor-not-allowed text-neutral-400 dark:text-neutral-600",
            )}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="font-mono text-[10px] text-blue-700/70 dark:text-blue-300/70">
          {navPosition}
        </span>

        <span className="mx-1 h-3 w-px bg-blue-200 dark:bg-blue-900/60" />

        <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <span className="font-medium text-blue-900 dark:text-blue-200">
          {patches.length} {patches.length === 1 ? "edit" : "edits"}
        </span>
        <span className="font-mono text-[11px]">
          {additions > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              +{additions}
            </span>
          )}
          {additions > 0 && deletions > 0 && (
            <span className="text-neutral-400 dark:text-neutral-600"> </span>
          )}
          {deletions > 0 && (
            <span className="text-red-600 dark:text-red-400">-{deletions}</span>
          )}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={rejectAll}
            className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-2 py-0.5 text-[11px] text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <X className="h-3 w-3" />
            Reject all
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-blue-700"
          >
            <Check className="h-3 w-3" />
            Accept all
          </button>
        </div>
      </div>

      {/* ── Monaco DiffEditor — same engine VSCode uses ─────────────── */}
      <div className="relative min-h-0 flex-1">
        <DiffEditor
          key={tab.id}
          height="100%"
          language={tab.language}
          theme={isDark ? "vs-dark" : "vs"}
          original={tab.content}
          modified={proposedContent}
          onMount={handleDiffMount}
          options={{
            renderSideBySide: false,
            readOnly: true,
            originalEditable: false,
            renderValidationDecorations: "off",
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            renderWhitespace: "selection",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            diffWordWrap: "off",
            guides: { indentation: true },
          }}
        />
      </div>

      {/* ── Per-hunk inline action portals ──────────────────────────── */}
      {anchors.map((anchor) => {
        const patch = patches.find((p) => p.patchId === anchor.patchId);
        if (!patch) return null;
        const ok = perPatchOk[anchor.patchId] !== false;
        return createPortal(
          <InlineHunkActions
            ok={ok}
            onAccept={() => acceptPatchRef.current(patch)}
            onReject={() => rejectPatchRef.current(patch)}
          />,
          anchor.domNode,
          anchor.patchId,
        );
      })}
    </div>
  );
};

interface InlineHunkActionsProps {
  ok: boolean;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Tiny floating bar rendered as a Monaco content widget at the top of
 * each diff hunk. Mirrors Cursor's pattern: blue Accept, dark Reject,
 * inline with the diff. Inherits keyboard cues (⌥⏎ / ⇧⌥⌫) once we wire
 * editor commands — for now they're click-only.
 */
const InlineHunkActions: React.FC<InlineHunkActionsProps> = ({
  ok,
  onAccept,
  onReject,
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-px overflow-hidden rounded-md text-[11px] font-medium shadow-sm",
        "ring-1 ring-black/10 dark:ring-white/10",
      )}
      style={{ pointerEvents: "auto" }}
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          if (ok) onAccept();
        }}
        disabled={!ok}
        title={
          ok
            ? "Accept this edit"
            : "Cannot apply — earlier edits drifted the surrounding code"
        }
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5",
          ok
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "cursor-not-allowed bg-neutral-300 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
        )}
      >
        <Check className="h-3 w-3" />
        Accept
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          onReject();
        }}
        title="Reject this edit"
        className="inline-flex items-center gap-1 bg-neutral-700 px-2 py-0.5 text-white hover:bg-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
      >
        <X className="h-3 w-3" />
        Reject
      </button>
    </div>
  );
};
