"use client";

/**
 * Hooks for the /rag/library surface — visibility into processed documents.
 *
 * Reads go through the FastAPI HTTP endpoints at /rag/library/*. The
 * shape mirrors what the FE renders 1:1 (snake_case → camelCase mapping
 * happens here so the component layer stays clean).
 */

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { getJson } from "@/features/files/api/client";
import type {
  DocStatus,
  LibraryDocDetail,
  LibraryDocSummary,
  LibraryListResponse,
  LibrarySummary,
} from "../types";

// ---------------------------------------------------------------------------
// Wire shapes (snake_case from FastAPI)
// ---------------------------------------------------------------------------

interface ApiSummaryDoc {
  id: string;
  name: string;
  source_kind: string;
  source_id: string;
  mime_type: string | null;
  total_pages: number | null;
  pages_persisted: number;
  chunks: number;
  embeddings_oai: number;
  embeddings_voyage: number;
  data_store_count: number;
  has_structured_json: boolean;
  derivation_kind: string;
  parent_processed_id: string | null;
  status: DocStatus;
  created_at: string;
  updated_at: string;
}

interface ApiListResponse {
  documents: ApiSummaryDoc[];
  total: number;
  limit: number;
  offset: number;
}

interface ApiSummaryTotals {
  documents_total: number;
  documents_ready: number;
  documents_embedding: number;
  documents_extracted: number;
  documents_pending: number;
  pages_persisted: number;
  chunks: number;
  embeddings_oai: number;
  embeddings_voyage: number;
  data_stores: number;
}

interface ApiPagePreview {
  page_index: number;
  page_number: number;
  raw_char_count: number;
  cleaned_char_count: number;
  extraction_method: string | null;
  used_ocr: boolean;
  section_kind: string | null;
  section_title: string | null;
  is_continuation: boolean;
  cleaned_preview: string;
  raw_preview: string;
  has_image: boolean;
}

interface ApiChunkPreview {
  id: string;
  chunk_index: number | null;
  chunk_kind: string | null;
  token_count: number | null;
  page_numbers: number[] | null;
  has_oai_embedding: boolean;
  has_voyage_embedding: boolean;
  content_preview: string;
}

interface ApiDataStoreBinding {
  data_store_id: string;
  name: string;
  kind: string;
  short_code: string | null;
}

