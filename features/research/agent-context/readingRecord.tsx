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
