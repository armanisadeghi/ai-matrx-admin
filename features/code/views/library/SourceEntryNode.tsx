"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pencil,
  Copy as CopyIcon,
  RefreshCw,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import type {
  ContextMenuExtraItem,
  ContextMenuExtraSection,
} from "@ai-matrx/context-menu/engine";
import { FileIcon } from "../../styles/file-icon";
import {
  ACTIVE_ROW,
  HOVER_ROW,
  TEXT_BODY,
} from "../../styles/tokens";
import type {
  LibrarySourceAdapter,
  SourceEntry,
  SourceEntryField,
} from "../../library-sources/types";
import { Button } from "@/components/ui/button";
import { openContextMenuForElement } from "@ai-matrx/context-menu/engine";
import { copyToClipboard } from "@/lib/clipboard/copy";
import { TREE_ROW_TEXT, TreeDisclosure, treeIndentStyle } from "@/components/official/topic-tree/geometry";

interface SourceEntryNodeProps {
  /** Start open (the one row a focused host is editing). */
  defaultExpanded?: boolean;
  adapter: LibrarySourceAdapter;
  entry: SourceEntry;
  depth: number;
  activeTabId: string | null;
  onOpen: (args: { sourceId: string; rowId: string; fieldId?: string }) => void;
  /**
   * Rename callback supplied by `SourceFolderNode`. Resolves with the
   * canonical name the adapter persisted (after sanitisation). When
   * `null`, the adapter doesn't expose a rename method and the menu
   * item is hidden.
   */
  onRename:
    | ((
        rowId: string,
        newName: string,
        expectedUpdatedAt?: string,
      ) => Promise<void>)
    | null;
  /** Refresh the parent source folder (re-list rows). */
  onRefresh: () => void | Promise<void>;
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
  onRename,
  onRefresh,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(entry.name);
  const [renaming_busy, setRenamingBusy] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);

  // Auto-focus + select the basename portion (so the user can retype the
  // name without retyping the extension).
  useEffect(() => {
    if (!renaming || !renameInputRef.current) return;
    const el = renameInputRef.current;
    el.focus();
    const dot = renameValue.lastIndexOf(".");
    if (dot > 0) el.setSelectionRange(0, dot);
    else el.select();
  }, [renaming]);

  const fields = entry.fields ?? null;

  const ownTabId = useMemo(() => {
    if (adapter.multiField) return null;
    try {
      return adapter.makeTabId(entry.rowId);
    } catch {
      return null;
    }
  }, [adapter, entry.rowId]);

  const selfActive = ownTabId !== null && ownTabId === activeTabId;

  const handleClick = useCallback(() => {
    if (renaming) return;
    if (adapter.multiField) {
      setExpanded((e) => !e);
      return;
    }
    onOpen({ sourceId: adapter.sourceId, rowId: entry.rowId });
  }, [adapter, entry.rowId, onOpen, renaming]);

  const startRename = useCallback(() => {
    if (!onRename) return;
    setRenameValue(entry.name);
    setRenaming(true);
  }, [entry.name, onRename]);

  const cancelRename = useCallback(() => {
    setRenaming(false);
    setRenameValue(entry.name);
  }, [entry.name]);

  const commitRename = useCallback(async () => {
    if (!onRename) {
      cancelRename();
      return;
    }
    const next = renameValue.trim();
    if (!next || next === entry.name) {
      cancelRename();
      return;
    }
    setRenamingBusy(true);
    try {
      await onRename(entry.rowId, next, entry.updatedAt);
    } catch {
      // toast surfaced upstream
    } finally {
      setRenamingBusy(false);
      setRenaming(false);
    }
  }, [
    cancelRename,
    entry.name,
    entry.rowId,
    entry.updatedAt,
    onRename,
    renameValue,
  ]);

  const handleCopyPath = useCallback(() => {
    void copyToClipboard(`${adapter.tabIdPrefix}${entry.rowId}`, "Tab id copied");
  }, [adapter.tabIdPrefix, entry.rowId]);

  const menuItems: ContextMenuExtraItem[] = [];
  if (onRename) {
    menuItems.push({
      kind: "item",
      id: "source-entry-rename",
      label: "Rename",
      icon: Pencil,
      hint: "F2",
      onSelect: startRename,
    });
  }
  menuItems.push(
    {
      kind: "item",
      id: "source-entry-copy-tab-id",
      label: "Copy tab id",
      icon: CopyIcon,
      onSelect: handleCopyPath,
    },
    { kind: "separator", id: "source-entry-sep-1" },
    {
      kind: "item",
      id: "source-entry-refresh",
      label: "Refresh source",
      icon: RefreshCw,
      onSelect: () => void onRefresh(),
    },
  );
  const extraSections: ContextMenuExtraSection[] = [
    { id: "source-entry-actions", anchor: "after-clipboard", items: menuItems },
  ];

  return (
    <div className="select-none">
      <NonEditableContextMenu
        sourceFeature="code-editor"
        contextData={{ content: entry.description ?? entry.name }}
        contentSource={{ type: "raw" }}
        // Library sources span several adapters over different real tables
        // (`adapter.realtimeTable`); only `tool.ui` has a registered
        // EntityTypeToken today, so Attach To / Share light up there and stay
        // dark for the others rather than fabricate an id against a type
        // that doesn't exist.
        entity={
          adapter.realtimeTable?.schema === "tool" &&
          adapter.realtimeTable.table === "ui"
            ? { type: "tool_ui", id: entry.rowId, title: entry.name }
            : undefined
        }
        extraSections={extraSections}
      >
        <div
          ref={rowRef}
          role="treeitem"
          aria-expanded={adapter.multiField ? expanded : undefined}
          aria-selected={selfActive}
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (renaming) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            } else if (e.key === "F2" && onRename) {
              e.preventDefault();
              startRename();
            }
          }}
          className={cn(
            "flex items-center gap-1 rounded-sm",
            "h-7",
            TREE_ROW_TEXT,
            "max-lg:h-11",
            TEXT_BODY,
            !renaming && "cursor-pointer",
            !renaming && HOVER_ROW,
            selfActive && !renaming && ACTIVE_ROW,
            renaming && "bg-card outline outline-1 outline-blue-400",
          )}
          style={treeIndentStyle(depth)}
          title={entry.description ?? entry.name}
        >
          {adapter.multiField ? (
            <TreeDisclosure expandable expanded={expanded} className={!fields?.length ? "opacity-30" : undefined} />
          ) : (
            <TreeDisclosure expandable={false} />
          )}
          <FileIcon name={renaming ? renameValue : entry.name} kind="file" size={16} />
          {renaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  void commitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelRename();
                }
              }}
              onBlur={() => void commitRename()}
              disabled={renaming_busy}
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none"
            />
          ) : (
            <span className="min-w-0 flex-1 truncate">{entry.name}</span>
          )}
          {!renaming && entry.badge && (
            <span className="ml-auto rounded bg-neutral-200 px-1 py-0 type-body font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {entry.badge}
            </span>
          )}
          {!renaming && (
            <Button
              icon={<MoreHorizontal />}
              type="button"
              variant="quiet"
              className="shrink-0 lg:hidden"
              aria-label={`Actions for ${entry.name}`}
              aria-haspopup="menu"
              onClick={(e) => {
                e.stopPropagation();
                openContextMenuForElement(rowRef.current);
              }}
            />
          )}
        </div>
      </NonEditableContextMenu>

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
        "flex items-center gap-1 cursor-pointer rounded-sm",
        "h-7",
        TREE_ROW_TEXT,
        TEXT_BODY,
        HOVER_ROW,
        active && ACTIVE_ROW,
        !field.hasContent && "text-neutral-500",
      )}
      style={treeIndentStyle(depth)}
      title={
        field.hasContent
          ? `${field.label}: ${leafName}`
          : `${field.label} (empty — click to create)`
      }
    >
      <TreeDisclosure expandable={false} />
      <FileIcon name={leafName} kind="file" size={16} />
      <span className="truncate">{field.label}</span>
      {!field.hasContent && (
        <span className="ml-auto type-body italic text-neutral-500">
          empty
        </span>
      )}
    </div>
  );
};
