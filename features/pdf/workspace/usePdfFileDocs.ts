"use client";

/**
 * usePdfFileDocs — which of these PDF files have a processed document (extracted text), and which one. A metadata-only,
 * batched read of `docproc.processed_documents` by `source_id`; the file list never waits on it (rows show at once,
 * the status column fills in).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { docprocDb } from "@/utils/supabase/docprocDb";
import type { PdfFileDoc } from "./pdfFileRows";

const CHUNK = 150;

export function usePdfFileDocs(fileIds: readonly string[]) {
  const [docs, setDocs] = useState<ReadonlyMap<string, PdfFileDoc>>(new Map());
  const [bump, setBump] = useState(0);
  const key = useMemo(() => [...fileIds].sort().join(","), [fileIds]);
  const refresh = useCallback(() => setBump((b) => b + 1), []);

  useEffect(() => {
    if (!key) return undefined;
    const ids = key.split(",");
    let cancelled = false;
    (async () => {
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
      const next = new Map<string, PdfFileDoc>();
      for (const part of chunks) {
        const { data } = await docprocDb(supabase)
          .from("processed_documents")
          .select("id, name, total_pages, source_id, created_at")
          .in("source_id", part)
          .eq("source_kind", "cld_file")
          .is("parent_processed_id", null)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        for (const r of (data ?? []) as { id: string; name: string; total_pages: number | null; source_id: string }[]) {
          // Newest first: the first row per file wins.
          if (!next.has(r.source_id)) next.set(r.source_id, { id: r.id, name: r.name, totalPages: r.total_pages });
        }
      }
      if (!cancelled) setDocs(next);
    })().catch(() => undefined); // the status column stays "Not extracted"; the list itself does not depend on this read
    return () => { cancelled = true; };
  }, [key, bump]);

  const setDocName = useCallback((fileId: string, name: string) => {
    setDocs((cur) => {
      const d = cur.get(fileId);
      if (!d) return cur;
      const next = new Map(cur);
      next.set(fileId, { ...d, name });
      return next;
    });
  }, []);

  return { docs, refresh, setDocName };
}
