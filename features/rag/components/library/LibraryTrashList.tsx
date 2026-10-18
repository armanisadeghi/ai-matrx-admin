"use client";

/**
 * The Source trash as a list — the Knowledge hub's Trash view (KNOWLEDGE-HUB
 * §8 H6a; it replaced the Sources page's Trash sheet). One item per Source
 * (`groupTrashRows`); Restore and Purge go through the same doors the sheet
 * used (`libraryTrash.ts`). Delete means archive: the trash only restores —
 * there is no erase control (retention is a data-lifecycle policy).
 */

import { useCallback, useEffect, useState } from "react";
import { ArchiveRestore, FileText, Loader2 } from "lucide-react";
import { RecordList } from "@ai-matrx/design-system/record-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { restoreFileDirect } from "@/features/files/api/direct";
import { supabase } from "@/utils/supabase/client";
import { ragDb } from "@/utils/supabase/ragDb";
import { groupTrashRows, piecesWords, type TrashRow } from "@/features/rag/components/library/trashGroups";
import {
  listTrash,
  restoreTrashRow,
  type TrashDoors,
} from "@/features/rag/components/library/libraryTrash";

const liveDoors: TrashDoors = {
  rpc: (fn, args) => ragDb(supabase).rpc(fn as never, args as never) as never,
  restoreFile: restoreFileDirect,
};

export function LibraryTrashList({
  filterText,
  onMutated,
  doors = liveDoors,
}: {
  /** Words from the hub's search box narrow the list by name. */
  filterText?: string;
  onMutated?: () => void;
  doors?: TrashDoors;
}) {
  const [rows, setRows] = useState<TrashRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await listTrash(doors));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your trash could not be read.");
      setRows([]);
    }
  }, [doors]);

  useEffect(() => {
    void load();
  }, [load]);

  const after = async () => {
    await load();
    onMutated?.();
  };

  const restore = async (row: TrashRow) => {
    setBusyId(row.id);
    try {
      toast.success(await restoreTrashRow(row, doors));
      await after();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setBusyId(null);
    }
  };

  const words = (filterText ?? "").trim().toLowerCase();
  const groups = groupTrashRows(rows ?? []).filter(
    (g) => !words || `${g.head.name ?? ""} ${g.head.file_name ?? ""}`.toLowerCase().includes(words),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-testid="hub-trash">
      <p className="px-2 type-secondary text-muted-foreground">
        Sources you moved to the trash stay restorable. Documents trashed with their file
        come back together with the file.
      </p>
      <RecordList
        items={groups}
        getKey={(group) => group.key}
        title={(group) => group.head.name ?? group.head.file_name ?? group.head.id}
        leading={() => <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />}
        subtitle={(group) => (
          <span className="flex flex-wrap items-center gap-1.5">
            <span>Trashed {new Date(group.head.deleted_at).toLocaleString()}</span>
            <span>·</span>
            {group.versions > 1 ? (
              <>
                <span>{group.versions} versions</span>
                <span>·</span>
              </>
            ) : null}
            <span>{piecesWords(group.hiddenChunks)}</span>
            {group.head.deleted_via === "file_cascade" ? (
              <Badge variant="outline" className="h-4 px-1 text-[10px]">
                with file
              </Badge>
            ) : null}
          </span>
        )}
        actions={(group) => {
          const row = group.head;
          const busy = busyId === row.id;
          return (
            <Button icon={busy ? <Loader2 className="animate-spin" /> : <ArchiveRestore />} variant="outline" disabled={busy} onClick={() => void restore(row)}>
              {row.deleted_via === "file_cascade" ? "Restore file" : "Restore"}
            </Button>
          );
        }}
        read={{
          status: error ? "error" : rows === null ? "loading" : "ready",
          error: error ?? undefined,
          onRetry: () => void load(),
          what: "your trash",
        }}
        emptyState={
          <p className="px-2 py-6 type-body text-muted-foreground">
            {words ? `Nothing in the trash matches "${filterText?.trim()}".` : "The trash is empty."}
          </p>
        }
        sourceFeature="rag_source"
        ariaLabel="Trash"
        className="min-h-0 flex-1 overflow-y-auto px-1"
      />
    </div>
  );
}
