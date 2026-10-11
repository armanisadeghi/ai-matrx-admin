"use client";

/**
 * Wires the shared FileItemMenu to one record type's adapter. A list page gives
 * it the adapter once and calls `menuFor(row)` for every card / table row.
 * Trash is the archive (deleted_at), always undoable — never a hard delete.
 */

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { MatrxTableMenuSection } from "@ai-matrx/design-system/data-table";
import { promptForValues } from "@/components/dialogs/value-prompts/ValuePromptsDialogHost";
import { ShareModal } from "@/features/sharing/components/ShareModal";
import { MoveToProjectDialog } from "./MoveToProjectDialog";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { FileItemMenu } from "./FileItemMenu";
import { savedRecordGoogleAdapter } from "@/features/google-workspace/linked/EditorGoogleLinks";
import { useFileFavorites } from "./useFileFavorites";
import { copyRecord, moveRecord, renameRecord, restoreRecord, runDownload, trashRecord } from "./ops";
import type { FileKindAdapter, FileMenuPayload } from "./types";

export type { FileKindAdapter } from "./types";

const noun = (a: { noun: string }) => (a.noun === "workbook" ? "Workbook" : "Document");

export function useFileItemActions<Row extends { id: string; user_id: string }>(
  adapter: FileKindAdapter<Row>,
  reload: () => void | Promise<void>,
) {
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const { starredIds, isStarred, toggle } = useFileFavorites(adapter.entityType);
  const base = adapter as unknown as FileKindAdapter<{ id: string; user_id: string }>;
  // Dialogs opened from a right-click menu live here (the table's menu unmounts on select).
  const [dialog, setDialog] = useState<{ kind: "share" | "move"; row: Row } | null>(null);

  /** The right-click section of a table row — the same actions as the row's ⋯ menu. */
  const sectionsFor = (payload: FileMenuPayload<Row>, trashed = false): MatrxTableMenuSection[] => {
    if (payload.level !== "row" && payload.level !== "cell") return [];
    const row = payload.row;
    const name = adapter.nameOf(row);
    const canManage = userId !== null && row.user_id === userId;
    if (trashed) {
      return canManage
        ? [{
            id: "file",
            title: noun(adapter),
            primary: true,
            items: [{
              id: "restore",
              label: "Restore",
              onSelect: () => void restoreRecord(base, row.id, name).then((ok) => ok && void reload()),
            }],
          }]
        : [];
    }
    const items: MatrxTableMenuSection["items"] = [
      { id: "share", label: "Share", icon: "link", onSelect: () => setDialog({ kind: "share", row }) },
      { id: "open", label: "Open in new tab", onSelect: () => window.open(adapter.hrefFor(row.id), "_blank", "noopener") },
      { id: "star", label: isStarred(row.id) ? "Remove star" : "Star", onSelect: () => void toggle(row.id) },
    ];
    if (canManage)
      items.push({
        id: "rename",
        label: "Rename",
        icon: "pencil",
        onSelect: () =>
          void promptForValues({
            title: "Rename",
            submitLabel: "Rename",
            fields: [{ name: "name", prompt: "Name", defaultValue: name, required: true }],
          }).then(async (answers) => {
            const next = answers?.name?.trim();
            if (next && next !== name && (await renameRecord(base, row.id, next))) void reload();
          }),
      });
    items.push({
      id: "copy",
      label: "Make a copy",
      icon: "copy",
      onSelect: () =>
        void copyRecord(base, row.id, name, (id) => router.push(adapter.hrefFor(id))).then((id) => id && void reload()),
    });
    if (canManage) items.push({ id: "move", label: "Move to project", onSelect: () => setDialog({ kind: "move", row }) });
    for (const d of adapter.downloads(row.id, name))
      items.push({ id: `dl-${d.label}`, label: `Download ${d.label}`, icon: "arrow-down-to-line", onSelect: () => void runDownload(adapter, d) });
    if (canManage)
      items.push({
        id: "trash",
        label: "Move to trash",
        icon: "trash",
        destructive: true,
        separatorBefore: true,
        onSelect: () =>
          void trashRecord(base, row.id, name, { onTrashed: () => void reload(), onRestored: () => void reload() }),
      });
    return [{ id: "file", title: noun(adapter), primary: true, items }];
  };

  const dialogs: ReactNode = dialog && (
    dialog.kind === "share" ? (
      <ShareModal
        isOpen
        onClose={() => setDialog(null)}
        resourceType={adapter.resourceType}
        resourceId={dialog.row.id}
        resourceName={adapter.nameOf(dialog.row)}
      />
    ) : (
      <MoveToProjectDialog
        name={adapter.nameOf(dialog.row)}
        currentProjectId={adapter.projectIdOf(dialog.row)}
        onClose={() => setDialog(null)}
        onMove={async (projectId, projectName) => {
          if (await moveRecord(base, dialog.row.id, projectId, projectName)) void reload();
        }}
      />
    )
  );

  const menuFor = (row: Row, trashed = false): ReactNode => {
    const name = adapter.nameOf(row);
    return (
      <FileItemMenu
        resourceType={adapter.resourceType}
        id={row.id}
        name={name}
        href={adapter.hrefFor(row.id)}
        canManage={userId !== null && row.user_id === userId}
        starred={isStarred(row.id)}
        trashed={trashed}
        projectId={adapter.projectIdOf(row)}
        google={
          userId !== null && row.user_id === userId
            ? { adapter: savedRecordGoogleAdapter(adapter.noun, row.id, name), editable: true }
            : undefined
        }
        downloads={adapter.downloads(row.id, name)}
        onDownload={(d) => runDownload(adapter, d)}
        onToggleStar={() => void toggle(row.id)}
        onRename={async (next) => {
          if (await renameRecord(base, row.id, next)) void reload();
        }}
        onCopy={async () => {
          const newId = await copyRecord(base, row.id, name, (id) => router.push(adapter.hrefFor(id)));
          if (newId) void reload();
        }}
        onMove={async (projectId, projectName) => {
          if (await moveRecord(base, row.id, projectId, projectName)) void reload();
        }}
        onTrash={async () => {
          await trashRecord(base, row.id, name, { onTrashed: () => void reload(), onRestored: () => void reload() });
        }}
        onRestore={async () => {
          if (await restoreRecord(base, row.id, name)) void reload();
        }}
      />
    );
  };

  return { userId, starredIds, isStarred, menuFor, sectionsFor, dialogs };
}
