// components/official/content-editor/ContentEditorTabsWithList.tsx
"use client";

import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ContentEditorTabs, type ContentEditorTab } from "./ContentEditorTabs";
import {
  ContentEditorList,
  type ContentEditorListItem,
} from "./ContentEditorList";
import type { ContentEditorProps } from "./types";

type SharedEditorProps = Omit<
  ContentEditorProps,
  | "value"
  | "onChange"
  | "title"
  | "collapsible"
  | "defaultCollapsed"
  | "mode"
  | "onModeChange"
  | "className"
>;

export interface ContentEditorDocument extends ContentEditorListItem {
  value: string;
}

export interface ContentEditorTabsWithListProps extends SharedEditorProps {
  /** All available documents (both open and closed). */
  documents: ContentEditorDocument[];
  onDocumentsChange: (documents: ContentEditorDocument[]) => void;

  /** Ids of documents currently open as tabs. */
  openIds: string[];
  onOpenIdsChange: (ids: string[]) => void;

  /** Currently active (focused) tab id. */
  activeId?: string;
  onActiveIdChange?: (id: string | undefined) => void;

  /** Collapse applies to the whole tab area (not the list). */
  collapsible?: boolean;
  defaultCollapsed?: boolean;

  /** Allow closing tabs (removes from openIds, document stays available in the list). */
  allowCloseTab?: boolean;

  listTitle?: string;
  listWidth?: string; // Tailwind width class
  maxTabTitleLength?: number;
  className?: string;
}

export function ContentEditorTabsWithList({
  documents,
  onDocumentsChange,
  openIds,
  onOpenIdsChange,
  activeId: controlledActiveId,
  onActiveIdChange,
  collapsible,
  defaultCollapsed,
  allowCloseTab = true,
  listTitle = "Documents",
  listWidth = "w-56",
  maxTabTitleLength,
  className,
  ...sharedEditorProps
}: ContentEditorTabsWithListProps) {
  const [internalActiveId, setInternalActiveId] = useState<string | undefined>(
    () => controlledActiveId ?? openIds[0],
  );
  const activeId = controlledActiveId ?? internalActiveId;

  const setActiveId = useCallback(
    (id: string | undefined) => {
      if (controlledActiveId === undefined) setInternalActiveId(id);
      onActiveIdChange?.(id);
    },
    [controlledActiveId, onActiveIdChange],
  );

  // Build the tabs array from openIds (preserving their order).
  const tabs = useMemo<ContentEditorTab[]>(() => {
    return openIds
      .map((id) => {
        const doc = documents.find((d) => d.id === id);
        return doc ? { id: doc.id, title: doc.title, value: doc.value } : null;
      })
      .filter(Boolean) as ContentEditorTab[];
  }, [openIds, documents]);

  // When the user edits a tab's content, flow the change back into documents.
  const handleTabsChange = useCallback(
    (nextTabs: ContentEditorTab[]) => {
      // Detect content edits by id.
      const byId = new Map(nextTabs.map((t) => [t.id, t]));

      // Update document values for any tab whose content changed.
      let docsChanged = false;
      const nextDocs = documents.map((doc) => {
        const t = byId.get(doc.id);
        if (t && t.value !== doc.value) {
          docsChanged = true;
          return { ...doc, value: t.value };
        }
        return doc;
      });

      // Detect close (tabs list shrank).
      const nextOpenIds = nextTabs.map((t) => t.id);
      const openIdsChanged =
        nextOpenIds.length !== openIds.length ||
        nextOpenIds.some((id, i) => openIds[i] !== id);

      if (docsChanged) onDocumentsChange(nextDocs);
      if (openIdsChanged) onOpenIdsChange(nextOpenIds);

      // If the active tab was closed, fall back to the first remaining tab.
      if (activeId && !nextOpenIds.includes(activeId)) {
        setActiveId(nextOpenIds[0]);
      }
    },
    [
      documents,
      onDocumentsChange,
      openIds,
      onOpenIdsChange,
      activeId,
      setActiveId,
    ],
  );

  // List click: open a closed doc (and activate), or activate an already-open one.
  const handleListClick = useCallback(
    (id: string) => {
      if (!openIds.includes(id)) {
        onOpenIdsChange([...openIds, id]);
      }
      setActiveId(id);
    },
    [openIds, onOpenIdsChange, setActiveId],
  );

  const listItems: ContentEditorListItem[] = documents.map(
    ({ id, title, description, icon }) => ({ id, title, description, icon }),
  );

  return (
    <div className={cn("flex gap-3 items-start", className)}>
      <div className={cn("flex-none", listWidth)}>
        <ContentEditorList
          items={listItems}
          activeId={activeId}
          openIds={openIds}
          onItemClick={handleListClick}
          title={listTitle}
        />
      </div>

      <div className="flex-1 min-w-0">
        {tabs.length === 0 ? (
          <div className="flex items-center justify-center h-48 border border-dashed border-border rounded-lg text-xs text-zinc-500 dark:text-zinc-400">
            Select a document from the list to open it.
          </div>
        ) : (
          <ContentEditorTabs
            tabs={tabs}
            onTabsChange={handleTabsChange}
            activeTabId={activeId}
            onActiveTabChange={setActiveId}
            collapsible={collapsible}
            defaultCollapsed={defaultCollapsed}
            allowCloseTab={allowCloseTab}
            maxTabTitleLength={maxTabTitleLength}
            {...sharedEditorProps}
          />
        )}
      </div>
    </div>
  );
}
