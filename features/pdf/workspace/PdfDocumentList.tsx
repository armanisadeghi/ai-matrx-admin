"use client";

/**
 * features/pdf/workspace/PdfDocumentList.tsx — the front door's "Your PDFs": the person's PDF FILES (not processed
 * documents), as the platform's one table. A PDF is listed the moment it is uploaded; "Text" says whether its text
 * has been extracted ("Text ready" / "Not extracted"). Rows come from `pdfFileRows` over the cloud-files tree.
 *
 * Row actions are the shared row verbs (`defineRowVerbs`, lib/entity-list): Open, Rename (the file, and its
 * processed document when one exists), and Archive / Restore (the file's trash), also bulk actions on the table's
 * selection. Archived rows are hidden by default and one click away through the shared `ArchivedDisclosure`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ExternalLink, FileText, Pencil } from "lucide-react";
import { ArchivedDisclosure, readOf } from "@ai-matrx/design-system";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { toast } from "@/lib/toast";
import { supabase } from "@/utils/supabase/client";
import { filesDb } from "@/features/files/filesDb";
import { selectAllFilesMap } from "@/features/files/redux/selectors";
import { deleteFile, loadTrash, restoreFile } from "@/features/files/redux/thunks";
import { useTreeReadStatus } from "@/features/files/hooks/useFilesReadStatus";
import { useShowSystemFiles } from "@/features/files/hooks/useShowSystemFiles";
import { PdfDocRenameDialog } from "./PdfDocRenameDialog";
import { renamePdfFile } from "./renamePdfDocument";
import { PDF_TEXT_STATUS_LABEL, pdfFileRows, splitByArchive, type PdfFileDoc, type PdfFileRow } from "./pdfFileRows";
import { usePdfFileDocs } from "./usePdfFileDocs";

const NO_DOCS: ReadonlyMap<string, PdfFileDoc> = new Map();
const NO_ROWS: PdfFileRow[] = [];

export function PdfDocumentList() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const filesById = useAppSelector(selectAllFilesMap);
  const { showSystemFiles } = useShowSystemFiles();
  const { status, error, retry } = useTreeReadStatus();
  const [showArchived, setShowArchived] = useState(false);
  const [trashLoaded, setTrashLoaded] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const [renaming, setRenaming] = useState<PdfFileRow | null>(null);

  const pdfIds = useMemo(
    () => pdfFileRows(filesById, NO_DOCS, { showSystemFiles }).filter((r) => !r.archived).map((r) => r.id),
    [filesById, showSystemFiles],
  );
  const { docs, refresh: refreshDocs, setDocName } = usePdfFileDocs(pdfIds);
  const all = useMemo(() => pdfFileRows(filesById, docs, { showSystemFiles }), [filesById, docs, showSystemFiles]);
  const { active, archived } = useMemo(() => splitByArchive(all), [all]);
  // Archived rows never mix into the active list: they sit under the Archived disclosure, in their own table.
  const rows = active;
  const archivedRows = showArchived ? archived : NO_ROWS;
  const archivedCount = trashLoaded ? archived.length : trashCount;

  // The archived count up front (a head count, no rows); the rows themselves load when the disclosure opens.
  useEffect(() => {
    if (!userId) return;
    let live = true;
    void filesDb(supabase)
      .from("files")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId)
      .eq("mime_type", "application/pdf")
      .not("deleted_at", "is", null)
      .then(({ count }) => { if (live) setTrashCount(count ?? 0); });
    return () => { live = false; };
  }, [userId]);

  const loadArchived = useCallback(async () => {
    if (!userId) return;
    await dispatch(loadTrash({ userId })).unwrap();
    setTrashLoaded(true);
  }, [dispatch, userId]);
  const onShowArchived = (open: boolean) => {
    setShowArchived(open);
    if (open && !trashLoaded) loadArchived().catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not load archived PDFs"));
  };
  const afterArchive = async () => {
    setTrashCount((n) => n + 1);
    if (trashLoaded) await loadArchived();
  };

  const { rowActionDefs, bulkActions } = defineRowVerbs<PdfFileRow>(
    [
      {
        id: "open", icon: ExternalLink, label: "Open",
        onClick: (r, e) => { e.stopPropagation(); router.push(`/pdf/${r.id}`); },
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
          dispatch(deleteFile({ fileId: r.id })).unwrap().then(() => { toast.success("Archived"); return afterArchive(); }, (err: unknown) => toast.error(err instanceof Error ? err.message : "Archive failed"));
        },
        bulk: {
          done: "Archived",
          runOne: async (id) => { await dispatch(deleteFile({ fileId: id })).unwrap(); await afterArchive(); },
        },
      },
      {
        id: "restore", icon: ArchiveRestore, label: "Restore",
        appliesTo: (r) => r.archived,
        unavailableTooltip: "Not archived",
        onClick: (r, e) => {
          e.stopPropagation();
          dispatch(restoreFile({ fileId: r.id })).unwrap().then(() => { setTrashCount((n) => Math.max(0, n - 1)); toast.success("Restored"); }, (err: unknown) => toast.error(err instanceof Error ? err.message : "Restore failed"));
        },
        bulk: {
          done: "Restored",
          runOne: async (id) => { await dispatch(restoreFile({ fileId: id })).unwrap(); setTrashCount((n) => Math.max(0, n - 1)); },
        },
      },
    ],
    { noun: "PDF", getRowId: (r) => r.id, getRowName: (r) => r.name },
  );
  const bulk = useTableBulkSelection<PdfFileRow>({
    noun: "PDF",
    rows,
    getRowId: (r) => r.id,
    getRowName: (r) => r.name,
    actions: bulkActions,
    onRefresh: refreshDocs,
  });
  const bulkArchived = useTableBulkSelection<PdfFileRow>({
    noun: "PDF",
    rows: archivedRows,
    getRowId: (r) => r.id,
    getRowName: (r) => r.name,
    actions: bulkActions,
    onRefresh: refreshDocs,
  });

  const columns = useMemo((): MatrxColumnDef<PdfFileRow>[] => [
    {
      id: "name", accessorKey: "name", header: "Name", width: 240,
      cell: (r) => (
        <Link href={`/pdf/${r.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{r.name}</span>
        </Link>
      ),
    },
    { id: "textStatus", accessorFn: (r) => PDF_TEXT_STATUS_LABEL[r.textStatus], header: "Text", width: 110, cell: (r) => <span className="text-xs">{PDF_TEXT_STATUS_LABEL[r.textStatus]}</span> },
    { id: "totalPages", accessorKey: "totalPages", header: "Pages", width: 70, cell: (r) => <span className="text-xs">{r.totalPages ?? ""}</span> },
    { id: "createdAt", accessorKey: "createdAt", header: "Added", filter: "date", width: 130, cell: (r) => <span className="text-xs">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ], []);

  const loading = status === "loading";
  if (status === "ready" && !active.length && !archivedCount) return null;
  return (
    <section className="flex w-full max-w-4xl flex-col gap-2 px-4" data-pdf-document-list="">
      <h2 className="text-sm font-medium">Your PDFs</h2>
      <div className="h-80 min-h-0">
        <MatrxDataTable
          urlState={{ id: "pdf-front-door-docs" }}
          data={rows}
          columns={columns}
          getRowId={(r) => r.id}
          isLoading={loading}
          pageSize={25}
          read={readOf({ loading, error: status === "error" ? (error ?? "Could not load your files") : null }, { what: "your PDFs", onRetry: retry })}
          emptyState={{ title: "No PDFs match", description: "Upload one above." }}
          toolbar={{ search: true, searchPlaceholder: "Search your PDFs", refresh: { onRefresh: retry } }}
          rowActionDefs={rowActionDefs}
          selection={bulk.selection}
        />
      </div>
      <ArchivedDisclosure count={archivedCount} open={showArchived} onOpenChange={onShowArchived} />
      {showArchived ? (
        <div className="h-64 min-h-0" data-pdf-archived-list="">
          <MatrxDataTable
            urlState={{ id: "pdf-front-door-docs-archived" }}
            data={archivedRows}
            columns={columns}
            getRowId={(r) => r.id}
            isLoading={!trashLoaded}
            pageSize={25}
            emptyState={{ title: "Nothing archived", description: "Archived PDFs show here." }}
            rowActionDefs={rowActionDefs}
            selection={bulkArchived.selection}
          />
        </div>
      ) : null}
      <PdfDocRenameDialog
        open={renaming !== null}
        onOpenChange={(o) => { if (!o) setRenaming(null); }}
        currentName={renaming?.name ?? ""}
        onCommit={async (name) => {
          if (!renaming) return;
          await renamePdfFile({ fileId: renaming.id, docId: renaming.docId, newName: name, dispatch });
          if (renaming.docId) setDocName(renaming.id, name.trim());
        }}
      />
    </section>
  );
}
