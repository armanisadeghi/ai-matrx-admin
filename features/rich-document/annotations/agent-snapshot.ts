// features/rich-document/annotations/agent-snapshot.ts
//
// What an agent sees of a record's reading set: the person's PRIVATE
// highlights/notes and the record's shared comment threads, as plain values a
// surface publishes into its scope. ONE projection for every reader (the study
// guide, research syntheses and documents) — only confirmed (saved) items.

import type { ResolvedItem } from "./types";

/** One private highlight (a quoted passage + optional note) or whole-record note. */
export interface RecordPersonalAnnotation {
  id: string;
  kind: "highlight" | "note";
  quote: string | null;
  note: string;
  color: string;
  attached: boolean;
  created_at: string;
}

/** One comment thread (suggestions included) with its replies. */
export interface RecordCommentThread {
  id: string;
  quote: string | null;
  body: string;
  suggested_text: string | null;
  author: string;
  mine: boolean;
  resolved: boolean;
  attached: boolean;
  created_at: string;
  replies: { id: string; body: string; author: string; mine: boolean; created_at: string }[];
}

/** Manifest description shapes, written once. */
export const PERSONAL_ANNOTATION_SHAPE =
  '{ id, kind: "highlight" | "note", quote: string | null, note: string, color: "yellow" | "green" | "blue" | "pink" | "purple", attached: boolean, created_at }';
export const COMMENT_THREAD_SHAPE =
  "{ id, quote: string | null, body, suggested_text: string | null, author, mine: boolean, resolved: boolean, attached: boolean, created_at, replies: [{ id, body, author, mine, created_at }] }";

export function personalAnnotationsOf(items: readonly ResolvedItem[]): RecordPersonalAnnotation[] {
  const seen = new Set<string>();
  const out: RecordPersonalAnnotation[] = [];
  for (const item of items) {
    if ((item.kind !== "highlight" && item.kind !== "note") || item.saveState !== "confirmed" || !item.annotationDocumentId) continue;
    if (seen.has(item.annotationDocumentId)) continue;
    seen.add(item.annotationDocumentId);
    out.push({
      id: item.annotationDocumentId,
      kind: item.anchor ? "highlight" : "note",
      quote: item.anchor?.exact ?? null,
      note: item.body,
      color: item.color ?? "yellow",
      attached: !item.anchor || item.resolution?.status !== "orphaned",
      created_at: item.createdAt,
    });
  }
  return out;
}

export function commentThreadsOf(items: readonly ResolvedItem[]): RecordCommentThread[] {
  return items
    .filter((item) => (item.kind === "comment" || item.kind === "suggestion") && item.saveState === "confirmed" && item.commentId)
    .map((item) => ({
      id: item.commentId!,
      quote: item.anchor?.exact ?? null,
      body: item.body,
      suggested_text: item.suggestedText ?? null,
      author: item.author.name,
      mine: item.mine,
      resolved: Boolean(item.resolvedAt),
      attached: !item.anchor || item.resolution?.status !== "orphaned",
      created_at: item.createdAt,
      replies: item.replies.map((reply) => ({ id: reply.id, body: reply.body, author: reply.author.name, mine: reply.mine, created_at: reply.createdAt })),
    }));
}
