// features/rich-document/annotations/comment-author.ts
//
// Who wrote a comment row, as the panel shows it. A row an agent run wrote
// (a `comment_reply`) is filed under the person whose run it was — so
// `created_by` is theirs — and carries the agent: the panel names the AGENT,
// with the agent mark, and never offers to edit its words. A row the platform
// wrote (`created_by_tier = 'system'`) is credited to AI Matrx the same way.

import type { AnnotationAuthor } from "./types";

/** The name a system-written comment is credited to. */
export const SYSTEM_AUTHOR_NAME = "AI Matrx";

export interface CommentAuthorRow {
  created_by: string | null;
  author_display_name: string | null;
  author_email: string | null;
  author_avatar_url: string | null;
  /** cmt_list (threads ruling R5): who wrote the row. Absent until the server returns it. */
  created_by_tier?: string | null;
  author_agent_id?: string | null;
  author_agent_name?: string | null;
}

export function authorOf(row: CommentAuthorRow): AnnotationAuthor {
  const agentId = row.author_agent_id || null;
  if (agentId || row.created_by_tier === "agent") {
    const name = row.author_agent_name || "Agent";
    return { id: row.created_by, name, avatarUrl: null, agent: { id: agentId, name } };
  }
  // The platform wrote it (an edit remark's thread opener, minted when the agent replies to the
  // edit): filed under the person whose remark it was, credited to the system, never editable
  // as their words (live 2026-10-19: drawn as "admin@admin.com").
  if (row.created_by_tier === "system") {
    return { id: row.created_by, name: SYSTEM_AUTHOR_NAME, avatarUrl: null, system: true };
  }
  return {
    id: row.created_by,
    name: row.author_display_name || row.author_email || "Someone",
    avatarUrl: row.author_avatar_url,
  };
}
