"use client";

/**
 * /rag/library — visibility surface for processed documents.
 *
 * The "where did my content go?" page. One table, one truth. Every
 * processed_documents row owned by the caller, with derived counts
 * and a status badge. Clicking a row opens the detail sheet.
 *
 * Header strip shows org-level rollups (totals across all docs) so the
 * user can answer "is anything happening?" at a glance.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  ExternalLink,
  FileText,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  AlertTriangle,
  Trash2,
  Search as SearchAction,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { postJson } from "@/features/files/api/client";
import { useLibrary, useLibrarySummary } from "../hooks/useLibrary";
import type { DocStatus } from "../types";
import { StatusBadge } from "./StatusBadge";
import { LibraryDocDetailSheet } from "./LibraryDocDetailSheet";
import { QuickSearchDialog } from "./QuickSearchDialog";

const STATUS_FILTERS: { value: DocStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "embedding", label: "Embedding" },
  { value: "extracted", label: "Extracted" },
  { value: "pending", label: "Pending / failed" },
];

export function LibraryPage() {
  const search = useSearchParams();

  // Read the initial doc_id from the URL exactly once, then own selection
  // in component state. We DO NOT reflect selection back to the URL here —
  // an effect that calls `router.replace` while listing `search` and
  // `router` in its deps creates an infinite navigation loop in the
  // App Router (router.replace mutates the search-params reference, which
  // re-fires the effect, which calls router.replace again, ad infinitum).
  // For deep links: opening `/rag/library?doc_id=<uuid>` still works
  // because of the snapshot below. Re-syncing on click is intentionally
  // skipped — keep it lean for the demo.
  const initialDocIdRef = useRef<string | null>(
    search?.get("doc_id") ?? null,
  );

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocStatus | "all">("all");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    initialDocIdRef.current,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [bulkConfirmStatus, setBulkConfirmStatus] = useState<DocStatus | null>(
    null,
  );
  const [bulkRunning, setBulkRunning] = useState(false);
  const [searchDocId, setSearchDocId] = useState<string | null>(null);
  const [searchDocName, setSearchDocName] = useState<string | null>(null);

  const handleBulkDelete = async (status: DocStatus) => {
    setBulkRunning(true);
    try {
      const { data } = await postJson<
        {
          deleted_documents: number;
          deleted_pages: number;
          deleted_chunks: number;
        },
        { status: string }
      >("/rag/library/bulk-delete", { status });
      toast.success(
        `Deleted ${data?.deleted_documents ?? 0} ${status} documents (${data?.deleted_pages ?? 0} pages, ${data?.deleted_chunks ?? 0} chunks)`,
      );
      setBulkConfirmStatus(null);
      setRefreshKey((n) => n + 1);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Bulk delete failed",
      );
    } finally {
      setBulkRunning(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { docs, total, loading, error } = useLibrary({
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? null : statusFilter,
    limit: 100,
    offset: 0,
    refreshKey,
  });

  const { summary, loading: summaryLoading } = useLibrarySummary(refreshKey);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Document Library
            </h1>
            <p className="text-sm text-muted-foreground">
              Every document you've processed for RAG. Status, page counts,
              chunks, embeddings, and data-store bindings — all in one place.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey((n) => n + 1)}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/rag/data-stores", "_blank")}
            >
              <Database className="h-4 w-4 mr-1" />
              Data Stores
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Rollup strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          <RollupCard
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Documents"
            value={summary?.documentsTotal}
            loading={summaryLoading}
          />
          <RollupCard
            icon={<span className="text-green-500">●</span>}
            label="Ready"
            value={summary?.documentsReady}
            loading={summaryLoading}
            tone="success"
          />
          <RollupCard
            icon={<Sparkles className="h-3.5 w-3.5 text-blue-500" />}
            label="Embedding"
            value={summary?.documentsEmbedding}
            loading={summaryLoading}
          />
          <RollupCard
            icon={<AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
            label="Extracted only"
            value={summary?.documentsExtracted}
            loading={summaryLoading}
            tone="warning"
          />
          <RollupCard
            icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
            label="Pending / failed"
            value={summary?.documentsPending}
            loading={summaryLoading}
            tone="error"
          />
          <RollupCard
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Total chunks"
            value={summary?.chunks}
            loading={summaryLoading}
          />
          <RollupCard
            icon={<Database className="h-3.5 w-3.5" />}
            label="Data stores"
            value={summary?.dataStores}
            loading={summaryLoading}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name…"
              className="pl-8 h-9"
            />
          </div>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={statusFilter === f.value ? "default" : "outline"}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Bulk-clean shortcut — only meaningful when there's actually
              something to clean. Operates on the server-derived status,
              NOT on the visible-table filter, so it works even if the
              user hasn't filtered to Pending. */}
          {(summary?.documentsPending ?? 0) > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto"
              onClick={() => setBulkConfirmStatus("pending")}
              disabled={bulkRunning}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear {summary?.documentsPending ?? 0} pending
            </Button>
          )}
        </div>
      </header>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        {error && (
          <div className="m-6 p-4 border border-destructive/50 bg-destructive/5 rounded-md text-sm text-destructive">
            <strong>Could not load library:</strong> {error}
          </div>
        )}

        {loading && docs.length === 0 ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <EmptyState searching={Boolean(debouncedSearch)} />
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pages</TableHead>
                <TableHead className="text-right">Chunks</TableHead>
                <TableHead className="text-right">Embeds</TableHead>
                <TableHead className="text-right">Stores</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow
                  key={d.id}
                  onClick={() => setSelectedDocId(d.id)}
                  className="cursor-pointer hover:bg-accent/50"
                >
                  <TableCell className="max-w-md">
                    <div className="font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{d.sourceKind}</span>
                      {d.derivationKind !== "initial_extract" && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {d.derivationKind}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.pagesPersisted}
                    {d.totalPages != null && d.totalPages !== d.pagesPersisted && (
                      <span className="text-muted-foreground"> / {d.totalPages}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.chunks.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={
                        d.chunks > 0 && d.embeddingsOai < d.chunks
                          ? "text-yellow-600 dark:text-yellow-400"
                          : ""
                      }
                    >
                      {d.embeddingsOai.toLocaleString()}
                      {d.chunks > 0 && d.embeddingsOai !== d.chunks && (
                        <span className="text-muted-foreground"> / {d.chunks}</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {d.dataStoreCount > 0 ? (
                      <Badge variant="info">{d.dataStoreCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelative(d.createdAt)}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Search inside this document"
                        disabled={d.chunks === 0}
                        onClick={() => {
                          setSearchDocId(d.id);
                          setSearchDocName(d.name);
                        }}
                      >
                        <SearchAction className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Open detail panel"
                        onClick={() => setSelectedDocId(d.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!loading && docs.length > 0 && total > docs.length && (
          <p className="px-6 py-3 text-xs text-muted-foreground italic">
            Showing first {docs.length} of {total} documents.
          </p>
        )}
      </div>

      <LibraryDocDetailSheet
        processedDocumentId={selectedDocId}
        onClose={() => setSelectedDocId(null)}
        onMutated={() => setRefreshKey((n) => n + 1)}
      />

      <QuickSearchDialog
        open={searchDocId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSearchDocId(null);
            setSearchDocName(null);
          }
        }}
        processedDocumentId={searchDocId}
        documentName={searchDocName}
      />

      {/* Bulk-delete confirm dialog */}
      <Dialog
        open={bulkConfirmStatus !== null}
        onOpenChange={(o) => {
          if (!o) setBulkConfirmStatus(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete all {bulkConfirmStatus} documents?
            </DialogTitle>
            <DialogDescription>
              {bulkConfirmStatus === "pending" && (
                <>
                  This will delete every document of yours where ingestion
                  failed before any pages were persisted. The original files
                  in cloud storage are <strong>not</strong> touched — only
                  the failed processing rows.
                </>
              )}
              {bulkConfirmStatus === "extracted" && (
                <>
                  This will delete every document where pages were extracted
                  but chunking never ran. Re-process to rebuild.
                </>
              )}
              {bulkConfirmStatus === "embedding" && (
                <>
                  This will delete every document where embeddings are still
                  partially missing. Re-process to rebuild.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkConfirmStatus(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (bulkConfirmStatus) handleBulkDelete(bulkConfirmStatus);
              }}
              disabled={bulkRunning}
            >
              {bulkRunning ? "Deleting…" : "Delete all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RollupCard({
  icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  loading: boolean;
  tone?: "success" | "warning" | "error";
}) {
  const toneClass =
    tone === "success"
      ? "border-green-500/30 bg-green-500/5"
      : tone === "warning"
      ? "border-yellow-500/30 bg-yellow-500/5"
      : tone === "error"
      ? "border-red-500/30 bg-red-500/5"
      : "bg-muted/30";
  return (
    <div className={`rounded-md border p-2 flex flex-col gap-0.5 ${toneClass}`}>
      <span className="flex items-center gap-1 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-semibold text-sm">
        {loading ? <Skeleton className="h-4 w-10" /> : (value ?? 0).toLocaleString()}
      </span>
    </div>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
      <h3 className="text-lg font-medium">
        {searching ? "No matches" : "No documents processed yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mt-1">
        {searching
          ? "Try clearing your search or status filter."
          : "Upload a file in the Data Stores page or use /rag/ingest to process a document. It will appear here as soon as ingestion starts."}
      </p>
    </div>
  );
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return iso;
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
