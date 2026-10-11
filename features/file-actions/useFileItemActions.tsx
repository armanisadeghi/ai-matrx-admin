"use client";

/**
 * Wires the shared FileItemMenu to one record type's service doors. A list page
 * gives it the adapter once and calls `menuFor(row)` for every card / table row.
 * Trash is the archive (deleted_at), always undoable — never a hard delete.
 */

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import type { ResourceType } from "@/utils/permissions/types";
import { isServiceFailure, type ServiceResult } from "@/features/data-tables/types";
import { FileItemMenu } from "./FileItemMenu";
import { useFileFavorites, type FileEntityType } from "./useFileFavorites";

type Result<T> = ServiceResult<T>;

export type FileKindAdapter<Row extends { id: string; user_id: string }> = {
  noun: "workbook" | "document";
  resourceType: ResourceType;
  entityType: FileEntityType;
  nameOf: (row: Row) => string;
  hrefFor: (id: string) => string;
  rename: (id: string, name: string) => Promise<Result<unknown>>;
  copy: (id: string, name: string) => Promise<Result<{ id: string }>>;
  trash: (id: string) => Promise<Result<unknown>>;
  restore: (id: string) => Promise<Result<unknown>>;
};

export function useFileItemActions<Row extends { id: string; user_id: string }>(
  adapter: FileKindAdapter<Row>,
  reload: () => void | Promise<void>,
) {
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const { starredIds, isStarred, toggle } = useFileFavorites(adapter.entityType);
  const { noun } = adapter;

  const fail = (what: string, error: string): void => {
    toast.error(`Could not ${what} this ${noun}`, { description: error });
  };

  const restore = async (row: Row) => {
    const res = await adapter.restore(row.id);
    if (isServiceFailure(res)) {
      fail("restore", res.error);
      return;
    }
    toast.success(`Restored "${adapter.nameOf(row)}"`);
    void reload();
  };

  const trash = async (row: Row) => {
    const res = await adapter.trash(row.id);
    if (isServiceFailure(res)) {
      fail("move to trash", res.error);
      return;
    }
    toast.success(`Moved "${adapter.nameOf(row)}" to trash`, {
      action: { label: "Undo", onClick: () => void restore(row) },
    });
    void reload();
  };

  const menuFor = (row: Row, trashed = false): ReactNode => (
    <FileItemMenu
      resourceType={adapter.resourceType}
      id={row.id}
      name={adapter.nameOf(row)}
      href={adapter.hrefFor(row.id)}
      canManage={userId !== null && row.user_id === userId}
      starred={isStarred(row.id)}
      trashed={trashed}
      onToggleStar={() => void toggle(row.id)}
      onRename={async (name) => {
        const res = await adapter.rename(row.id, name);
        if (isServiceFailure(res)) {
      fail("rename", res.error);
      return;
    }
        void reload();
      }}
      onCopy={async () => {
        const res = await adapter.copy(row.id, `Copy of ${adapter.nameOf(row)}`);
        if (isServiceFailure(res)) {
      fail("copy", res.error);
      return;
    }
        toast.success("Copy created", {
          action: {
            label: "Open",
            onClick: () => router.push(adapter.hrefFor(res.data.id)),
          },
        });
        void reload();
      }}
      onTrash={() => trash(row)}
      onRestore={() => restore(row)}
    />
  );

  return { userId, starredIds, isStarred, menuFor };
}
