// features/rich-document/annotations/anchored-comments.ts — Docs and Sheets comment threads (C9) on the platform's ONE
// comment store, `platform.comments`, through the same `cmt_*` seam the rich-document sidecar and Spaces use.
//
// A thread on a passage or a cell carries a `part_anchor` whose part_key is `anchor:<id>`: the id of the anchor
// that lives IN the content (a Docs custom range, a Sheets anchor resource; @ai-matrx/office comment-anchors),
// so the anchor moves with every co-edit and the thread only names it. Edit (compare-and-swap), delete, resolve /
// reopen and @-mention notices are the sidecar service's own functions.

import { anchorIdOfPartAnchor, commentPartAnchor } from "@ai-matrx/office/docs";

/**
 * The save projection (COLLAB-DESIGN section 8) rewrites a thread's anchor: a sheet thread's key becomes `cell:...` and a docs thread
 * becomes a `text_anchor`; both keep the id in `anchor_id`. Read it first, so a projected thread stays joined to its anchor even
 * before the office package that knows it is installed.
 */
function anchorIdOf(anchor: unknown): string | null {
  const a = anchor as { __kind?: unknown; anchor_id?: unknown } | null;
  if (a && (a.__kind === "part_anchor" || a.__kind === "text_anchor") && typeof a.anchor_id === "string" && a.anchor_id) return a.anchor_id;
  return anchorIdOfPartAnchor(anchor);
}
function quoteOf(anchor: unknown): string {
  const a = anchor as { label?: unknown; exact?: unknown } | null;
  return a && typeof a.label === "string" ? a.label : a && typeof a.exact === "string" ? a.exact : "";
}

import { authorOf, type CommentAuthorRow } from "@/features/rich-document/annotations/comment-author";
import { humanError } from "@/features/rich-document/annotations/errors";
import type { AnnotationAuthor } from "@/features/rich-document/annotations/types";
import { associationsDataSource } from "@/features/scopes/host/associationsStore";
import { getUserId } from "@/utils/auth/getUserId";
import { hasBrowserSession } from "@/lib/supabase/hasBrowserSession";

export { deleteComment, editComment, notifyMentions, resolveComment } from "@/features/rich-document/annotations/service";
export { mentionedUserIds } from "@/features/rich-document/annotations/mentions";

type Seam = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
const seam = ((fn: string, args: Record<string, unknown>) => associationsDataSource.schema("platform").rpc(fn as never, args as never)) as unknown as Seam;

export interface AnchoredComment {
  id: string;
  body: string;
  author: AnnotationAuthor;
  mine: boolean;
  createdAt: string;
  editedAt: string | null;
  version: number | null;
}

export interface AnchoredThread extends AnchoredComment {
  /** The content anchor this thread names; null = a comment on the whole record. */
  anchorId: string | null;
  /** The text (or cell) the comment was made on, as it read then. */
  quote: string;
  resolvedAt: string | null;
  replies: AnchoredComment[];
}

interface Row extends CommentAuthorRow {
  id: string;
  parent_id: string | null;
  body: string | null;
  created_at: string;
  anchor: unknown;
  resolved_at: string | null;
  version: number | null;
  edited_at: string | null;
}

const isRow = (v: unknown): v is Row => !!v && typeof v === "object" && typeof (v as Row).id === "string" && typeof (v as Row).created_at === "string";

function comment(row: Row, me: string | null): AnchoredComment {
  const author = authorOf(row);
  return {
    id: row.id,
    body: row.body ?? "",
    author,
    mine: !!me && row.created_by === me && !author.agent,
    createdAt: row.created_at,
    editedAt: row.edited_at ?? null,
    version: typeof row.version === "number" ? row.version : null,
  };
}

const noAnswer = (e: { message: string; code?: string }) => !e.code && !e.message;

/** Every thread on the record, oldest first, replies nested. `stale()` = the person moved on (no error then). */
export async function listAnchoredThreads(token: string, id: string, stale: () => boolean = () => false): Promise<AnchoredThread[]> {
  // Signed out: no session, so the database would answer 401, and a visitor has no threads to read.
  if (!(await hasBrowserSession())) return [];
  const args = { p_entity_type: token, p_entity_id: id };
  let { data, error } = await seam("cmt_list", args);
  if (error && noAnswer(error)) {
    if (stale()) return [];
    await new Promise((r) => setTimeout(r, 600));
    if (stale()) return [];
    ({ data, error } = await seam("cmt_list", args));
  }
  if (error) {
    if (stale()) return [];
    throw humanError("loading the comments", error);
  }
  const rows = Array.isArray(data) ? data.filter(isRow) : [];
  const me = getUserId();
  const roots = new Map<string, AnchoredThread>();
  for (const row of rows) {
    if (row.parent_id) continue;
    roots.set(row.id, {
      ...comment(row, me),
      anchorId: anchorIdOf(row.anchor),
      quote: quoteOf(row.anchor),
      resolvedAt: row.resolved_at ?? null,
      replies: [],
    });
  }
  for (const row of rows) if (row.parent_id) roots.get(row.parent_id)?.replies.push(comment(row, me));
  return [...roots.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** A new thread on a content anchor, or a reply (parentId). Retry-safe on `requestId`. */
export async function addAnchoredComment(input: {
  token: string;
  id: string;
  body: string;
  anchor?: { anchorId: string; quote: string } | null;
  parentId?: string | null;
  requestId: string;
}): Promise<string> {
  const args: Record<string, unknown> = {
    p_entity_type: input.token,
    p_entity_id: input.id,
    p_body: input.body,
    p_parent_id: input.parentId ?? null,
    p_client_request_id: input.requestId,
  };
  if (input.anchor && !input.parentId) args.p_anchor = commentPartAnchor(input.anchor.anchorId, input.anchor.quote);
  const { data, error } = await seam("cmt_add", args);
  if (error) throw humanError("posting your comment", error);
  if (typeof data !== "string") throw humanError("posting your comment", new Error("the server returned no id"));
  return data;
}
