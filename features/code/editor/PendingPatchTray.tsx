"use client";

/**
 * PendingPatchTray
 *
 * Inline tray (renders directly above the Monaco surface) that surfaces
 * pending AI SEARCH/REPLACE patches grouped by file. Each patch is rendered
 * with the same `SearchReplaceDiffRenderer` the markdown stream uses on the
 * prompt-app side, so the visual language is identical: collapsible block
 * with `+N -M` stats and a 4-line preview that expands to a full unified
 * diff with syntax highlighting.
 *
 * Ownership split:
 *   - This tray is the lightweight in-editor review surface: per-patch and
 *     per-file accept / reject for the currently visible file plus a count
 *     of pending edits in other open files.
 *   - The full multi-file Cursor-style review surface lives behind the
 *     "Open full review" button, which focuses (or opens) the singleton
 *     "AI Review" tab. See `AIReviewSurface`.
 *
 * Apply pipeline:
 *   Accepting a patch (single, file-bulk, or all) feeds through
 *   `applyCodeEdits` → `updateTabContent`, so the existing dirty + save
 *   pipeline writes the change back to disk for cloud / library / sandbox /
 *   mock filesystems uniformly.
 */

import React, { useCallback, useMemo } from "react";
import { Check, ChevronRight, ExternalLink, Sparkles, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { applyCodeEdits } from "@/features/code-editor/agent-code-editor/utils/applyCodeEdits";
import { generateUnifiedDiff } from "@/features/code-editor/agent-code-editor/utils/generateDiff";
import { SearchReplaceDiffRenderer } from "@/components/mardown-display/chat-markdown/diff-blocks/renderers/SearchReplaceDiffRenderer";
import { FileIcon } from "../styles/file-icon";
import {
  selectActiveTabId,
  selectCodeTabs,
  setActiveTab,
  updateTabContent,
} from "../redux/tabsSlice";
// `setActiveTab` is used by individual file-group rows to focus the file
// being reviewed when its header is clicked.
import {
  clearResolvedPatchesForTab,
  markPatchApplied,
  markPatchRejected,
  selectCodePatches,
  type PendingPatch,
} from "../redux/codePatchesSlice";
import { openReviewTab } from "./aiReviewTab";
import type { EditorFile } from "../types";

interface FileGroup {
  tab: EditorFile;
  patches: PendingPatch[];
  additions: number;
  deletions: number;
}

export const PendingPatchTray: React.FC = () => {
  const dispatch = useAppDispatch();
  const tabs = useAppSelector(selectCodeTabs);
  const activeTabId = useAppSelector(selectActiveTabId);
  const patchesState = useAppSelector(selectCodePatches);

  // Build the grouped, derived view in one memo so we don't allocate
  // intermediate arrays inside selectors and trip the inputStabilityCheck
  // warning. The derivation is cheap (≪100 patches) and only runs when
  // the underlying slices change.
  const groups = useMemo<FileGroup[]>(() => {
    const result: FileGroup[] = [];
    for (const [tabId, patches] of Object.entries(patchesState.byTabId)) {
      const tab = tabs.byId[tabId];
      if (!tab) continue;
      const pending = patches.filter((p) => p.status === "pending");
      if (pending.length === 0) continue;
      // Derive +/- stats by applying every pending patch in order — same
      // sequence acceptance uses, so the numbers shown match the actual
      // outcome of "Accept all".
      let working = tab.content;
      for (const patch of pending) {
        const applied = applyCodeEdits(working, [
          { id: patch.patchId, search: patch.search, replace: patch.replace },
        ]);
        if (applied.success && applied.code) working = applied.code;
      }
      const stats = generateUnifiedDiff(tab.content, working);
      result.push({
        tab,
        patches: pending,
        additions: stats.additions,
        deletions: stats.deletions,
      });
    }
    // Active file first so "edits in front of you" is always the top entry.
    result.sort((a, b) => {
      if (a.tab.id === activeTabId) return -1;
      if (b.tab.id === activeTabId) return 1;
      return a.tab.name.localeCompare(b.tab.name);
    });
    return result;
  }, [patchesState.byTabId, tabs.byId, activeTabId]);

  const totalPatches = useMemo(
    () => groups.reduce((acc, g) => acc + g.patches.length, 0),
    [groups],
  );
  const totalAdditions = useMemo(
    () => groups.reduce((acc, g) => acc + g.additions, 0),
    [groups],
  );
  const totalDeletions = useMemo(
    () => groups.reduce((acc, g) => acc + g.deletions, 0),
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

  const dismissResolvedAll = useCallback(() => {
    for (const tabId of Object.keys(patchesState.byTabId)) {
      dispatch(clearResolvedPatchesForTab({ tabId }));
    }
  }, [patchesState.byTabId, dispatch]);

  const openFullReview = useCallback(() => {
    dispatch(openReviewTab());
  }, [dispatch]);

  if (groups.length === 0) return null;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-b",
        "border-emerald-200 bg-emerald-50/60",
        "dark:border-emerald-900/60 dark:bg-emerald-950/30",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
        <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="font-medium text-emerald-900 dark:text-emerald-200">
          {totalPatches} AI {totalPatches === 1 ? "edit" : "edits"} pending
          {groups.length > 1 ? ` across ${groups.length} files` : ""}
        </span>
        <span className="font-mono text-[11px]">
          {totalAdditions > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              +{totalAdditions}
            </span>
          )}
          {totalAdditions > 0 && totalDeletions > 0 && (
            <span className="text-neutral-400 dark:text-neutral-600"> </span>
          )}
          {totalDeletions > 0 && (
            <span className="text-red-600 dark:text-red-400">
              -{totalDeletions}
            </span>
          )}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={openFullReview}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs",
              "border border-emerald-300 bg-white text-emerald-700",
              "hover:bg-emerald-50",
              "dark:border-emerald-700 dark:bg-neutral-900 dark:text-emerald-300",
              "dark:hover:bg-neutral-800",
            )}
            title="Open the multi-file AI Review tab"
          >
            <ExternalLink className="h-3 w-3" />
            Open full review
          </button>
          <button
            type="button"
            onClick={rejectAll}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs",
              "border border-neutral-300 bg-white text-neutral-700",
              "hover:bg-neutral-50",
              "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200",
              "dark:hover:bg-neutral-800",
            )}
          >
            <X className="h-3 w-3" />
            Reject all
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs",
              "border border-emerald-600/60 bg-emerald-600 text-white",
              "hover:bg-emerald-700",
              "dark:border-emerald-500/60 dark:bg-emerald-600",
              "dark:hover:bg-emerald-500",
            )}
          >
            <Check className="h-3 w-3" />
            Accept all
          </button>
          <button
            type="button"
            onClick={dismissResolvedAll}
            title="Clear applied/rejected entries"
            className={cn(
              "ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px]",
              "text-emerald-700/70 hover:text-emerald-900",
              "dark:text-emerald-300/70 dark:hover:text-emerald-200",
            )}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto px-2 pb-2">
        {groups.map((group) => (
          <FileGroupBlock
            key={group.tab.id}
            group={group}
            isActiveFile={group.tab.id === activeTabId}
            onAcceptPatch={acceptPatch}
            onRejectPatch={rejectPatch}
            onAcceptFile={acceptFile}
            onRejectFile={rejectFile}
          />
        ))}
      </div>
    </div>
  );
};

