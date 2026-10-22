// features/spaces/page/page-surface.ts — the open Space page as the `matrx-user/space-page` surface:
// the values an agent reads (title, body as Markdown, sub-pages) and the pure plan for writing the body
// back. The body edit keeps every block whose Markdown did not change (a database, an embed, a synced
// block survive a one-word patch untouched); only the changed run of top-level blocks is re-made.

import { notionMarkdownToBlocks } from "@/lib/spaces-blocks/notion-markdown";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

import type { SpaceBlock, SpaceDoc } from "../contract";
import { blocksToMarkdownLines, type MarkdownContext } from "../io/markdown";

/** The page body (no `# Title` line) exactly as the agent reads it in `page_body`. */
export function bodyMarkdown(blocks: SpaceBlock[], ctx: MarkdownContext): string {
  return blocksToMarkdownLines(blocks, ctx).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export interface BodyEditPlan {
  /** Top-level blocks kept at the start and at the end, untouched. */
  keepHead: number;
  keepTail: number;
  /** The ids of the blocks between them, replaced by `blocks`. */
  replaceIds: string[];
  blocks: SpaceBlock[];
  warnings: string[];
}

const boundary = (text: string, at: number) => at <= 0 || at >= text.length || text[at] === "\n" || text[at - 1] === "\n";

/**
 * Plan writing `next` (the whole body as Markdown, after the seam resolved any patch) over `blocks`.
 * The longest run of leading and trailing blocks whose Markdown still stands is kept; the middle text
 * becomes new blocks. Null when nothing changed.
 */
export function planBodyEdit(blocks: SpaceBlock[], next: string, ctx: MarkdownContext): BodyEditPlan | null {
  const target = next.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (target === bodyMarkdown(blocks, ctx)) return null;
  const n = blocks.length;
  let head = 0;
  let headLen = 0;
  for (let k = 1; k <= n; k++) {
    const md = bodyMarkdown(blocks.slice(0, k), ctx);
    if (!md || !target.startsWith(md) || !boundary(target, md.length)) break;
    head = k;
    headLen = md.length;
  }
  let tail = 0;
  let tailLen = 0;
  for (let j = 1; j <= n - head; j++) {
    const md = bodyMarkdown(blocks.slice(n - j), ctx);
    const at = target.length - md.length;
    if (!md || !target.endsWith(md) || at < headLen || !boundary(target, at)) break;
    tail = j;
    tailLen = md.length;
  }
  const middle = target.slice(headLen, target.length - tailLen).trim();
  const parsed = middle
    ? notionMarkdownToBlocks(middle, { idSeed: `agent:${crypto.randomUUID()}` })
    : { blocks: [] as SpaceBlock[], warnings: [] as string[] };
  return {
    keepHead: head,
    keepTail: tail,
    replaceIds: blocks.slice(head, n - tail).map((b) => b.id),
    blocks: parsed.blocks as SpaceBlock[],
    warnings: parsed.warnings,
  };
}

export interface SpacePageScopeInput {
  spaceId: string;
  doc: SpaceDoc | null | undefined;
  /** The body as the editor holds it now (unsaved typing included); falls back to `doc.blocks`. */
  liveBlocks: SpaceBlock[] | null;
  ctx: MarkdownContext;
  subPages: { id: string; title: string }[];
  path: { id: string; title: string }[];
  editable: boolean;
  canEdit: boolean;
  inTrash: boolean;
  locked: boolean;
  saveState: string;
}

export function buildSpacePageScope(input: SpacePageScopeInput): SurfaceScopePayload {
  const { doc } = input;
  const status = doc === undefined ? "loading" : doc === null ? "not_found" : "loaded";
  if (!doc) return { space_id: input.spaceId, page_load_status: status } as SurfaceScopePayload;
  const blocks = input.liveBlocks ?? doc.blocks;
  return {
    space_id: input.spaceId,
    page_load_status: status,
    page_title: doc.title,
    page_body: bodyMarkdown(blocks, input.ctx),
    page_block_count: blocks.length,
    sub_pages: input.subPages,
    page_path: input.path,
    page_can_edit: input.editable,
    page_edit_blocked_reason: input.editable
      ? null
      : !input.canEdit
        ? "The person can read this page but not edit it."
        : input.inTrash
          ? "The page is in Trash."
          : input.locked
            ? "The page is locked."
            : null,
    page_save_state: input.saveState,
  } as SurfaceScopePayload;
}
