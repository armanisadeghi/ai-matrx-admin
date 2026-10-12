"use client";

// features/research/agent-context/readingRecord.tsx
//
// The research record open in the annotated reader (a synthesis or the
// document), handed up to the topic's ONE surface (`ResearchTopicSurfaceHost`)
// so every agent launched on the topic — the header Agents menu and the
// right-click menu alike — reads that record, its comment threads and the
// person's own highlights (`open_record` / `record_comments` /
// `my_record_notes`). The reading set lives in the reader's sidecar, below the
// surface provider, so a bridge inside the sidecar publishes into a ref the
// host owns (getScope stays synchronous).

import { createContext, useContext, useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { useSidecar } from "@/features/rich-document/annotations/AnnotationSidecar";
import { loadedSidecarKeys, sidecarKey, sidecarSnapshot } from "@/features/rich-document/annotations/sidecarStore";
import {
  commentThreadsOf,
  personalAnnotationsOf,
  type RecordCommentThread,
  type RecordPersonalAnnotation,
} from "@/features/rich-document/annotations/agent-snapshot";

export interface ResearchReadingRecord {
  type: "research_synthesis" | "research_document";
  id: string;
  title: string;
  version: number;
  /** Which output it is: "topic report", "keyword synthesis", "tag consolidation", "document". */
  kind: string;
  body: string;
  /** Absent while the reading set loads or failed. */
  comments?: RecordCommentThread[];
  notes?: RecordPersonalAnnotation[];
}

type RecordRef = MutableRefObject<ResearchReadingRecord | null>;

const ReadingRecordContext = createContext<RecordRef | null>(null);

export function ResearchReadingRecordProvider({ children }: { children: (ref: RecordRef) => ReactNode }) {
  const ref = useRef<ResearchReadingRecord | null>(null);
  return <ReadingRecordContext.Provider value={ref}>{children(ref)}</ReadingRecordContext.Provider>;
}

/** The topic's open-record ref (null outside a topic surface). */
export function useResearchReadingRecordRef(): RecordRef | null {
  return useContext(ReadingRecordContext);
}

/** Mounted INSIDE the reader's sidecar: publishes the open record and its reading set. */
export function ResearchReadingRecordBridge({ record }: { record: Omit<ResearchReadingRecord, "comments" | "notes"> }) {
  const ref = useContext(ReadingRecordContext);
  const { api } = useSidecar();
  const { items, loading, error } = api.state;
  const comments = commentThreadsOf(items);
  const notes = personalAnnotationsOf(items);
  useEffect(() => {
    if (ref) ref.current = { ...record, ...(loading || error ? {} : { comments, notes }) };
  });
  useEffect(() => () => {
    if (ref) ref.current = null;
  }, [ref]);
  return null;
}

/** The record's values for the research scope (absent keys when nothing is open). */
export function readingRecordScopeValues(record: ResearchReadingRecord | null | undefined): {
  open_record?: { type: string; id: string; title: string; version: number; kind: string };
  record_comments?: RecordCommentThread[];
  my_record_notes?: RecordPersonalAnnotation[];
} {
  if (!record) return {};
  return {
    open_record: { type: record.type, id: record.id, title: record.title, version: record.version, kind: record.kind },
    ...(record.comments ? { record_comments: record.comments } : {}),
    ...(record.notes ? { my_record_notes: record.notes } : {}),
  };
}

// ── Records read in place (analyses, keyword syntheses, consolidations, versions) ──
//
// Their reading set lives in each RichDocument's own sidecar (the shared
// sidecar store, one entry per record). They register their identity here
// while rendered, and the topic surface reads the saved items of every one of
// them that holds any, as `page_record_comments`.

export interface InlineResearchRecord {
  type: "research_synthesis" | "research_analysis" | "research_document" | "research_content";
  id: string;
  title: string;
}

export interface InlineRecordReadingSet {
  record: InlineResearchRecord;
  comments: RecordCommentThread[];
  notes: RecordPersonalAnnotation[];
}

const inlineRecords = new Map<string, { record: InlineResearchRecord; mounts: number }>();

/** While an in-place research record is rendered, the topic's agents can read its comments. */
export function useRegisterInlineResearchRecord(record: InlineResearchRecord): void {
  const key = sidecarKey({ token: record.type, id: record.id })!;
  const { type, id, title } = record;
  useEffect(() => {
    const entry = inlineRecords.get(key);
    inlineRecords.set(key, { record: { type, id, title }, mounts: (entry?.mounts ?? 0) + 1 });
    return () => {
      const current = inlineRecords.get(key);
      if (!current) return;
      if (current.mounts <= 1) inlineRecords.delete(key);
      else inlineRecords.set(key, { ...current, mounts: current.mounts - 1 });
    };
  }, [key, type, id, title]);
}

/**
 * Saved comments and the person's highlights on every in-place record on the
 * page that has any (a record still loading or whose read failed is left out —
 * never reported as empty). `attached` is not resolved here (true).
 */
export function inlineRecordReadingSets(): InlineRecordReadingSet[] {
  const loaded = new Set(loadedSidecarKeys());
  const out: InlineRecordReadingSet[] = [];
  for (const [key, { record }] of inlineRecords) {
    if (!loaded.has(key)) continue;
    const snapshot = sidecarSnapshot(key);
    if (snapshot.loading || snapshot.error) continue;
    const items = snapshot.confirmed.map((item) => ({ ...item, resolution: null }));
    const comments = commentThreadsOf(items);
    const notes = personalAnnotationsOf(items);
    if (comments.length || notes.length) out.push({ record, comments, notes });
  }
  return out;
}

