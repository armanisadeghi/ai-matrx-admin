/**
 * features/files/components/surfaces/desktop/BulkActionsBar.tsx
 *
 * The Files bulk verbs, rendered by the SHARED `EntityBulkActions` inside the
 * table's own selection bar (`MatrxDataTable` `selection.actions`), which owns
 * the count, "Select all N" and Clear. Each verb calls the same files-engine
 * thunk it always did; rows are files OR folders, so every verb resolves the
 * row's record type itself and skips-and-names what it cannot touch
 * (`runPerRow`). The ticks stay in Redux (shortcuts and the agent context read
 * them); `clear` here is `clearSelection`.
 *
 * `ids` is the checked ids, or — after "Select all N" — every item matching
 * the list's current filters.
 */

"use client";

import { useMemo } from "react";
import {
  Download,
  FolderInput,
  Globe,
  Lock,
  Star,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { downloadUrl } from "@ai-matrx/kit/download";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { EntityBulkActions } from "@/lib/entity-list/components/EntityBulkBar";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import type {
  EntityBulkAction,
  EntityBulkSelection,
} from "@/lib/entity-list/selection";
import { promptForValues } from "@/components/dialogs/value-prompts/valuePromptsOpener";
import {
  selectAllFilesMap,
  selectAllFoldersMap,
} from "@/features/files/redux/selectors";
import { clearSelection } from "@/features/files/redux/slice";
import {
  deleteFile as deleteFileThunk,
  deleteFolder as deleteFolderThunk,
  getFileUrl as getFileUrlThunk,
  moveFile as moveFileThunk,
  updateFileMetadata,
  updateFolder as updateFolderThunk,
} from "@/features/files/redux/thunks";
import { openFolderPicker } from "@/features/files/components/pickers/CloudFilesPickerHost";
import { ingestFile } from "@/features/rag/api/ingest";
import { clearFileDocumentCache } from "@/features/files/api/document-lookup";
import { fileUnderTag } from "@/features/knowledge/hub/tags/tagApi";
import type { Visibility } from "@/features/files/types";

const NON_INGESTABLE_MIME_PREFIXES = ["image/", "video/", "audio/"];

const idOf = (id: string) => id;

export function BulkActionsBar({ ids }: { ids: readonly string[] }) {
  const dispatch = useAppDispatch();
  const filesById = useAppSelector(selectAllFilesMap);
  const foldersById = useAppSelector(selectAllFoldersMap);

  const actions = useMemo<EntityBulkAction<string>[]>(() => {
    const isFile = (id: string) => Boolean(filesById[id]);
    const isFolder = (id: string) => Boolean(foldersById[id]);
    const nameOf = (id: string) =>
      filesById[id]?.fileName ?? foldersById[id]?.folderName ?? id;
    const filesOnly = (id: string) =>
      isFile(id) ? null : "Only files can do this — folders are skipped.";
    const count = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

    const visibilityAction = (
      id: string,
      label: string,
      icon: EntityBulkAction<string>["icon"],
      visibility: Visibility,
      sentence: string,
    ): EntityBulkAction<string> => ({
      id,
      label,
      icon,
      confirm:
        visibility === "public"
          ? (sel) => ({
              title: `Make ${count(sel.count)} public?`,
              description: sentence,
              confirmLabel: "Make public",
            })
          : undefined,
      run: (sel) =>
        runPerRow(
          sel,
          async (fid) => {
            if (isFile(fid)) {
              await dispatch(
                updateFileMetadata({ fileId: fid, patch: { visibility } }),
              ).unwrap();
            } else if (isFolder(fid)) {
              await dispatch(
                updateFolderThunk({ folderId: fid, patch: { visibility } }),
              ).unwrap();
            } else {
              throw new Error("No longer in the list.");
            }
          },
          { done: "Visibility set", noun: "item", labelOf: nameOf },
          idOf,
        ),
    });

    return [
      {
        id: "files-download",
        label: "Download",
        icon: Download,
        run: (sel) =>
          runPerRow(
            sel,
            async (fid) => {
              const result = await dispatch(getFileUrlThunk({ fileId: fid }));
              const url = (result as { payload?: { url?: string } } | undefined)
                ?.payload?.url;
              if (!url) throw new Error("No download link came back.");
              downloadUrl(url, filesById[fid]?.fileName ?? "");
            },
            {
              done: "Download started",
              noun: "file",
              labelOf: nameOf,
              skipReason: (fid) =>
                isFile(fid) ? null : "Folders cannot be downloaded.",
            },
            idOf,
          ),
      },
      {
        id: "files-move",
        label: "Move…",
        icon: FolderInput,
        run: async (sel) => {
          const target = await openFolderPicker({
            title: `Move ${count(sel.count)} to folder`,
            description: "Choose a destination folder.",
          });
          // undefined = cancelled (null = root).
          if (target === undefined) return;
          const isDescendantOf = (candidate: string, ancestor: string) => {
            let cursor: string | null = candidate;
            const seen = new Set<string>();
            while (cursor && !seen.has(cursor)) {
              if (cursor === ancestor) return true;
              seen.add(cursor);
              cursor = foldersById[cursor]?.parentId ?? null;
            }
            return false;
          };
          return runPerRow(
            sel,
            async (fid) => {
              if (isFile(fid)) {
                await dispatch(
                  moveFileThunk({ fileId: fid, newParentFolderId: target }),
                ).unwrap();
              } else {
                await dispatch(
                  updateFolderThunk({
                    folderId: fid,
                    patch: { parentId: target },
                  }),
                ).unwrap();
              }
            },
            {
              done: "Moved",
              noun: "item",
              labelOf: nameOf,
              skipReason: (fid) => {
                if (isFolder(fid)) {
                  if (target !== null && isDescendantOf(target, fid))
                    return "A folder cannot move into itself.";
                  if (foldersById[fid]?.parentId === target)
                    return "Already in that folder.";
                }
                return null;
              },
            },
            idOf,
          );
        },
      },
      visibilityAction(
        "files-visibility-private",
        "Private",
        Lock,
        "personal",
        "",
      ),
      visibilityAction(
        "files-visibility-shared",
        "Shared",
        Users,
        "link",
        "",
      ),
      visibilityAction(
        "files-visibility-public",
        "Public",
        Globe,
        "public",
        "Anyone with the link will be able to see them.",
      ),
      {
        id: "files-reprocess",
        label: "Reprocess for Knowledge",
        icon: Star,
        run: (sel) =>
          runPerRow(
            sel,
            async (fid) => {
              await ingestFile(fid);
              clearFileDocumentCache(fid);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("cloud-files:document-processed", {
                    detail: { fileId: fid },
                  }),
                );
              }
            },
            {
              done: "Reprocessed for Knowledge",
              noun: "file",
              labelOf: nameOf,
              skipReason: (fid) => {
                const f = filesById[fid];
                if (!f) return "Folders cannot be reprocessed.";
                if (f.source.kind === "virtual")
                  return "Virtual sources are ingested through their own door.";
                const mime = f.mimeType ?? "";
                if (NON_INGESTABLE_MIME_PREFIXES.some((p) => mime.startsWith(p)))
                  return "No text to extract.";
                return null;
              },
            },
            idOf,
          ),
      },
      {
        id: "files-tag",
        label: "Add tag",
        icon: Tag,
        run: async (sel) => {
          const values = await promptForValues({
            title: `Tag ${count(sel.count)}`,
            description: "A new name creates the tag.",
            submitLabel: "Add tag",
            fields: [{ name: "tag", prompt: "Tag name" }],
          });
          const name = values?.tag?.trim();
          if (!name) return;
          return runPerRow(
            sel,
            async (fid) => {
              await fileUnderTag("file", fid, name);
            },
            {
              done: `Tagged "${name}"`,
              noun: "file",
              labelOf: nameOf,
              skipReason: filesOnly,
            },
            idOf,
          );
        },
      },
      {
        id: "files-trash",
        label: "Move to Trash",
        icon: Trash2,
        variant: "destructive",
        confirm: (sel) => {
          const nFolders = sel.ids.filter(isFolder).length;
          const nFiles = sel.ids.filter(isFile).length;
          return {
            title: `Move ${count(sel.count)} to Trash?`,
            description:
              nFolders > 0 && nFiles > 0
                ? `${nFiles} file${nFiles === 1 ? "" : "s"} and ${nFolders} folder${nFolders === 1 ? "" : "s"} (with all contents) will move to Trash. You can restore them from Trash at any time.`
                : nFolders > 0
                  ? "Folders will be moved to Trash along with all of their contents. You can restore them from Trash at any time."
                  : "These files will move to Trash. You can restore them from Trash at any time.",
            confirmLabel: "Move to Trash",
            variant: "destructive",
          };
        },
        run: (sel) =>
          runPerRow(
            sel,
            async (fid) => {
              if (isFile(fid)) {
                await dispatch(deleteFileThunk({ fileId: fid })).unwrap();
              } else if (isFolder(fid)) {
                await dispatch(deleteFolderThunk({ folderId: fid })).unwrap();
              } else {
                throw new Error("No longer in the list.");
              }
            },
            { done: "Moved to Trash", noun: "item", labelOf: nameOf },
            idOf,
          ),
      },
    ];
  }, [dispatch, filesById, foldersById]);

  if (ids.length === 0) return null;

  const build = (): EntityBulkSelection<string> => ({
    mode: "ids",
    ids: [...ids],
    rows: [...ids],
    count: ids.length,
    filter: {
      scope: { kind: "all" },
      orgId: null,
      search: "",
      deep: false,
      archived: "active",
      filters: {},
    },
  });

  return (
    <EntityBulkActions
      actions={actions}
      selection={{
        build,
        clear: () => {
          dispatch(clearSelection());
        },
        count: ids.length,
      }}
      noun="item"
      onRemoveRows={() => {}}
      onRefresh={() => {}}
    />
  );
}
