"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveTabId } from "../../redux/tabsSlice";
import { HOVER_ROW, ROW_HEIGHT, TEXT_BODY } from "../../styles/tokens";
import type { LibrarySourceAdapter } from "../../library-sources/types";
import { useLibrarySource } from "../../hooks/useLibrarySource";
import { useOpenSourceEntry } from "../../hooks/useOpenSourceEntry";
import { SourceEntryNode } from "./SourceEntryNode";

interface SourceFolderNodeProps {
  adapter: LibrarySourceAdapter;
  depth: number;
  /** When true, the branch auto-loads its entries on first mount. We
   *  leave this off by default so the Library panel stays cheap to
   *  open — the user pays for a source only when they expand it. */
  autoLoad?: boolean;
}

/**
 * Top-level library tree root for a single adapter. Lazy-loads entries
 * on first expand, caches them in a local hook, and renders one
 * `SourceEntryNode` per row.
 */
export const SourceFolderNode: React.FC<SourceFolderNodeProps> = ({
  adapter,
  depth,
  autoLoad = false,
}) => {
  const activeTabId = useAppSelector(selectActiveTabId);
  const openEntry = useOpenSourceEntry();
  const { entries, status, error, load, reload } = useLibrarySource(
    adapter.sourceId,
  );
  const [expanded, setExpanded] = useState(autoLoad);

  useEffect(() => {
    if (expanded && status === "idle") {
      void load();
    }
  }, [expanded, status, load]);

  const toggle = useCallback(() => setExpanded((e) => !e), []);

  const handleOpen = useCallback(
    (args: { sourceId: string; rowId: string; fieldId?: string }) => {
      void openEntry(args);
    },
    [openEntry],
  );

  const Icon = adapter.icon;

  const handleReload = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await reload();
    },
    [reload],
  );

  return (
    <div className="select-none">
      <div
        role="treeitem"
        aria-expanded={expanded}
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={cn(
          "group flex items-center gap-1 text-[13px] cursor-pointer rounded-sm",
          ROW_HEIGHT,
          TEXT_BODY,
          HOVER_ROW,
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
        title={adapter.label}
      >
        <ChevronRight
          size={12}
          className={cn(
            "shrink-0 text-neutral-500 transition-transform",
            expanded && "rotate-90",
          )}
        />
        <Icon size={14} className="shrink-0 text-purple-500" />
        <span className="truncate">{adapter.label}</span>
        {status === "ready" && (
          <span className="ml-1 text-[10px] text-neutral-500">
            {entries.length}
          </span>
        )}
        {status === "ready" && (
          <button
            type="button"
            onClick={handleReload}
            className="ml-auto hidden shrink-0 rounded-sm p-0.5 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800 group-hover:inline-flex dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title="Refresh"
            aria-label={`Refresh ${adapter.label}`}
          >
            <RefreshCw
              size={11}
              className={status !== "ready" ? "animate-spin" : undefined}
            />
          </button>
        )}
      </div>

      {expanded && (
        <div role="group">
          {status === "loading" && (
            <div
              className="text-[11px] text-neutral-500"
              style={{ paddingLeft: 8 + (depth + 1) * 12 }}
            >
              Loading…
            </div>
          )}
          {status === "error" && (
            <div
              className="flex flex-col gap-1 text-[11px]"
              style={{ paddingLeft: 8 + (depth + 1) * 12 }}
            >
              <span className="text-red-500">Failed to load</span>
              <span className="text-neutral-500">{error}</span>
              <button
                type="button"
                className="self-start rounded-sm bg-neutral-200 px-2 py-0.5 font-medium text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                onClick={() => void reload()}
              >
                Retry
              </button>
            </div>
          )}
          {status === "ready" && entries.length === 0 && (
            <div
              className="text-[11px] text-neutral-500"
              style={{ paddingLeft: 8 + (depth + 1) * 12 }}
            >
              No {adapter.label.toLowerCase()} yet.
            </div>
          )}
          {status === "ready" &&
            entries.map((entry) => (
              <SourceEntryNode
                key={entry.rowId}
                adapter={adapter}
                entry={entry}
                depth={depth + 1}
                activeTabId={activeTabId ?? null}
                onOpen={handleOpen}
              />
            ))}
        </div>
      )}
    </div>
  );
};
