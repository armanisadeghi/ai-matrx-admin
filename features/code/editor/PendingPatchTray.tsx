"use client";

/**
 * PendingPatchTray
 *
 * Renders staged AI SEARCH/REPLACE patches for the active tab and lets the
 * user accept or reject them, individually or in bulk. Mirrors the cloud
 * code-editor's review stage — same parser, same applier — so the UX is
 * consistent with what users already trust on the prompt-app side.
 *
 * Lives directly above the Monaco surface so the user always sees the
 * pending changes for the file they're staring at, and never leaves the
 * editor surface to act on them.
 */

import React, { useCallback, useState } from "react";
import { Check, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { applyCodeEdits } from "@/features/code-editor/agent-code-editor/utils/applyCodeEdits";
import { selectActiveTab, updateTabContent } from "../redux/tabsSlice";
import {
  clearResolvedPatchesForTab,
  markPatchApplied,
  markPatchRejected,
  selectPendingPatchesForTab,
  type PendingPatch,
} from "../redux/codePatchesSlice";

export const PendingPatchTray: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectActiveTab);
  const tabId = activeTab?.id ?? null;
  const pendingPatches = useAppSelector(selectPendingPatchesForTab(tabId));
  const [expandedPatchIds, setExpandedPatchIds] = useState<
    Record<string, boolean>
  >({});

  const togglePatch = useCallback((patchId: string) => {
    setExpandedPatchIds((prev) => ({ ...prev, [patchId]: !prev[patchId] }));
  }, []);

  const acceptPatch = useCallback(
    (patch: PendingPatch) => {
      if (!activeTab) return;
      const result = applyCodeEdits(activeTab.content, [
        { id: patch.patchId, search: patch.search, replace: patch.replace },
      ]);
      if (!result.success || !result.code) {
        // Mark as rejected with the applier's first error so the tray
        // stops surfacing it; the user can re-run the agent if needed.
        dispatch(
          markPatchRejected({
            tabId: activeTab.id,
            patchId: patch.patchId,
            reason: result.errors[0] ?? "apply failed",
          }),
        );
        return;
      }
      dispatch(updateTabContent({ id: activeTab.id, content: result.code }));
      dispatch(
        markPatchApplied({ tabId: activeTab.id, patchId: patch.patchId }),
      );
    },
    [activeTab, dispatch],
  );

  const rejectPatch = useCallback(
    (patch: PendingPatch) => {
      if (!activeTab) return;
      dispatch(
        markPatchRejected({
          tabId: activeTab.id,
          patchId: patch.patchId,
          reason: "user rejected",
        }),
      );
    },
    [activeTab, dispatch],
  );

  const acceptAll = useCallback(() => {
    if (!activeTab) return;
    // Apply sequentially so each block sees the result of the previous
    // — matches the contract documented in the SEARCH/REPLACE README.
    let working = activeTab.content;
    const applied: string[] = [];
    const rejectedWithReason: Array<{ patchId: string; reason: string }> = [];
    for (const patch of pendingPatches) {
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
    if (working !== activeTab.content) {
      dispatch(updateTabContent({ id: activeTab.id, content: working }));
    }
    for (const patchId of applied) {
      dispatch(markPatchApplied({ tabId: activeTab.id, patchId }));
    }
    for (const { patchId, reason } of rejectedWithReason) {
      dispatch(markPatchRejected({ tabId: activeTab.id, patchId, reason }));
    }
  }, [activeTab, dispatch, pendingPatches]);

  const rejectAll = useCallback(() => {
    if (!activeTab) return;
    for (const patch of pendingPatches) {
      dispatch(
        markPatchRejected({
          tabId: activeTab.id,
          patchId: patch.patchId,
          reason: "user rejected (bulk)",
        }),
      );
    }
  }, [activeTab, dispatch, pendingPatches]);

  const dismissResolved = useCallback(() => {
    if (!activeTab) return;
    dispatch(clearResolvedPatchesForTab({ tabId: activeTab.id }));
  }, [activeTab, dispatch]);

  if (!activeTab || pendingPatches.length === 0) return null;

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
          {pendingPatches.length} AI{" "}
          {pendingPatches.length === 1 ? "edit" : "edits"} pending
        </span>
        <span className="text-emerald-700/70 dark:text-emerald-300/70">
          for {activeTab.name}
        </span>
        <div className="ml-auto flex items-center gap-1">
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
            onClick={dismissResolved}
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
      <ul className="flex flex-col gap-px border-t border-emerald-200/70 bg-emerald-100/40 dark:border-emerald-900/40 dark:bg-emerald-950/40">
        {pendingPatches.map((patch) => {
          const expanded = !!expandedPatchIds[patch.patchId];
          return (
            <li
              key={patch.patchId}
              className="bg-white/60 dark:bg-neutral-900/40"
            >
              <div className="flex items-center gap-2 px-3 py-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => togglePatch(patch.patchId)}
                  className="flex flex-1 items-center gap-1.5 truncate text-left text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                >
                  {expanded ? (
                    <ChevronUp className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  )}
                  <span className="font-mono">edit {patch.blockIndex + 1}</span>
                  <span className="truncate text-neutral-500 dark:text-neutral-500">
                    {patch.search.split("\n")[0].trim().slice(0, 80)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => rejectPatch(patch)}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => acceptPatch(patch)}
                  className="inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-emerald-700"
                >
                  Accept
                </button>
              </div>
              {expanded && (
                <div className="grid grid-cols-2 gap-px border-t border-neutral-200 bg-neutral-200 text-[11px] dark:border-neutral-800 dark:bg-neutral-800">
                  <div className="bg-rose-50/70 p-2 dark:bg-rose-950/30">
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-rose-700 dark:text-rose-300">
                      Search
                    </div>
                    <pre className="overflow-auto whitespace-pre-wrap font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                      {patch.search}
                    </pre>
                  </div>
                  <div className="bg-emerald-50/70 p-2 dark:bg-emerald-950/30">
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Replace
                    </div>
                    <pre className="overflow-auto whitespace-pre-wrap font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                      {patch.replace || (
                        <span className="italic text-neutral-500">
                          (deletion)
                        </span>
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
