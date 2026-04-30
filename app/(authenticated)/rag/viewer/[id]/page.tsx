/**
 * /rag/viewer/[id] — 4-pane synchronized document viewer.
 *
 * Citation deep links use search params:
 *   /rag/viewer/<doc_id>?page=12&chunk=<chunk_id>
 *
 * The page itself is a thin client wrapper — all data fetching lives in
 * the DocumentViewer component (and its hooks).
 */

"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { DocumentViewer } from "@/features/documents/components/DocumentViewer";

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();

  const documentId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw ?? null;
  }, [params]);

  const initialPage = useMemo(() => {
    const v = search?.get("page");
    if (!v) return undefined;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [search]);

  const initialChunkId = useMemo(
    () => search?.get("chunk") ?? undefined,
    [search],
  );

  const handleOpenAncestor = useCallback(
    (id: string, kind: "cld_files" | "processed_document") => {
      // Binary-parent (cld_files) ancestors don't have a viewer page yet;
      // for processing-parent ancestors we navigate to the same viewer.
      if (kind === "processed_document") {
        router.push(`/rag/viewer/${id}`);
      } else {
        // For cld_files derivatives, jump to the file detail page once
        // that route lands. For now, no-op — the chip is informational.
        // eslint-disable-next-line no-console
        console.log("ancestor cld_files row:", id);
      }
    },
    [router],
  );

  if (!documentId) {
    return (
      <div className="grid place-items-center h-full text-sm text-muted-foreground">
        Missing document id.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3rem)]">
      <DocumentViewer
        documentId={documentId}
        initialPage={initialPage}
        initialChunkId={initialChunkId}
        onOpenAncestor={handleOpenAncestor}
      />
    </div>
  );
}
