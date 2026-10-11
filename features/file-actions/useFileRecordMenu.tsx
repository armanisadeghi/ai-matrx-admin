"use client";

/**
 * The editor's File menu, wired to the SAME adapter and ops the lists use.
 * An editor page gives it the adapter + the open record and mounts `menu`
 * (optionally with `extra` rows: Print, Find and replace, Comments…).
 */

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { FileRecordMenu } from "./FileRecordMenu";
import { useFileFavorites } from "./useFileFavorites";
import { copyRecord, moveRecord, restoreRecord, runDownload, trashRecord } from "./ops";
import type { FileDownload, FileKindAdapter } from "./types";

export function useFileRecordMenu<Row extends { id: string; user_id: string }>(
  adapter: FileKindAdapter<Row>,
  row: Row | null,
  options: {
    /** Where "Move to trash" lands. */
    listHref: string;
    extra?: ReactNode;
    /** Formats the editor offers itself (its live content), instead of the saved snapshot. */
    downloads?: FileDownload[];
    onProjectMoved?: (projectId: string | null) => void;
  },
): ReactNode {
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const { isStarred, toggle } = useFileFavorites(adapter.entityType);
  if (!row) return null;
  const base = adapter as unknown as FileKindAdapter<{ id: string; user_id: string }>;
  const name = adapter.nameOf(row);
  const isOwner = userId !== null && row.user_id === userId;

  return (
    <FileRecordMenu
      resourceType={adapter.resourceType}
      id={row.id}
      name={name}
      canManage={isOwner}
      starred={isStarred(row.id)}
      onToggleStar={() => void toggle(row.id)}
      projectId={adapter.projectIdOf(row)}
      downloads={options.downloads ?? adapter.downloads(row.id, name)}
      onDownload={(d) => runDownload(adapter, d)}
      onCopy={async () => {
        // The copy opens straight away, like Docs and Sheets.
        const newId = await copyRecord(base, row.id, name);
        if (newId) router.push(adapter.hrefFor(newId));
      }}
      onMove={async (projectId, projectName) => {
        if (await moveRecord(base, row.id, projectId, projectName)) options.onProjectMoved?.(projectId);
      }}
      onTrash={async () => {
        await trashRecord(base, row.id, name, {
          onTrashed: () => router.push(options.listHref),
          onRestored: () => router.push(adapter.hrefFor(row.id)),
        });
      }}
      extra={options.extra}
    />
  );
}
