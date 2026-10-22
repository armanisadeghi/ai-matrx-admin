/**
 * DocumentHistoryViewer — read-only audit log for a single document.
 *
 * Mirror of `WorkbookHistoryViewer`. Lists snapshots newest-first with a
 * Restore button that writes a NEW snapshot row labeled "Restored from <id>",
 * then shows it in the open editor and its collab peers through the one
 * content-replacement door (`@ai-matrx/office/univer openEditorContent`).
 */
"use client";

import { formatRelativeTime } from "@/utils/datetime";
import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  History,
  Loader2,
  Pencil,
  RotateCcw,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@ai-matrx/design-system";
import { toast } from "@/components/ui/use-toast";
import { operationFailed } from "@/utils/errors";
import { recordUnavailable } from "@/lib/records/recordUnavailable";

import { listDocumentSnapshots } from "@ai-matrx/office/docs";
import { isServiceFailure } from "@/features/data-tables/types";
import { type DocumentSnapshot } from "@ai-matrx/office/core";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { ErrorNotice } from "@ai-matrx/design-system";

type Props = {
  documentId: string | null | undefined;
  /** Hide the Restore button when viewer is read-only. */
  editable?: boolean;
  /** The name shown in the tab header; Restore buttons name it. */
  subjectName?: string | null;
  /** Asked at the moment Restore is pressed: false when this is no longer the open document. */
  canRestore?: () => boolean;
};

export function DocumentHistoryViewer({ documentId, editable = true, subjectName = null, canRestore }: Props) {
  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    const res = await listDocumentSnapshots(documentId);
    if (isServiceFailure(res)) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setSnapshots(res.data);
    setError(null);
    setLoading(false);
  }, [documentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRestore = useCallback(
    async (snapshotId: string) => {
      if (!documentId) return;
      // Restore acts on the document in this tab's header and on no other: refuse when it is not the open one.
      if (canRestore && !canRestore()) {
        toast({
          title: "Not restored",
          description: `${subjectName ? `“${subjectName}”` : "This document"} is not the open document, so nothing was changed.`,
          variant: "destructive",
        });
        return;
      }
      setRestoringId(snapshotId);

      // Re-fetch the heavy snapshot column on demand (list intentionally
      // omits it to keep the listing payload small).
      const { supabase } = await import("@/utils/supabase/client");
      const { data: full, error: fetchErr } = await supabase
        .schema("workbench")
        .from("udt_document_snapshots")
        .select("snapshot, label, created_at")
        .eq("id", snapshotId)
        .single();

      if (fetchErr || !full) {
        toast({
          title: "Could not load snapshot",
          description: fetchErr
            ? operationFailed("load that snapshot", fetchErr).message
            : recordUnavailable({
                entity: "snapshot",
                reason: "unknown",
                recordId: snapshotId,
                relation: "workbench.udt_document_snapshots",
              }).message,
          variant: "destructive",
        });
        setRestoringId(null);
        return;
      }

      // THE one restore (office `restoreDocumentSnapshot`): open here, the editor takes it; not open here but the
      // document has a co-editing room, `collab_replace` reloads every open seat; no room, a saved row.
      try {
        const { restoreDocumentSnapshot } = await import("@ai-matrx/office/univer/collab");
        await restoreDocumentSnapshot({
          documentId,
          snapshot: full.snapshot,
          label: restoredLabel(full.label, full.created_at),
        });
      } catch (err) {
        setRestoringId(null);
        toast({
          title: "Could not restore",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
        void reload();
        return;
      }
      setRestoringId(null);
      toast({ title: "Restored snapshot", variant: "success" });
      void reload();
    },
    [reload, documentId, canRestore, subjectName],
  );

  if (!documentId) {
    return (
      <EmptyState
        icon={<History className="size-4" />}
        title="No document selected"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorNotice
        className="m-4"
        title="Could not load history"
        error={error}
        operation="Load this history"
      />
    );
  }

  if (snapshots.length === 0) {
    return (
      <EmptyState
        icon={<History className="size-4" />}
        title="No saves yet"
        description="Edits autosave after 2.5s of idle. Use 'Save now' to create a labeled snapshot."
      />
    );
  }

  const [current, ...rest] = snapshots;

  return (
    <div className="flex flex-col gap-2">
      <SnapshotRow
        snapshot={current}
        isCurrent
        editable={false}
        restoringId={restoringId}
        onRestore={handleRestore}
        subjectName={subjectName}
      />
      {rest.length > 0 && (
        <div className="text-xs uppercase tracking-wider text-muted-foreground px-1 pt-2">
          History
        </div>
      )}
      {rest.map((s) => (
        <SnapshotRow
          key={s.id}
          snapshot={s}
          isCurrent={false}
          editable={editable}
          restoringId={restoringId}
          onRestore={handleRestore}
        subjectName={subjectName}
        />
      ))}
    </div>
  );
}

function SnapshotRow({
  snapshot,
  isCurrent,
  editable,
  restoringId,
  onRestore,
  subjectName,
}: {
  snapshot: DocumentSnapshot;
  isCurrent: boolean;
  editable: boolean;
  restoringId: string | null;
  onRestore: (id: string) => void;
  subjectName?: string | null;
}) {
  return (
    <div
      className={`rounded-md border border-border bg-card p-3 text-sm ${
        isCurrent ? "ring-1 ring-primary/30" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <OriginBadge origin={snapshot.origin} />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" /> {formatTimestamp(snapshot.created_at)} ({formatRelativeTime(snapshot.created_at, { style: "long" })})
          </span>
          {isCurrent && (
            <Badge variant="outline" className="text-xs">
              Current
            </Badge>
          )}
        </div>
        {!isCurrent && editable && (
          <Button
            icon={restoringId === snapshot.id ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RotateCcw />
            )}
            variant="quiet"
            disabled={restoringId !== null}
            onClick={() => onRestore(snapshot.id)}
            title={subjectName ? `Restore this version of “${subjectName}”` : "Restore this snapshot as the new current state"}
          >
            Restore
          </Button>
        )}
      </div>
      {snapshot.label && (
        <div className="mt-1 text-xs text-muted-foreground truncate">
          {snapshot.label}
        </div>
      )}
    </div>
  );
}

function OriginBadge({ origin }: { origin: string }) {
  switch (origin) {
    case "manual":
      return (
        <Badge variant="secondary" className="gap-1">
          <Pencil className="size-3" /> Manual
        </Badge>
      );
    case "imported":
      return (
        <Badge variant="secondary" className="gap-1">
          <Upload className="size-3" /> Imported
        </Badge>
      );
    case "restore":
    case "restored":
      return (
        <Badge variant="secondary" className="gap-1">
          <RotateCcw className="size-3" /> Restored
        </Badge>
      );
    case "autosave":
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <AGENT_ICON className="size-3" /> Autosave
        </Badge>
      );
  }
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md bg-muted p-6 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && (
        <div className="text-xs text-muted-foreground">{description}</div>
      )}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** What a restore is labeled: the version's own label, else when it was saved. Never a raw id. */
export function restoredLabel(label: string | null | undefined, createdAt: string | null | undefined): string {
  if (label) return `Restored from ${label}`;
  return createdAt ? `Restored from the version saved ${formatTimestamp(createdAt)}` : "Restored from an earlier version";
}
