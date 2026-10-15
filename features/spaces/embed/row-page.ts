// features/spaces/embed/row-page.ts — a table row's PAGE: the one Spaces page linked to the row (`row_body`).
//
// A row opened by someone who may edit it gets its page the first time (`content.row_page_ensure`, which
// never overwrites a page that exists). The new page starts from, in order:
//   1. the row's Notes — the formatted-text column the record page used as its body — turned into blocks
//      by the importer's Markdown reader. The column itself is never written (zero loss: the grid, the
//      peek, exports and agents read it as before);
//   2. the table's default row template body (`custom.row_template_default`), with fresh block ids, so its
//      "This page's row" views (data/this-row.ts) arrive narrowed to THIS row.
// The template's preset field values (the same ones "From template" applies) land on the row too, when the
// page is first made — only into columns the row left empty; a value the row already has is never replaced.
// Plan: common-docs/systems/data/custom-data/projects/row-pages/PLAN.md.

import { notionMarkdownToBlocks } from "@/lib/spaces-blocks/notion-markdown";
import { validateBlocks } from "@/lib/spaces-blocks/schema";
import type { SpaceBlock } from "@/lib/spaces-blocks/types";

export interface RowPageBody {
  v: 1;
  blocks: SpaceBlock[];
}

/** A template's blocks with new ids (a block id is unique per page; children too). */
export function freshBlockIds(blocks: readonly SpaceBlock[], makeId: () => string = () => crypto.randomUUID()): SpaceBlock[] {
  return blocks.map((b) => ({ ...b, id: makeId(), ...(Array.isArray(b.children) ? { children: freshBlockIds(b.children, makeId) } : {}) }));
}

/** A stored template body, when it is one ({"v": 1, "blocks": [...]}). */
export function readTemplateBody(raw: unknown): RowPageBody | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { v?: unknown; blocks?: unknown };
  return body.v === 1 && Array.isArray(body.blocks) ? { v: 1, blocks: body.blocks as SpaceBlock[] } : null;
}

/** The first snapshot of a row's page: its notes, then its table's default template. */
export function rowPageSnapshot(args: { recordId: string; notes: string | null | undefined; template: RowPageBody | null; makeId?: () => string }): RowPageBody {
  const notes = typeof args.notes === "string" && args.notes.trim() !== "" ? notionMarkdownToBlocks(args.notes, { idSeed: `row:${args.recordId}:notes` }).blocks : [];
  const template = args.template ? freshBlockIds(args.template.blocks, args.makeId) : [];
  return { v: 1, blocks: [...notes, ...template] };
}

/** The page's blocks as a row template body (what "Use this page as the template" keeps). */
export function templateBodyOf(blocks: readonly SpaceBlock[]): RowPageBody {
  return { v: 1, blocks: [...blocks] };
}

type Rpc = <T>(fn: string, args: Record<string, unknown>) => Promise<{ data: T | null; error: { code?: string; message: string } | null }>;
export interface RowPageDb {
  schema: (name: "custom" | "content") => { rpc: Rpc };
}

/** The table's default row template: its page body (or null) and its preset field values. */
export interface DefaultTemplate {
  body: RowPageBody | null;
  values: Record<string, unknown>;
}

/** The table's default row template, or null when it has none. */
export async function readDefaultTemplate(db: RowPageDb, organizationId: string, tableId: string): Promise<DefaultTemplate | null> {
  const { data, error } = await db.schema("custom").rpc<Array<{ body: unknown; values: unknown }>>("row_template_default", { p_organization_id: organizationId, p_table_id: tableId });
  if (error) throw new Error(`The table's template could not be read: ${error.message}`);
  const row = data?.[0];
  if (!row) return null;
  const values = row.values && typeof row.values === "object" && !Array.isArray(row.values) ? (row.values as Record<string, unknown>) : {};
  return { body: readTemplateBody(row.body), values };
}

const isEmptyValue = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

/** The template's preset values for the columns the row left empty (a value the row has is never replaced). */
export function presetsForEmptyColumns(document: Record<string, unknown> | null | undefined, values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) if (!isEmptyValue(value) && isEmptyValue(document?.[key])) out[key] = value;
  return out;
}

/** The row's page: the one it has, or a new one made from its notes and its table's default template. */
export async function ensureRowPage(
  db: RowPageDb,
  args: {
    organizationId: string;
    tableId: string;
    recordId: string;
    title: string;
    notes: string | null | undefined;
    /** The row as read (its document): the template's presets fill only the columns it left empty. */
    document?: Record<string, unknown> | null;
    /** Writes the presets to the row (a version-checked update). Called once, only when the page is made now. */
    applyValues?: (patch: Record<string, unknown>) => Promise<void>;
  },
): Promise<{ spaceId: string; created: boolean }> {
  const found = await readDefaultTemplate(db, args.organizationId, args.tableId);
  const snapshot = rowPageSnapshot({ recordId: args.recordId, notes: args.notes, template: found?.body ?? null });
  const problems = validateBlocks(snapshot.blocks);
  if (problems.length) throw new Error(`This row's page could not be started: ${problems[0]}`);
  const { data, error } = await db.schema("content").rpc<Array<{ space_id: string; created: boolean }>>("row_page_ensure", {
    p_organization_id: args.organizationId,
    p_record_id: args.recordId,
    p_title: args.title,
    p_snapshot: snapshot,
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) throw new Error("This row's page could not be started.");
  // A NEW row page from the default template: its preset values land on the row too (only where empty).
  if (row.created && found && args.applyValues) {
    const patch = presetsForEmptyColumns(args.document, found.values);
    if (Object.keys(patch).length > 0) await args.applyValues(patch);
  }
  return { spaceId: row.space_id, created: row.created };
}

/**
 * "Use this page as the template": the row's page (its blocks, "This page's row" views included) becomes
 * its table's default row template, so every row's page made from now on starts from it. Its preset
 * values are left as the template had them (a new template presets none).
 */
export async function saveRowPageAsTemplate(
  db: RowPageDb,
  page: { findPageId: (recordId: string) => Promise<string | null>; readPage: (spaceId: string) => Promise<{ blocks: SpaceBlock[] } | null> },
  args: { organizationId: string; tableId: string; recordId: string; name: string },
): Promise<string> {
  const spaceId = await page.findPageId(args.recordId);
  if (!spaceId) throw new Error("This row has no page yet.");
  const found = await page.readPage(spaceId);
  if (!found) throw new Error("This row's page can't be opened.");
  const { data, error } = await db.schema("custom").rpc<string>("row_template_declare", {
    p_organization_id: args.organizationId,
    p_table_id: args.tableId,
    p_spec: { name: args.name, body: templateBodyOf(found.blocks), default: true },
  });
  if (error) throw new Error(error.message);
  return String(data);
}

/**
 * The id of the row's page (`row_body`), asked through the read door `content.row_page_for`: whoever may read
 * the row (View, Comment or Edit) gets its page at that level — the edge itself is hidden from a reader outside
 * the row's organization, so a plain select of it answered "no page" for exactly the people a row is shared with.
 * Null = no page, or no access to the row.
 */
export async function findRowPageId(db: RowPageDb, recordId: string): Promise<string | null> {
  const { data, error } = await db.schema("content").rpc<string | null>("row_page_for", { p_record_id: recordId });
  if (error) throw new Error(error.message);
  return data ?? null;
}
