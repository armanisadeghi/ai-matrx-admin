"use client";

/**
 * Wires the shared FileItemMenu to one record type's adapter. A list page gives
 * it the adapter once and calls `menuFor(row)` for every card / table row.
 * Trash is the archive (deleted_at), always undoable — never a hard delete.
 */

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { FileItemMenu } from "./FileItemMenu";
import { useFileFavorites } from "./useFileFavorites";
import { copyRecord, moveRecord, renameRecord, restoreRecord, runDownload, trashRecord } from "./ops";
import type { FileKindAdapter } from "./types";

export type { FileKindAdapter } from "./types";

export function useFileItemActions<Row extends { id: string; user_id: string }>(
  adapter: FileKindAdapter<Row>,
  reload: () => void | Promise<void>,
) {
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const { starredIds, isStarred, toggle } = useFileFavorites(adapter.entityType);
  const base = adapter as unknown as FileKindAdapter<{ id: string; user_id: string }>;

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

  return { userId, starredIds, isStarred, menuFor };
}