interface FileGroupBlockProps {
  group: FileGroup;
  isActiveFile: boolean;
  onAcceptPatch: (group: FileGroup, patch: PendingPatch) => void;
  onRejectPatch: (group: FileGroup, patch: PendingPatch) => void;
  onAcceptFile: (group: FileGroup) => void;
  onRejectFile: (group: FileGroup) => void;
}

const FileGroupBlock: React.FC<FileGroupBlockProps> = ({
  group,
  isActiveFile,
  onAcceptPatch,
  onRejectPatch,
  onAcceptFile,
  onRejectFile,
}) => {
  const dispatch = useAppDispatch();
  const language = group.tab.language || "typescript";

  const focusFile = useCallback(() => {
    if (!isActiveFile) dispatch(setActiveTab(group.tab.id));
  }, [dispatch, group.tab.id, isActiveFile]);

  return (
    <div
      className={cn(
        "rounded-md border bg-white dark:bg-neutral-950",
        isActiveFile
          ? "border-emerald-300 dark:border-emerald-700"
          : "border-neutral-200 dark:border-neutral-800",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 text-[12px]",
          isActiveFile
            ? "bg-emerald-50/40 dark:bg-emerald-950/30"
            : "bg-neutral-50 dark:bg-neutral-900/60",
        )}
      >
        <button
          type="button"
          onClick={focusFile}
          className="flex flex-1 items-center gap-1.5 truncate text-left text-neutral-800 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-neutral-50"
          title={isActiveFile ? group.tab.path : `Switch to ${group.tab.path}`}
        >
          <ChevronRight className="h-3 w-3 shrink-0 text-neutral-400" />
          <FileIcon name={group.tab.name} kind="file" size={13} />
          <span className="truncate font-medium">{group.tab.name}</span>
          <span className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
            {group.tab.path}
          </span>
        </button>
        <span className="font-mono text-[11px]">
          {group.additions > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              +{group.additions}
            </span>
          )}
          {group.additions > 0 && group.deletions > 0 && (
            <span className="text-neutral-400 dark:text-neutral-600"> </span>
          )}
          {group.deletions > 0 && (
            <span className="text-red-600 dark:text-red-400">
              -{group.deletions}
            </span>
          )}
        </span>
        <span className="rounded bg-neutral-200/70 px-1.5 py-0.5 font-mono text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {group.patches.length} {group.patches.length === 1 ? "edit" : "edits"}
        </span>
        <button
          type="button"
          onClick={() => onRejectFile(group)}
          className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <X className="h-3 w-3" />
          Reject
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

      <ul className="flex flex-col gap-1.5 p-1.5">
        {group.patches.map((patch, i) => (
          <li
            key={patch.patchId}
            className="rounded border border-neutral-200 dark:border-neutral-800"
          >
            <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] dark:border-neutral-800 dark:bg-neutral-900/40">
              <span className="font-mono text-neutral-500 dark:text-neutral-400">
                edit {i + 1} of {group.patches.length}
              </span>
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
                  className="inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  Accept
                </button>
              </span>
            </div>
            <div className="p-1.5">
              <SearchReplaceDiffRenderer
                data={{
                  search: patch.search,
                  replace: patch.replace,
                  searchComplete: true,
                  replaceComplete: true,
                  isComplete: true,
                }}
                language={language}
                isStreamActive={false}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