interface ApiDocDetail {
  id: string;
  name: string;
  source_kind: string;
  source_id: string;
  mime_type: string | null;
  total_pages: number | null;
  pages_persisted: number;
  chunks: number;
  embeddings_oai: number;
  embeddings_voyage: number;
  has_structured_json: boolean;
  storage_uri: string | null;
  derivation_kind: string;
  parent_processed_id: string | null;
  status: DocStatus;
  created_at: string;
  updated_at: string;
  pages: ApiPagePreview[];
  sample_chunks: ApiChunkPreview[];
  data_stores: ApiDataStoreBinding[];
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapSummary(d: ApiSummaryDoc): LibraryDocSummary {
  return {
    id: d.id,
    name: d.name,
    sourceKind: d.source_kind,
    sourceId: d.source_id,
    mimeType: d.mime_type,
    totalPages: d.total_pages,
    pagesPersisted: d.pages_persisted,
    chunks: d.chunks,
    embeddingsOai: d.embeddings_oai,
    embeddingsVoyage: d.embeddings_voyage,
    dataStoreCount: d.data_store_count,
    hasStructuredJson: d.has_structured_json,
    derivationKind: d.derivation_kind,
    parentProcessedId: d.parent_processed_id,
    status: d.status,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function mapDetail(d: ApiDocDetail): LibraryDocDetail {
  // Defensive across the board — any of the array fields can come back
  // missing if the upstream Pydantic model rejects something silently
  // (e.g. an old row missing a column). We never want a partial response
  // to crash the detail sheet — surfacing whatever we have is more useful
  // than a white screen.
  const pages = Array.isArray(d?.pages) ? d.pages : [];
  const sampleChunks = Array.isArray(d?.sample_chunks) ? d.sample_chunks : [];
  const dataStores = Array.isArray(d?.data_stores) ? d.data_stores : [];
  return {
    id: d.id,
    name: d.name,
    sourceKind: d.source_kind,
    sourceId: d.source_id,
    mimeType: d.mime_type,
    totalPages: d.total_pages,
    pagesPersisted: d.pages_persisted,
    chunks: d.chunks,
    embeddingsOai: d.embeddings_oai,
    embeddingsVoyage: d.embeddings_voyage,
    hasStructuredJson: d.has_structured_json,
    storageUri: d.storage_uri,
    derivationKind: d.derivation_kind,
    parentProcessedId: d.parent_processed_id,
    status: d.status,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    pages: pages.map((p) => ({
      pageIndex: p.page_index,
      pageNumber: p.page_number,
      rawCharCount: p.raw_char_count,
      cleanedCharCount: p.cleaned_char_count,
      extractionMethod: p.extraction_method,
      usedOcr: p.used_ocr,
      sectionKind: p.section_kind,
      sectionTitle: p.section_title,
      isContinuation: p.is_continuation,
      cleanedPreview: p.cleaned_preview,
      rawPreview: p.raw_preview,
      hasImage: p.has_image,
    })),
    sampleChunks: sampleChunks.map((c) => ({
      id: c.id,
      chunkIndex: c.chunk_index,
      chunkKind: c.chunk_kind,
      tokenCount: c.token_count,
      pageNumbers: c.page_numbers,
      hasOaiEmbedding: c.has_oai_embedding,
      hasVoyageEmbedding: c.has_voyage_embedding,
      contentPreview: c.content_preview,
    })),
    dataStores: dataStores.map((s) => ({
      dataStoreId: s.data_store_id,
      name: s.name,
      kind: s.kind,
      shortCode: s.short_code,
    })),
  };
}

function mapSummaryTotals(t: ApiSummaryTotals): LibrarySummary {
  return {
    documentsTotal: t.documents_total,
    documentsReady: t.documents_ready,
    documentsEmbedding: t.documents_embedding,
    documentsExtracted: t.documents_extracted,
    documentsPending: t.documents_pending,
    pagesPersisted: t.pages_persisted,
    chunks: t.chunks,
    embeddingsOai: t.embeddings_oai,
    embeddingsVoyage: t.embeddings_voyage,
    dataStores: t.data_stores,
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface UseLibraryOptions {
  search?: string;
  status?: DocStatus | null;
  limit?: number;
  offset?: number;
  /** Bumping this triggers a refetch (e.g. after a re-process). */
  refreshKey?: number;
}

export function useLibrary(opts: UseLibraryOptions = {}) {
  const userId = useAppSelector(selectUserId);
  const [docs, setDocs] = useState<LibraryDocSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { search, status, limit = 100, offset = 0, refreshKey = 0 } = opts;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (search) params.set("search", search);
    if (status) params.set("status_filter", status);

    getJson<ApiListResponse>(`/rag/library?${params.toString()}`)
      .then(({ data }) => {
        if (cancelled) return;
        // Defensive: server *should* always return {documents, total},
        // but if for any reason the shape is off (proxy 404 page,
        // upstream fallback, etc.), we fail soft instead of crashing
        // the whole page with a `.map of undefined`.
        const list = Array.isArray(data?.documents) ? data.documents : [];
        setDocs(list.map(mapSummary));
        setTotal(typeof data?.total === "number" ? data.total : list.length);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load library");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, search, status, limit, offset, refreshKey]);

  return { docs, total, loading, error };
}

export function useLibrarySummary(refreshKey = 0) {
  const userId = useAppSelector(selectUserId);
  const [summary, setSummary] = useState<LibrarySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getJson<ApiSummaryTotals>("/rag/library/summary/totals")
      .then(({ data }) => {
        if (!cancelled && data) setSummary(mapSummaryTotals(data));
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load summary");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  return { summary, loading, error };
}

export function useLibraryDoc(processedDocumentId: string | null) {
  const [doc, setDoc] = useState<LibraryDocDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!processedDocumentId) {
      setDoc(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getJson<ApiDocDetail>(`/rag/library/${processedDocumentId}`)
      .then(({ data }) => {
        if (!cancelled && data) setDoc(mapDetail(data));
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load document");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [processedDocumentId, reloadKey]);

  const reload = useCallback(() => setReloadKey((n) => n + 1), []);
  return { doc, loading, error, reload };
}
