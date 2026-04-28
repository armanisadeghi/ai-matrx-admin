"use client";

/**
 * AIReviewSurface — multi-file Cursor/VSCode-style review pane.
 *
 * Renders inside the singleton "AI Review" tab (kind === "ai-review").
 * Layout:
 *   ┌─ Header (title · stats · view-mode · accept/reject all · close) ─┐
 *   │ ┌─ File rail ─┐ ┌─ Diff viewport (Monaco DiffEditor) ─────────┐ │
 *   │ │ Foo.tsx     │ │                                              │ │
 *   │ │   +18 -7    │ │                                              │ │
 *   │ │ utils.ts    │ │                                              │ │
 *   │ │   +5 -2     │ │                                              │ │
 *   │ │             │ ├──────────────────────────────────────────────┤ │
 *   │ │             │ │ Edits in Foo.tsx                              │ │
 *   │ │             │ │ • edit 1  +5 -2   [Reject] [Accept]           │ │
 *   │ │             │ │ • edit 2  +13 -5  [Reject] [Accept]           │ │
 *   │ │             │ │   [Accept file]   [Reject file]               │ │
 *   │ └─────────────┘ └──────────────────────────────────────────────┘ │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Apply pipeline: identical to PendingPatchTray. Per-patch and per-file
 * accept funnel through `applyCodeEdits` → `updateTabContent`, so the
 * standard dirty + save pipeline writes back to whatever filesystem
 * adapter owns the underlying tab.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DiffEditor, type DiffOnMount } from "@monaco-editor/react";
import {
  Check,
  ChevronRight,
  Columns2,
  GitCompare,
  Rows2,
  Sparkles,
  X,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { applyCodeEdits } from "@/features/code-editor/agent-code-editor/utils/applyCodeEdits";
import { generateUnifiedDiff } from "@/features/code-editor/agent-code-editor/utils/generateDiff";
import { configureMonaco } from "./monaco-config";
import { useMonacoTheme } from "./useMonacoTheme";
import { FileIcon } from "../styles/file-icon";
import {
  closeTab,
  selectCodeTabs,
  setActiveTab,
  updateTabContent,
} from "../redux/tabsSlice";
import {
  clearResolvedPatchesForTab,
  markPatchApplied,
  markPatchRejected,
  selectCodePatches,
  type PendingPatch,
} from "../redux/codePatchesSlice";
import { REVIEW_TAB_ID } from "./aiReviewTab";
import type { EditorFile } from "../types";

type DiffViewMode = "inline" | "split";

interface FileGroup {
  tab: EditorFile;
  patches: PendingPatch[];
  /** Result of applying every pending patch in order. May still have
   *  errors per patch — the UI surfaces those individually. */
  proposedContent: string;
  additions: number;
  deletions: number;
  /** Per-patch dry-run result so the side panel can mark patches that
   *  no longer apply cleanly (e.g. user accepted an earlier patch and
   *  the buffer drifted). */
  perPatchOk: Record<string, boolean>;
}

