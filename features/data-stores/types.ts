/**
 * Data Stores — typed view of `rag.data_stores` and `rag.data_store_members`.
 *
 * A Data Store is a named, scoped collection of documents (and other source
 * kinds) that an agent can query against. Documents are bound to stores via
 * `data_store_members(source_kind, source_id)` rows. The RAG layer's
 * `rag_search` tool requires an explicit `data_store_id` (or scope key) —
 * stores are the canonical scope-gate for retrieval.
 */

export interface DataStore {
  id: string;
  organizationId: string | null;
  name: string;
  shortCode: string | null;
  description: string | null;
  /** `'ad_hoc' | 'project' | 'system' | …` (free-form, server-defined). */
  kind: string | null;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataStoreMember {
  dataStoreId: string;
  /** `'cld_file' | 'processed_document' | 'note' | …` */
  sourceKind: string;
  sourceId: string;
  addedBy: string | null;
  addedAt: string;
}

export interface DataStoreWithMemberCount extends DataStore {
  memberCount: number;
}
