"use client";

/**
 * ContentEditorListWindow
 *
 * Variant 2 of 3: a list of documents on the left + exactly one active editor
 * on the right. No tabs — clicking a list item swaps the editor content.
 * Built on the same primitives as `ContentEditorWorkspaceWindow` but with
 * `openIds` pinned to `[activeId]` so only one document is ever "open".
 */

import React, { useCallback, useMemo, useState } from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { ContentEditor } from "@/components/official/content-editor/ContentEditor";
import {
  ContentEditorList,
  type ContentEditorListItem,
} from "@/components/official/content-editor/ContentEditorList";
import { useContentEditorEmitter } from "./useContentEditorEmitter";
import type { ContentEditorSeedDocument } from "./useOpenContentEditorWindow";

export interface ContentEditorListWindowProps {
  windowInstanceId: string;
  callbackGroupId?: string | null;

  documents?: ContentEditorSeedDocument[];
  activeDocumentId?: string | null;
  listTitle?: string | null;
  title?: string | null;

  onClose: () => void;
}

interface InternalDoc extends ContentEditorSeedDocument {}

export function ContentEditorListWindow({
  windowInstanceId,
  callbackGroupId,
  documents: initialDocuments = [],
  activeDocumentId: initialActiveId,
  listTitle,
  title,
  onClose,
}: ContentEditorListWindowProps) {
  const [documents, setDocuments] = useState<InternalDoc[]>(initialDocuments);
  const [activeId, setActiveId] = useState<string | undefined>(
    initialActiveId ?? initialDocuments[0]?.id ?? undefined,
  );

  const { emit } = useContentEditorEmitter(callbackGroupId, windowInstanceId);

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeId),
    [documents, activeId],
  );

  const listItems: ContentEditorListItem[] = useMemo(
    () =>
      documents.map(({ id, title: t, description }) => ({
        id,
        title: t,
        description,
      })),
    [documents],
  );

  const handleItemClick = useCallback(
    (id: string) => {
      setActiveId(id);
      emit({ type: "active-change", documentId: id });
      emit({ type: "open", documentId: id });
    },
    [emit],
  );

  const handleChange = useCallback(
    (next: string) => {
      if (!activeId) return;
      setDocuments((prev) => {
        const out = prev.map((d) =>
          d.id === activeId ? { ...d, value: next } : d,
        );
        emit({
          type: "documents-change",
          documents: out.map(({ id, title: t, value }) => ({
            id,
            title: t,
            value,
          })),
          openIds: activeId ? [activeId] : [],
        });
        return out;
      });
      emit({ type: "change", documentId: activeId, value: next });
    },
    [activeId, emit],
  );

  const handleSave = useCallback(
    async (next: string) => {
      if (!activeId) return;
      emit({ type: "save", documentId: activeId, value: next });
    },
    [activeId, emit],
  );

  const handleModeChange = useCallback(
    (mode: string) => {
      emit({ type: "mode-change", documentId: activeId ?? null, mode });
    },
    [activeId, emit],
  );

  const collectData = useCallback(
    () => ({
      documents,
      activeDocumentId: activeId ?? null,
      listTitle: listTitle ?? null,
      title: title ?? null,
    }),
    [documents, activeId, listTitle, title],
  );

  return (
    <WindowPanel
      id={`content-editor-list-window-${windowInstanceId}`}
      title={title ?? "Content editor"}
      overlayId="contentEditorListWindow"
      minWidth={720}
      minHeight={420}
      width={960}
      height={600}
      position="center"
      onClose={onClose}
      onCollectData={collectData}
      sidebar={
        <div className="flex flex-col min-h-0 h-full">
          <div className="flex-1 min-h-0 p-1.5">
            <ContentEditorList
              items={listItems}
              activeId={activeId}
              openIds={activeId ? [activeId] : []}
              onItemClick={handleItemClick}
              title={listTitle ?? "Documents"}
              className="h-full"
            />
          </div>
        </div>
      }
      sidebarDefaultSize={220}
      sidebarMinSize={160}
      sidebarExpandsWindow
      bodyClassName="p-3"
    >
      {activeDoc ? (
        <ContentEditor
          key={activeDoc.id}
          value={activeDoc.value}
          onChange={handleChange}
          onSave={handleSave}
          onModeChange={handleModeChange}
          title={activeDoc.title}
          showCopyButton
          showContentManager
          className="h-full"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-xs text-zinc-500 dark:text-zinc-400">
          Select a document to edit
        </div>
      )}
    </WindowPanel>
  );
}

export default ContentEditorListWindow;
