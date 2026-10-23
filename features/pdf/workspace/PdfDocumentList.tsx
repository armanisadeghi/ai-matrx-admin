"use client";

/**
 * features/pdf/workspace/PdfDocumentList.tsx — the front door's list of the person's extracted PDF documents
 * (what the extractor studio's sidebar listed). Each row opens its source file in the workspace; a row whose
 * original file was removed says so. Upload is the picker's own (Choose a PDF offers local upload).
 */
import Link from "next/link";
import { FileText } from "lucide-react";
import { ReadFailure } from "@ai-matrx/design-system";
import { usePdfStudioDocs } from "@/features/pdf-extractor/studio/hooks/usePdfStudioDocs";

export function PdfDocumentList() {
  const { visible, loading, error, refresh, search, setSearch } = usePdfStudioDocs();
  const rows = visible.filter((d) => d.sourceKind === "cld_file" && d.sourceId && !d.sourceMissing);
  if (error) return <ReadFailure error={error} what="your documents" onRetry={refresh} />;
  if (!loading && !rows.length && !search) return null;
  return (
    <section className="flex w-full max-w-xl flex-col gap-2" data-pdf-document-list="">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Your PDFs</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search your PDFs"
          placeholder="Search"
          className="h-7 w-40 rounded-md border border-border bg-background px-2 text-xs"
        />
      </div>
      <ul className="max-h-72 overflow-y-auto rounded-md border border-border">
        {rows.map((d) => (
          <li key={d.id} className="border-b border-border last:border-b-0">
            <Link href={`/pdf/${d.sourceId}`} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              <span className="shrink-0 text-muted-foreground">{d.totalPages ? `${d.totalPages} pages` : ""}</span>
            </Link>
          </li>
        ))}
        {loading && !rows.length ? <li className="px-2 py-2 text-xs text-muted-foreground" aria-busy="true">Loading</li> : null}
        {!loading && !rows.length ? <li className="px-2 py-2 text-xs text-muted-foreground">No PDFs match.</li> : null}
      </ul>
    </section>
  );
}
