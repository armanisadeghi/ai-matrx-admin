"use client";

/**
 * THE library trash list, on the shared table (walk-core 2026-10-18: the drawer was a
 * plain card list — no search, sort or bulk restore). Mounted by the "Library trash"
 * drawer on /knowledge/library and by the /knowledge/trash route; one list, two hosts.
 *
 * One row per SOURCE (`groupTrashRows`): a Source's versions trash and restore together,
 * and a file's cascade family restores through its file.
 *
 * Purge is not offered: `rag.fn_purge_library_document` / `fn_purge_library_file` are
 * service-role only (retention is a lifecycle policy, never a client button) — the same
 * rule /files/trash follows.
 */

import { useEffect, useState } from "react";
import { ArchiveRestore, Trash2 } from "lucide-react";
import {
  MatrxDataTable,
  type MatrxColumnDef,
} from "@ai-matrx/design-system/data-table";
import { Button } from "@ai-matrx/design-system/controls";
import { toast } from "@/lib/toast";
import { restoreFileDirect } from "@/features/files/api/direct";
import { supabase } from "@/utils/supabase/client";
import { ragDb } from "@/utils/supabase/ragDb";
import {
  groupTrashRows,
  piecesWords,
  type TrashGroup,
  type TrashRow,
} from "@/features/rag/components/library/trashGroups";

function groupName(group: TrashGroup): string {
  return group.head.name ?? group.head.file_name ?? group.head.id;
}

/** Restore one trashed item through the door its kind uses. Throws a person-readable error. */
async function restoreGroup(group: TrashGroup): Promise<void> {
  const row = group.head;
  if (row.deleted_via === "file_cascade") {
    // Family restore rides the file — the DB cascade trigger brings the docs + chunks +
    // memberships back in one transaction.
    await restoreFileDirect(row.source_id);
    return;
  }
  const { error } = await ragDb(supabase).rpc("fn_restore_library_document", { p_id: row.id });
  if (error) {
    throw new Error("We couldn't restore this document. You may not be allowed to restore it.");
  }
}

export function LibraryTrashTable({
  tableId,
  onMutated,
}: {
  /** Distinct per host so the drawer and the route keep their own URL state. */
  tableId: string;
  /** Called after a restore so a live list beside it can refresh. */
  onMutated?: () => void;
}) {
  const [rows, setRows] = useState<TrashRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKeys, setBusyKeys] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<string[]>([]);

  const apply = (data: unknown, error: { message: string } | null) => {
    if (error) {
      setLoadError(`Failed to load trash: ${error.message}`);
      setRows([]);
      return;
    }
    setLoadError(null);
    setRows((data ?? []) as TrashRow[]);
  };

  const load = async () => {
    const { data, error } = await ragDb(supabase).rpc("fn_list_library_trash");
    apply(data, error);
  };

  useEffect(() => {
    let cancelled = false;
    void ragDb(supabase)
      .rpc("fn_list_library_trash")
      .then(({ data, error }) => {
        if (!cancelled) apply(data, error);
      });
    return () => {
      cancelled = true;
    };
    // Read once on mount; every restore reads again through `load`.
  }, []);

  const groups = rows ? groupTrashRows(rows) : [];

  const restore = async (targets: TrashGroup[]) => {
    if (targets.length === 0) return;
    setBusyKeys(new Set(targets.map((group) => group.key)));
    let restored = 0;
    const failures: string[] = [];
    for (const group of targets) {
      try {
        await restoreGroup(group);
        restored += 1;
      } catch (err) {
        failures.push(err instanceof Error ? err.message : "Restore failed");
      }
    }
    setBusyKeys(new Set());
    setSelected([]);
    if (restored > 0) {
      toast.success(
        restored === 1 && targets.length === 1 && targets[0]
          ? `Restored "${groupName(targets[0])}"`
          : `Restored ${restored} of ${targets.length}`,
      );
    }
    if (failures.length > 0) {
      toast.error(`${failures.length} could not be restored`, { description: failures[0] });
    }
    await load();
    onMutated?.();
  };

  const columns: MatrxColumnDef<TrashGroup>[] = [
    {
      id: "name",
      header: "Name",
      accessorFn: groupName,
      width: 280,
    },
    {
      id: "deletedAt",
      header: "Trashed",
      accessorFn: (group) => group.head.deleted_at,
      format: { id: "datetime" },
      width: 170,
    },
    {
      id: "versions",
      header: "Versions",
      accessorFn: (group) => group.versions,
      format: { id: "integer" },
      width: 100,
    },
    {
      id: "segments",
      header: "Segments",
      accessorFn: (group) => group.hiddenChunks,
      format: { id: "integer" },
      width: 110,
      cell: (group) => piecesWords(group.hiddenChunks),
    },
    {
      id: "trashedWith",
      header: "Trashed with",
      accessorFn: (group) => (group.head.deleted_via === "file_cascade" ? "Its file" : "On its own"),
      format: { id: "choice" },
      width: 130,
    },
    {
      id: "restore",
      header: "Restore",
      accessorFn: (group) => group.key,
      sortable: false,
      // table-filter-off: the action column; Trashed with filters on the same distinction
      filter: false,
      width: 140,
      cell: (group) => (
        <span onClick={(event) => event.stopPropagation()}>
          <Button
            variant="outline"
            icon={<ArchiveRestore />}
            disabled={busyKeys.has(group.key)}
            onClick={() => void restore([group])}
          >
            {group.head.deleted_via === "file_cascade" ? "Restore file" : "Restore"}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <MatrxDataTable<TrashGroup>
      tableId={tableId}
      data={groups}
      columns={columns}
      getRowId={(group) => group.key}
      read={{
        status: loadError ? "error" : rows ? "ready" : "loading",
        error: loadError,
        onRetry: () => void load(),
        what: "Trash",
      }}
      isLoading={rows === null && !loadError}
      searchText={(group) => `${groupName(group)} ${group.head.file_name ?? ""}`}
      defaultSort={{ id: "deletedAt", direction: "desc" }}
      selection={{
        selectedIds: selected,
        onSelectedIdsChange: setSelected,
        noun: "item",
        actions: (picked) => (
          <Button
            variant="primary"
            icon={<ArchiveRestore />}
            disabled={busyKeys.size > 0}
            onClick={() => void restore(picked)}
          >
            Restore {picked.length}
          </Button>
        ),
      }}
      rowClick="none"
      pageSize={50}
      emptyState={{ icon: <Trash2 />, title: "Trash is empty" }}
    />
  );
}
