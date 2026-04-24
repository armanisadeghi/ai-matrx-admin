"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileIcon } from "../../styles/file-icon";
import {
  ACTIVE_ROW,
  HOVER_ROW,
  ROW_HEIGHT,
  TEXT_BODY,
} from "../../styles/tokens";
import type {
  LibrarySourceAdapter,
  SourceEntry,
  SourceEntryField,
} from "../../library-sources";

interface SourceEntryNodeProps {
  adapter: LibrarySourceAdapter;
  entry: SourceEntry;
  depth: number;
  activeTabId: string | null;
  onOpen: (args: { sourceId: string; rowId: string; fieldId?: string }) => void;
}

/**
 * One entry under a source folder. For single-field sources this
 * renders as a leaf (click → open). For multi-field sources (like
 * `tool_ui_components`) this renders as a collapsible folder whose
 * children are the editable code columns.
 */
export const SourceEntryNode: React.FC<SourceEntryNodeProps> = ({
  adapter,
  entry,
  depth,
  activeTabId,
  onOpen,
}) => {
  const [expanded, setExpanded] = useState(false);

  const fields = entry.fields ?? null;

  const ownTabId = useMemo(() => {
    // Multi-field rows don't map to a single tab — the tab lives on the
    // field leaves. Single-field rows map 1:1 to a tab id.
    if (adapter.multiField) return null;
    try {
      return adapter.makeTabId(entry.rowId);
    } catch {
      return null;
    }
  }, [adapter, entry.rowId]);

  const selfActive = ownTabId !== null && ownTabId === activeTabId;

  const handleClick = useCallback(() => {
    if (adapter.multiField) {
      setExpanded((e) => !e);
      return;
    }
    onOpen({ sourceId: adapter.sourceId, rowId: entry.rowId });
  }, [adapter, entry.rowId, onOpen]);

  return (
    <div className="select-none">
      <div
        role="treeitem"
        aria-expanded={adapter.multiField ? expanded : undefined}
        aria-selected={selfActive}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          "flex items-center gap-1 text-[13px] cursor-pointer rounded-sm",
          ROW_HEIGHT,
          TEXT_BODY,
          HOVER_ROW,
          selfActive && ACTIVE_ROW,
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
        title={entry.description ?? entry.name}
      >
        {adapter.multiField ? (
          <ChevronRight
            size={12}
            className={cn(
              "shrink-0 text-neutral-500 transition-transform",
              expanded && "rotate-90",
              !fields?.length && "opacity-30",
            )}
          />
        ) : (
          <span className="inline-block w-3" />
        )}
        <FileIcon name={entry.name} kind="file" />
        <span className="truncate">{entry.name}</span>
        {entry.badge && (
          <span className="ml-auto rounded bg-neutral-200 px-1 py-0 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {entry.badge}
          </span>
        )}
      </div>

      {adapter.multiField && expanded && fields && fields.length > 0 && (
        <div role="group">
          {fields.map((field) => (
            <SourceFieldLeaf
              key={field.fieldId}
              adapter={adapter}
              entry={entry}
              field={field}
              depth={depth + 1}
              activeTabId={activeTabId}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

interface SourceFieldLeafProps {
  adapter: LibrarySourceAdapter;
  entry: SourceEntry;
  field: SourceEntryField;
  depth: number;
  activeTabId: string | null;
  onOpen: (args: { sourceId: string; rowId: string; fieldId?: string }) => void;
}

const SourceFieldLeaf: React.FC<SourceFieldLeafProps> = ({
  adapter,
  entry,
  field,
  depth,
  activeTabId,
  onOpen,
}) => {
  const leafName = `${field.fieldId}.${field.extension}`;
  const tabId = adapter.makeTabId(entry.rowId, field.fieldId);
  const active = tabId === activeTabId;

  const handleOpen = useCallback(() => {
    onOpen({
      sourceId: adapter.sourceId,
      rowId: entry.rowId,
      fieldId: field.fieldId,
    });
  }, [adapter.sourceId, entry.rowId, field.fieldId, onOpen]);

  return (
    <div
      role="treeitem"
      aria-selected={active}
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      className={cn(
        "flex items-center gap-1 text-[13px] cursor-pointer rounded-sm",
        ROW_HEIGHT,
        TEXT_BODY,
        HOVER_ROW,
        active && ACTIVE_ROW,
        !field.hasContent && "text-neutral-500",
      )}
      style={{ paddingLeft: 8 + depth * 12 }}
      title={
        field.hasContent
          ? `${field.label}: ${leafName}`
          : `${field.label} (empty — click to create)`
      }
    >
      <span className="inline-block w-3" />
      <FileIcon name={leafName} kind="file" />
      <span className="truncate">{field.label}</span>
      {!field.hasContent && (
        <span className="ml-auto text-[10px] italic text-neutral-500">
          empty
        </span>
      )}
    </div>
  );
};
