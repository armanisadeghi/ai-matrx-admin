/**
 * One document's searchable pieces, read straight from Postgres.
 *
 * `rag.fn_list_library_chunks` is a SECURITY INVOKER function, so row-level
 * security decides what the caller may see; the Python server is not involved.
 * Same response shape the old `GET /rag/library/{id}/chunks` returned. Soft-deleted
 * pieces (`deleted_at`) are hidden by the function itself, as the server did.
 */
import { createClient } from "@/utils/supabase/client";
import { ragDb } from "@/utils/supabase/ragDb";
import { operationFailed } from "@/utils/errors";

export interface LibraryChunkRow {
  id: string;
  chunk_index: number;
  chunk_kind: string | null;
  parent_chunk_id: string | null;
  page_numbers: number[] | null;
  token_count: number | null;
  content_text: string;
  has_oai_embedding: boolean;
  has_voyage_embedding: boolean;
  section_kind: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface LibraryChunksPage {
  chunks: LibraryChunkRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface LibraryChunksQuery {
  limit?: number;
  offset?: number;
  pageNumber?: number | null;
  parentOnly?: boolean;
  childrenOnly?: boolean;
}

export async function fetchLibraryChunks(
  documentId: string,
  opts: LibraryChunksQuery = {},
): Promise<LibraryChunksPage> {
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  const { data, error } = await ragDb(createClient()).rpc(
    "fn_list_library_chunks",
    {
      p_id: documentId,
      p_limit: limit,
      p_offset: offset,
      p_parent_only: opts.parentOnly ?? false,
      p_children_only: opts.childrenOnly ?? false,
      p_page_number: opts.pageNumber ?? undefined,
    },
  );
  if (error) throw operationFailed("load this document's pieces", error);
  const resp = data as unknown as Partial<LibraryChunksPage> | null;
  return {
    chunks: Array.isArray(resp?.chunks) ? resp.chunks : [],
    total: typeof resp?.total === "number" ? resp.total : 0,
    limit: typeof resp?.limit === "number" ? resp.limit : limit,
    offset: typeof resp?.offset === "number" ? resp.offset : offset,
  };
}