export const AIReviewSurface: React.FC = () => {
  const dispatch = useAppDispatch();
  const tabs = useAppSelector(selectCodeTabs);
  const patchesState = useAppSelector(selectCodePatches);
  const isDark = useMonacoTheme();

  const [isMonacoReady, setIsMonacoReady] = useState(false);
  const [viewMode, setViewMode] = useState<DiffViewMode>("inline");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    configureMonaco().then(() => {
      if (!cancelled) setIsMonacoReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo<FileGroup[]>(() => {
    const result: FileGroup[] = [];
    for (const [tabId, patches] of Object.entries(patchesState.byTabId)) {
      const tab = tabs.byId[tabId];
      if (!tab) continue;
      const pending = patches.filter((p) => p.status === "pending");
      if (pending.length === 0) continue;

      let working = tab.content;
      const perPatchOk: Record<string, boolean> = {};
      for (const patch of pending) {
        const applied = applyCodeEdits(working, [
          { id: patch.patchId, search: patch.search, replace: patch.replace },
        ]);
        if (applied.success && applied.code) {
          working = applied.code;
          perPatchOk[patch.patchId] = true;
        } else {
          perPatchOk[patch.patchId] = false;
        }
      }
      const stats = generateUnifiedDiff(tab.content, working);
      result.push({
        tab,
        patches: pending,
        proposedContent: working,
        additions: stats.additions,
        deletions: stats.deletions,
        perPatchOk,
      });
    }
    result.sort((a, b) => a.tab.name.localeCompare(b.tab.name));
    return result;
  }, [patchesState.byTabId, tabs.byId]);

  // Keep `selectedFileId` valid as patches resolve. When the current
  // selection's group disappears, fall back to the first remaining
  // group; when none exist, clear selection so the empty state shows.
  useEffect(() => {
    if (groups.length === 0) {
      if (selectedFileId !== null) setSelectedFileId(null);
      return;
    }
    const stillThere = groups.some((g) => g.tab.id === selectedFileId);
    if (!stillThere) {
      setSelectedFileId(groups[0].tab.id);
    }
  }, [groups, selectedFileId]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.tab.id === selectedFileId) ?? groups[0] ?? null,
    [groups, selectedFileId],
  );

  const totals = useMemo(
    () => ({
      patches: groups.reduce((acc, g) => acc + g.patches.length, 0),
      additions: groups.reduce((acc, g) => acc + g.additions, 0),
      deletions: groups.reduce((acc, g) => acc + g.deletions, 0),
    }),
    [groups],
  );

  const acceptPatch = useCallback(
    (group: FileGroup, patch: PendingPatch) => {
      const result = applyCodeEdits(group.tab.content, [
        { id: patch.patchId, search: patch.search, replace: patch.replace },
      ]);
      if (!result.success || !result.code) {
        dispatch(
          markPatchRejected({
            tabId: group.tab.id,
            patchId: patch.patchId,
            reason: result.errors[0] ?? "apply failed",
          }),
        );
        return;
      }
      dispatch(updateTabContent({ id: group.tab.id, content: result.code }));
      dispatch(
        markPatchApplied({ tabId: group.tab.id, patchId: patch.patchId }),
      );
    },
    [dispatch],
  );

  const rejectPatch = useCallback(
    (group: FileGroup, patch: PendingPatch) => {
      dispatch(
        markPatchRejected({
          tabId: group.tab.id,
          patchId: patch.patchId,
          reason: "user rejected",
        }),
      );
    },
    [dispatch],
  );

  const acceptFile = useCallback(
    (group: FileGroup) => {
      let working = group.tab.content;
      const applied: string[] = [];
      const rejectedWithReason: Array<{ patchId: string; reason: string }> = [];
      for (const patch of group.patches) {
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
      if (working !== group.tab.content) {
        dispatch(updateTabContent({ id: group.tab.id, content: working }));
      }
      for (const patchId of applied) {
        dispatch(markPatchApplied({ tabId: group.tab.id, patchId }));
      }
      for (const { patchId, reason } of rejectedWithReason) {
        dispatch(markPatchRejected({ tabId: group.tab.id, patchId, reason }));
      }
    },
    [dispatch],
  );

  const rejectFile = useCallback(
    (group: FileGroup) => {
      for (const patch of group.patches) {
        dispatch(
          markPatchRejected({
            tabId: group.tab.id,
            patchId: patch.patchId,
            reason: "user rejected (file)",
          }),
        );
      }
    },
    [dispatch],
  );

  const acceptAll = useCallback(() => {
    for (const group of groups) acceptFile(group);
  }, [groups, acceptFile]);

  const rejectAll = useCallback(() => {
    for (const group of groups) rejectFile(group);
  }, [groups, rejectFile]);

  const closeReview = useCallback(() => {
    // Wipe finished entries so the next session starts clean. Pending
    // patches survive — we don't silently destroy unreviewed work.
    for (const tabId of Object.keys(patchesState.byTabId)) {
      dispatch(clearResolvedPatchesForTab({ tabId }));
    }
    dispatch(closeTab(REVIEW_TAB_ID));
  }, [patchesState.byTabId, dispatch]);

  const focusUnderlyingFile = useCallback(
    (tabId: string) => {
      dispatch(setActiveTab(tabId));
    },
    [dispatch],
  );

  // ── Empty state ─────────────────────────────────────────────────────────
  if (groups.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-neutral-50 p-6 text-center text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
        <Sparkles className="h-7 w-7 text-emerald-500" />
        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
          No pending AI edits
        </div>
        <div className="max-w-sm text-xs">
          When the agent emits SEARCH/REPLACE blocks against open files, they
          show up here for side-by-side review.
        </div>
        <button
          type="button"
          onClick={closeReview}
          className="mt-2 inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
        >
          <X className="h-3 w-3" />
          Close review
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-neutral-50 dark:bg-neutral-950">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-3 py-1.5 text-xs dark:border-neutral-800 dark:bg-neutral-900">
        <GitCompare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
          AI Review
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">·</span>
        <span className="text-neutral-700 dark:text-neutral-300">
          {groups.length} {groups.length === 1 ? "file" : "files"}
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">·</span>
        <span className="text-neutral-700 dark:text-neutral-300">
          {totals.patches} {totals.patches === 1 ? "edit" : "edits"}
        </span>
        <span className="font-mono text-[11px]">
          {totals.additions > 0 && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
              +{totals.additions}
            </span>
          )}
          {totals.deletions > 0 && (
            <span className="ml-1 text-red-600 dark:text-red-400">
              -{totals.deletions}
            </span>
          )}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <button
            type="button"
            onClick={rejectAll}
            className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <X className="h-3 w-3" />
            Reject all
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            <Check className="h-3 w-3" />
            Accept all
          </button>
          <button
            type="button"
            onClick={closeReview}
            title="Close review"
            className="ml-1 inline-flex items-center rounded p-1 text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Body: file rail + diff viewport ─────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* File rail */}
        <div className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Files changed
          </div>
          <ul className="flex-1 overflow-y-auto">
            {groups.map((group) => {
              const isSelected = selectedGroup?.tab.id === group.tab.id;
              return (
                <li key={group.tab.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedFileId(group.tab.id)}
                    className={cn(
                      "flex w-full items-center gap-1.5 px-2 py-1 text-left text-[12px]",
                      isSelected
                        ? "bg-emerald-100/70 text-neutral-900 dark:bg-emerald-950/50 dark:text-neutral-50"
                        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800/70",
                    )}
                  >
                    <FileIcon name={group.tab.name} kind="file" size={13} />
                    <span className="flex-1 truncate">{group.tab.name}</span>
                    <span className="font-mono text-[10px]">
                      {group.additions > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{group.additions}
                        </span>
                      )}
                      {group.deletions > 0 && (
                        <span className="ml-1 text-red-600 dark:text-red-400">
                          -{group.deletions}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Diff viewport */}
        <div className="flex min-w-0 flex-1 flex-col">
          {selectedGroup ? (
            <FileReviewView
              group={selectedGroup}
              viewMode={viewMode}
              isMonacoReady={isMonacoReady}
              isDark={isDark}
              onAcceptPatch={acceptPatch}
              onRejectPatch={rejectPatch}
              onAcceptFile={acceptFile}
              onRejectFile={rejectFile}
              onFocusUnderlyingFile={focusUnderlyingFile}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────

const ViewModeToggle: React.FC<{
  mode: DiffViewMode;
  onChange: (mode: DiffViewMode) => void;
}> = ({ mode, onChange }) => (
  <div className="inline-flex overflow-hidden rounded border border-neutral-300 dark:border-neutral-700">
    <button
      type="button"
      onClick={() => onChange("inline")}
      title="Inline (unified) diff"
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px]",
        mode === "inline"
          ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50"
          : "bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800",
      )}
    >
      <Rows2 className="h-3 w-3" />
      Inline
    </button>
    <button
      type="button"
      onClick={() => onChange("split")}
      title="Side-by-side (split) diff"
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] border-l border-neutral-300 dark:border-neutral-700",
        mode === "split"
          ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50"
          : "bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800",
      )}
    >
      <Columns2 className="h-3 w-3" />
      Split
    </button>
  </div>
);

interface FileReviewViewProps {
  group: FileGroup;
  viewMode: DiffViewMode;
  isMonacoReady: boolean;
  isDark: boolean;
  onAcceptPatch: (group: FileGroup, patch: PendingPatch) => void;
  onRejectPatch: (group: FileGroup, patch: PendingPatch) => void;
  onAcceptFile: (group: FileGroup) => void;
  onRejectFile: (group: FileGroup) => void;
  onFocusUnderlyingFile: (tabId: string) => void;
}

const FileReviewView: React.FC<FileReviewViewProps> = ({
  group,
  viewMode,
  isMonacoReady,
  isDark,
  onAcceptPatch,
  onRejectPatch,
  onAcceptFile,
  onRejectFile,
  onFocusUnderlyingFile,
}) => {
  const handleDiffMount: DiffOnMount = useCallback((editor) => {
    // Cast through unknown — we only call shape we control. Importing
    // the full Monaco editor types here would force a hard dep on the
    // `monaco-editor` package which we deliberately avoid.
    const ed = editor as unknown as {
      getOriginalEditor: () => { updateOptions: (o: object) => void };
      getModifiedEditor: () => { updateOptions: (o: object) => void };
    };
    // Both panes are read-only — accept/reject is the only path that
    // mutates buffer state. Keeping the modified pane read-only keeps
    // the review surface honest: no side-channel edits.
    ed.getOriginalEditor().updateOptions({ readOnly: true });
    ed.getModifiedEditor().updateOptions({ readOnly: true });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* File header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-3 py-1.5 text-xs dark:border-neutral-800 dark:bg-neutral-900">
        <FileIcon name={group.tab.name} kind="file" size={14} />
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
          {group.tab.name}
        </span>
        <span className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
          {group.tab.path}
        </span>
        <span className="font-mono text-[11px]">
          {group.additions > 0 && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
              +{group.additions}
            </span>
          )}
          {group.deletions > 0 && (
            <span className="ml-1 text-red-600 dark:text-red-400">
              -{group.deletions}
            </span>
          )}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onFocusUnderlyingFile(group.tab.id)}
            className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            title="Switch to this file in the editor"
          >
            Open file
          </button>
          <button
            type="button"
            onClick={() => onRejectFile(group)}
            className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <X className="h-3 w-3" />
            Reject file
          </button>
          <button
            type="button"
            onClick={() => onAcceptFile(group)}
            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-700"
          >
            <Check className="h-3 w-3" />
            Accept file
          </button>
        </div>
      </div>

      {/* Monaco DiffEditor — gives us VSCode-quality side-by-side or
          inline rendering with full syntax highlighting, hunk
          navigation, and the same minimap users already know. */}
      <div className="relative min-h-0 flex-1">
        {isMonacoReady ? (
          <DiffEditor
            key={group.tab.id}
            height="100%"
            language={group.tab.language}
            theme={isDark ? "vs-dark" : "vs"}
            original={group.tab.content}
            modified={group.proposedContent}
            onMount={handleDiffMount}
            options={{
              renderSideBySide: viewMode === "split",
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
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
            Loading diff editor…
          </div>
        )}
      </div>

      {/* Per-patch list */}
      <div className="flex max-h-[40%] shrink-0 flex-col border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          <ChevronRight className="h-3 w-3" />
          Edits in this file
          <span className="ml-1 rounded bg-neutral-200/70 px-1.5 py-0.5 font-mono text-[10px] normal-case tracking-normal text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {group.patches.length}
          </span>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {group.patches.map((patch, i) => {
            const ok = group.perPatchOk[patch.patchId] !== false;
            const stats = generateUnifiedDiff(patch.search, patch.replace);
            return (
              <li
                key={patch.patchId}
                className="border-t border-neutral-100 dark:border-neutral-800"
              >
                <div className="flex items-center gap-2 px-3 py-1 text-[12px]">
                  <span className="font-mono text-neutral-500 dark:text-neutral-400">
                    edit {i + 1} of {group.patches.length}
                  </span>
                  <span className="font-mono text-[11px]">
                    {stats.additions > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{stats.additions}
                      </span>
                    )}
                    {stats.deletions > 0 && (
                      <span className="ml-1 text-red-600 dark:text-red-400">
                        -{stats.deletions}
                      </span>
                    )}
                  </span>
                  {!ok && (
                    <span
                      className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      title="This patch no longer applies cleanly. Accepting an earlier patch likely changed the surrounding code."
                    >
                      conflict
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onRejectPatch(group, patch)}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => onAcceptPatch(group, patch)}
                      disabled={!ok}
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
                        ok
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "cursor-not-allowed bg-neutral-300 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
                      )}
                    >
                      Accept
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
