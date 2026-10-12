// features/rich-document/annotations/record-annotations-batch.ts
//
// MANY records' reading sets in one read, for anything that hands records to
// an agent (research Context bundles, Outputs): the comment threads the person
// may view on each record and the person's OWN private highlights/notes —
// `platform.record_annotations_many` (viewer rule = cmt_list's; nobody else's
// private notes ever come back). Plus the counts a picker shows and the text
// an agent reads.

import { supabase } from "@/utils/supabase/client";
import type { RecordCommentThread, RecordPersonalAnnotation } from "./agent-snapshot";

export interface RecordReadingSet {
  comments: RecordCommentThread[];
  notes: RecordPersonalAnnotation[];
}

export interface ReadingSetCounts {
  /** Unresolved comment threads. */
  open: number;
  resolved: number;
  /** The person's own highlights and notes. */
  notes: number;
}

/** What an agent is handed from a record's reading set. */
export interface ReadingSetInclusion {
  /** Open (unresolved) comment threads with their replies. */
  comments: boolean;
  /** The person's own private highlights and notes. */
  notes: boolean;
}

const CHUNK = 2000;

interface Row {
  entity_id: string;
  item_kind: "comment" | "reply" | "note";
  id: string;
  parent_id: string | null;
  body: string;
  quote: string | null;
  suggested_text: string | null;
  resolved: boolean;
  author: string | null;
  mine: boolean;
  created_at: string;
}

/** Reading sets for `ids` (records of one `token`), keyed by record id. Only records with something. */
export async function readRecordReadingSets(token: string, ids: readonly string[]): Promise<Map<string, RecordReadingSet>> {
  const unique = [...new Set(ids)];
  const rows: Row[] = [];
  for (let i = 0; i < unique.length; i += CHUNK) {
    const { data, error } = await supabase
      .schema("platform")
      .rpc("record_annotations_many", { p_entity_type: token, p_entity_ids: unique.slice(i, i + CHUNK) });
    if (error) throw error;
    rows.push(...((data ?? []) as Row[]));
  }
  return groupReadingSets(rows);
}

/** Pure: rows → threads (replies under their root; a reply whose root is gone is dropped) + notes. */
export function groupReadingSets(rows: readonly Row[]): Map<string, RecordReadingSet> {
  const out = new Map<string, RecordReadingSet>();
  const setFor = (id: string) => {
    let set = out.get(id);
    if (!set) {
      set = { comments: [], notes: [] };
      out.set(id, set);
    }
    return set;
  };
  const roots = new Map<string, RecordCommentThread>();
  for (const row of rows) {
    if (row.item_kind === "comment") {
      const thread: RecordCommentThread = {
        id: row.id,
        quote: row.quote,
        body: row.body,
        suggested_text: row.suggested_text,
        author: row.author ?? "Someone",
        mine: row.mine,
        resolved: row.resolved,
        attached: true,
        created_at: row.created_at,
        replies: [],
      };
      roots.set(row.id, thread);
      setFor(row.entity_id).comments.push(thread);
    } else if (row.item_kind === "note") {
      setFor(row.entity_id).notes.push({
        id: row.id,
        kind: row.quote ? "highlight" : "note",
        quote: row.quote,
        note: row.body,
        color: "yellow",
        attached: true,
        created_at: row.created_at,
      });
    }
  }
  for (const row of rows) {
    if (row.item_kind !== "reply" || !row.parent_id) continue;
    roots.get(row.parent_id)?.replies.push({ id: row.id, body: row.body, author: row.author ?? "Someone", mine: row.mine, created_at: row.created_at });
  }
  return out;
}

export function readingSetCounts(set: RecordReadingSet | undefined): ReadingSetCounts {
  if (!set) return { open: 0, resolved: 0, notes: 0 };
  const resolved = set.comments.filter((c) => c.resolved).length;
  return { open: set.comments.length - resolved, resolved, notes: set.notes.length };
}

/**
 * The record's reading set as text an agent reads under the record's own block
 * — only what `include` asks for, "" when there is nothing to add. Highlights
 * with no note still say which passage the person marked.
 */
export function renderReadingSetForAgent(set: RecordReadingSet | undefined, include: ReadingSetInclusion): string {
  if (!set) return "";
  const parts: string[] = [];
  const open = include.comments ? set.comments.filter((c) => !c.resolved) : [];
  if (open.length) {
    const lines = ["### Reader comments (open — address each one)"];
    open.forEach((thread, i) => {
      lines.push(`${i + 1}. ${thread.quote ? `On the passage: "${thread.quote}"` : "On the whole record"}`);
      lines.push(`   Comment (${thread.author}): ${thread.body}`);
      if (thread.suggested_text) lines.push(`   Suggested replacement: ${thread.suggested_text}`);
      for (const reply of thread.replies) lines.push(`   Reply (${reply.author}): ${reply.body}`);
    });
    parts.push(lines.join("\n"));
  }
  if (include.notes && set.notes.length) {
    const lines = ["### My highlights and notes"];
    set.notes.forEach((note, i) => {
      const what = note.quote ? `Highlighted: "${note.quote}"` : "Note on the whole record";
      lines.push(`${i + 1}. ${what}${note.note.trim() ? ` — ${note.note.trim()}` : ""}`);
    });
    parts.push(lines.join("\n"));
  }
  return parts.join("\n\n");
}
