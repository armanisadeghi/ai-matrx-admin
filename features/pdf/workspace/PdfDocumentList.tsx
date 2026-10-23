"use client";

/**
 * features/pdf/workspace/PdfDocumentList.tsx — the front door's "Your PDFs": the person's extracted PDF documents
 * (what the extractor studio's sidebar listed), as the platform's one table.
 *
 * Row actions are the shared row verbs (`defineRowVerbs`, lib/entity-list): Open, Rename (the document and its
 * cloud file together), and Archive / Restore, which are also bulk actions on the table's selection (the bulk twin
 * rule: one declaration, row and bar). Archived rows are hidden by default and one click away through the shared
 * `ArchivedDisclosure` (the archived-items law). A row whose original file was removed is not listed (nothing to open).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ExternalLink, FileText, Pencil } from "lucide-react";
import { ArchivedDisclosure, readOf } from "@ai-matrx/design-system";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { useAppDispatch } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { usePdfStudioDocs, type StudioDocSummary } from "@/features/pdf-extractor/studio/hooks/usePdfStudioDocs";
import { PdfDocRenameDialog } from "./PdfDocRenameDialog";
import { renamePdfDocument } from "./renamePdfDocument";

/** Rows the list can show: a root document whose original file is still there. */
export function listablePdfDocs(docs: readonly StudioDocSummary[]): StudioDocSummary[] {
  return docs.filter((d) => d.sourceKind === "cld_file" && !!d.sourceId && !d.sourceMissing);
}

export function PdfDocumentList() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { visible, visibleArchived, loading, error, refresh, deleteDoc, restoreDoc, setDocName } = usePdfStudioDocs();
  const [showArchived, setShowArchived] = useState(false);
  const [renaming, setRenaming] = useState<StudioDocSummary | null>(null);

  const active = useMemo(() => listablePdfDocs(visible), [visible]);
  const archived = useMemo(() => listablePdfDocs(visibleArchived), [visibleArchived]);
  const rows = showArchived ? [...active, ...archived] : active;

  const { rowActionDefs, bulkActions } = defineRowVerbs<StudioDocSummary>(
    [
      {
        id: "open", icon: ExternalLink, label: "Open",
        onClick: (r, e) => { e.stopPropagation(); router.push(`/pdf/${r.sourceId}`); },
        bulk: false, noBulk: "open",
      },
      {
        id: "rename", icon: Pencil, label: "Rename",
        onClick: (r, e) => { e.stopPropagation(); setRenaming(r); },
        bulk: false, noBulk: "single",
      },
      {
        id: "archive", icon: Archive, label: "Archive",
        appliesTo: (r) => !r.archived,
        unavailableTooltip: "Already archived",
        onClick: (r, e) => {
          e.stopPropagation();
          deleteDoc(r.id).then(() => toast.success("Archived"), (err: unknown) => toast.error(err instanceof Error ? err.message : "Archive failed"));
        },
        bulk: {
          done: "Archived",
          runOne: async (id) => { await deleteDoc(id); },
        },
      },
      {
        id: "restore", icon: ArchiveRestore, label: "Restore",
        appliesTo: (r) => r.archived,
        unavailableTooltip: "Not archived",
        onClick: (r, e) => {
          e.stopPropagation();
          restoreDoc(r.id).then(() => toast.success("Restored"), (err: unknown) => toast.error(err instanceof Error ? err.message : "Restore failed"));
        },
        bulk: {
          done: "Restored",
          runOne: async (id) => { await restoreDoc(id); },
        },
      },
    ],
    { noun: "PDF", getRowId: (r) => r.id, getRowName: (r) => r.name },
  );
  const bulk = useTableBulkSelection<StudioDocSummary>({
    noun: "PDF",
    rows,
    getRowId: (r) => r.id,
    getRowName: (r) => r.name,
    actions: bulkActions,
    onRefresh: refresh,
  });

  const columns = useMemo((): MatrxColumnDef<StudioDocSummary>[] => [
    {
      id: "name", accessorKey: "name", header: "Name", width: 320,
      cell: (r) => (
        <Link href={`/pdf/${r.sourceId}`} className="flex min-w-0 items-center gap-2 hover:underline">
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{r.name}</span>
          {r.archived ? <span className="shrink-0 text-xs text-muted-foreground">Archived</span> : null}
        </Link>
      ),
    },
    { id: "totalPages", accessorKey: "totalPages", header: "Pages", width: 90, cell: (r) => <span className="text-xs">{r.totalPages ?? ""}</span> },
    { id: "createdAt", accessorKey: "createdAt", header: "Added", filter: "date", width: 140, cell: (r) => <span className="text-xs">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ], []);

  if (!loading && !error && !active.length && !archived.length) return null;
  return (
    <section className="flex w-full max-w-3xl flex-col gap-2 px-4" data-pdf-document-list="">
      <h2 className="text-sm font-medium">Your PDFs</h2>
      <div className="h-80 min-h-0">
        <MatrxDataTable
          urlState={{ id: "pdf-front-door-docs" }}
          data={rows}
          columns={columns}
          getRowId={(r) => r.id}
          isLoading={loading}
          pageSize={25}
          read={readOf({ loading, error }, { what: "your PDFs", onRetry: refresh })}
          emptyState={{ title: "No PDFs match", description: "Upload one above." }}
          toolbar={{ search: true, searchPlaceholder: "Search your PDFs", refresh: { onRefresh: refresh } }}
          rowActionDefs={rowActionDefs}
          selection={bulk.selection}
        />
      </div>
      <ArchivedDisclosure count={archived.length} open={showArchived} onOpenChange={setShowArchived} />
      <PdfDocRenameDialog
        open={renaming !== null}
        onOpenChange={(o) => { if (!o) setRenaming(null); }}
        currentName={renaming?.name ?? ""}
        onCommit={async (name) => {
          if (!renaming) return;
          const previous = renaming.name;
          setDocName(renaming.id, name);
          try {
            await renamePdfDocument({ docId: renaming.id, sourceKind: renaming.sourceKind, sourceId: renaming.sourceId, newName: name, dispatch });
            refresh();
          } catch (err) {
            setDocName(renaming.id, previous);
            throw err;
          }
        }}
      />
    </section>
  );
}
