// lib/spaces-blocks/template-pack.ts — THE SPACE TEMPLATE PACK: one Notion-grade template as data.
//
// A pack is the template's identity (catalogue id, version, title, icon, cover, category, tags, one line,
// who it is for), its tables as a records `TemplateSpec` (the ONE table format — sample rows live there),
// and a page tree whose blocks are ordinary stored Space blocks (BLOCK-SCHEMA) except for three TOKENS,
// resolved to real ids when the pack is used:
//
//   database / chart block   props.source = { kind: "template", table: "<table token>", view?: "<view token>" }
//   page / linkToPage block  props.spaceId = "page:<page key>"
//   a span                   link = "page:<page key>"   or   mention = { kind: "space", spaceId: "page:<key>" }
//
// A pack may also carry a BOARD (`board`): chapters (frames) whose tiles name tables by the same table token
// (`{ kind: "table", table: "<token>", layout: "section" }`), plus child boards. The Board gallery's "Use
// template" installs the tables through the same door, then makes the board with the made table ids.
//
// Block ids are optional in a pack (each use gives every block a fresh id). The pack is stored as a
// platform `custom.template` row: the spec is the row's spec with the pack riding in it as `spacePack`,
// and the card carries `space` (what the Spaces gallery shows). See
// common-docs/projects/spaces-templates/AUTHORING.md. The checker is template-pack-check.ts.
//
// Pure: no React, no store, no feature import (this folder sits outside the Spaces fence).

import type { TemplateSpec } from "@ai-matrx/records/templates";

import type { PageProperty, RichSpan, SpaceBlock, SpaceColor, SpaceMedia, SpacePageSettings } from "./types";

export const SPACE_PACK_VERSION = 1 as const;

/** The gallery's categories (left rail), in the order it lists them. Closed: add one here, never invent one in a pack. */
export const SPACE_TEMPLATE_CATEGORIES = [
  { key: "projects", label: "Projects & tasks" },
  { key: "meetings", label: "Meetings & notes" },
  { key: "clients", label: "Clients & CRM" },
  { key: "marketing", label: "Marketing & content" },
  { key: "sales", label: "Sales" },
  { key: "planning", label: "Planning & goals" },
  { key: "team", label: "Team & HR" },
  { key: "docs", label: "Docs & wikis" },
  { key: "operations", label: "Operations" },
  { key: "finance", label: "Finance" },
  { key: "education", label: "School & learning" },
  { key: "personal", label: "Personal" },
] as const;
export type SpaceTemplateCategory = (typeof SPACE_TEMPLATE_CATEGORIES)[number]["key"];

/** A pack's catalogue id: "SP0002". The agency sample keeps the id its installs already carry. */
export const SPACE_PACK_ID = /^SP\d{4}$/;
export const LEGACY_PACK_IDS: readonly string[] = ["T-SPACES-1"];

/** One pack block: a stored block whose id may be left out and whose children are pack blocks. */
export interface PackBlock {
  id?: string;
  type: string;
  text?: RichSpan[];
  color?: SpaceColor;
  background?: SpaceColor;
  props?: Record<string, unknown>;
  children?: PackBlock[];
}

/** One page of the pack. The first page is the root (parent null); every other page names its parent's key. */
export interface PackPage {
  /** Stable within the pack: lowercase letters, digits and dashes ("weekly-review"). */
  key: string;
  parent: string | null;
  title: string;
  icon?: SpaceMedia | null;
  cover?: (SpaceMedia & { offsetY?: number }) | null;
  settings?: Partial<SpacePageSettings>;
  properties?: PageProperty[];
  blocks: PackBlock[];
}

/** The template's identity — what the gallery card and preview show. */
export interface PackIdentity {
  title: string;
  /** One line, under ~90 characters. */
  description: string;
  /** Who it is for, in a few words ("Small teams shipping projects"). */
  forWho: string;
  icon: SpaceMedia;
  cover?: (SpaceMedia & { offsetY?: number }) | null;
  category: SpaceTemplateCategory;
  /** 1–6 lowercase search words. */
  tags: string[];
}

export interface SpaceTemplatePack extends PackIdentity {
  packVersion: typeof SPACE_PACK_VERSION;
  /** Equals spec.catalogueId. */
  catalogueId: string;
  /** Equals spec.version; bumped on every published change. */
  version: number;
  /** The tables, views, relationships and sample rows. */
  spec: TemplateSpec;
  /** pages[0] is the root page; "Use template" opens it. Empty only when the pack carries a `board`. */
  pages: PackPage[];
  /**
   * A BOARD the pack makes instead of (or beside) pages: its chapters (frames) hold tiles that name the
   * pack's tables by TOKEN. "Use template" on the Board gallery installs the tables, then makes this board
   * (and its child pages) with every table tile pointed at the made table. See PackBoard.
   */
  board?: PackBoard;
  /**
   * Records-check findings the pack keeps on purpose, each with its reason (the agency sample's all-yellow
   * win kinds match its reference). A waiver that no longer matches a finding is itself a finding.
   */
  waivers?: Array<{ at: string; because: string }>;
}

/** What the card carries under `space` (custom.template.card.space). */
export interface SpaceTemplateCardFace extends PackIdentity {
  pages: number;
  /** Set when the pack makes a board: what the Board gallery lists (the Spaces gallery lists only packs with pages). */
  board?: { title: string; chapters: number; pages: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// The board a pack makes (Board gallery "Use template")
// ─────────────────────────────────────────────────────────────────────────────

/** What a board tile shows: an installed table (by token), the person's own Note (seeded), or words kept on the board. */
export const PACK_BOARD_TILE_KINDS = ["table", "note", "writeUp"] as const;
export type PackBoardTileKind = (typeof PACK_BOARD_TILE_KINDS)[number];

/** One tile of a board chapter. */
export interface PackBoardTile {
  kind: PackBoardTileKind;
  title: string;
  /** kind "table": the spec table's token. */
  table?: string;
  /** kind "table": "section" draws the table as a titled, grouped, edit-in-place section (records-ui SectionCard). Default "table". */
  layout?: "section" | "table";
  /** kind "note": the words the new Note starts with (its first line names it); kind "writeUp": the markdown. */
  text?: string;
  /** World px. In page layout a chapter is PACK_BOARD_COLUMN wide, so a full-width tile is PACK_BOARD_TILE_W. */
  size: { w: number; h: number };
}

/** One chapter: a frame, in reading order, holding its tiles. */
export interface PackBoardChapter {
  title: string;
  /** The frame's own note. */
  note?: string;
  tiles: PackBoardTile[];
}

/** One board (the top board, or one of its pages). */
export interface PackBoardPage {
  /** Stable within the pack: lowercase letters, digits and dashes. */
  key: string;
  title: string;
  /** "page" reads top to bottom with the chapters in an outline; "canvas" (default) is the free canvas. */
  layout?: "page" | "canvas";
  chapters: PackBoardChapter[];
}

/** The top board and its child boards (pages, one level: each is filed under the top board). */
export interface PackBoard extends PackBoardPage {
  pages?: PackBoardPage[];
}

/** The page-layout column (features/board/engine/page-layout.ts PAGE_COLUMN_W) and the widest tile inside a chapter. */
export const PACK_BOARD_COLUMN = 1100;
export const PACK_BOARD_TILE_W = 1020;

/** The pack's boards, top board first. */
export function packBoards(board: PackBoard): PackBoardPage[] {
  const { pages, ...top } = board;
  return [top, ...(pages ?? [])];
}

/** The card face of a pack. */
export function packCardFace(pack: SpaceTemplatePack): SpaceTemplateCardFace {
  return {
    title: pack.title,
    description: pack.description,
    forWho: pack.forWho,
    icon: pack.icon,
    cover: pack.cover ?? null,
    category: pack.category,
    tags: [...pack.tags],
    pages: pack.pages.length,
    ...(pack.board
      ? { board: { title: pack.board.title, chapters: pack.board.chapters.length, pages: pack.board.pages?.length ?? 0 } }
      : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_TOKEN = "page:";

/** A database block's template source. */
export interface PackTableSource {
  kind: "template";
  table: string;
  view?: string;
}

export function isPackTableSource(s: unknown): s is PackTableSource {
  return !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "template" && typeof (s as { table?: unknown }).table === "string";
}

export function pageKeyOf(ref: unknown): string | null {
  return typeof ref === "string" && ref.startsWith(PAGE_TOKEN) ? ref.slice(PAGE_TOKEN.length) : null;
}

/** One installed table as a pack use sees it. */
export interface ResolvedTable {
  tableId: string;
  viewIds: Record<string, string>;
  /** spec field key → this install's key where they differ (an upgraded install renames a converted column). */
  keys?: Record<string, string>;
  /** Set for the gallery's in-memory preview: the sample world the table lives in. */
  sample?: string;
  /** This install's field key → field id: a block view's `where` names fields by id (records-ui Condition). */
  fieldIds?: Record<string, string>;
  /**
   * The gallery preview's sample rows (memory store): the day they are read against and the values one column
   * holds. The memory store answers no `within` node, so a relative window is asked as "is one of the values
   * that fall in it" — the same rows the live store would answer on that day.
   */
  preview?: { today: string; valuesOf: (key: string) => unknown[] };
}

export interface PackResolution {
  tables: Record<string, ResolvedTable>;
  /** page key → the made page's id. */
  pages: Record<string, string>;
  /** A fresh block id (each use gets new ids). */
  newId: () => string;
}

const FIELD_REFS = ["groupField", "dateField"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Block-view filter words: relative days, "me", any-of (the same words as a store view, by field KEY)
// ─────────────────────────────────────────────────────────────────────────────

/** The day ranges a view can ask of a date column, read in the reader's own day (custom.relative_window_for_reader). */
export const PACK_RELATIVE_DAYS = ["today", "tomorrow", "yesterday", "this_week", "next_week", "last_week", "this_month", "next_month", "last_month", "before_today", "next_days", "past_days"] as const;
export type PackRelativeDay = (typeof PACK_RELATIVE_DAYS)[number];
/** `next_days` / `past_days` count `n` days (1–3660); every other range is fixed. */
export interface PackRelativeWindow {
  relative: PackRelativeDay;
  n?: number;
}

/**
 * What a pack's database-block view may declare beside `filters`, by field key. At install they become the
 * block view's `where` (the store's Rule shape, fields by id) together with the view's `filters`:
 *   within  { "due_on": { "relative": "this_week" } }        a date / datetime / created / edited time column
 *   me      ["owner"]                                         a member / created_by / modified_by column
 *   anyOf   { "status": ["To do", "Doing"] }                  any of these choices
 */
export interface PackViewFilterWords {
  within?: Record<string, PackRelativeWindow>;
  me?: string[];
  anyOf?: Record<string, string[]>;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => iso(new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000));
const addMonths = (day: string, n: number) => {
  const d = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return iso(d);
};

/**
 * The calendar days a relative window covers on `today` ("YYYY-MM-DD"), half-open [from, to) — the same
 * arithmetic as custom.relative_window_for_reader (weeks start Monday, the store's default calendar).
 */
export function relativeWindowDays(w: PackRelativeWindow, today: string): { from?: string; to?: string } {
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const ws = addDays(today, -dow);
  const ms = `${today.slice(0, 7)}-01`;
  const n = Math.max(0, Math.min(3660, Math.trunc(w.n ?? 0)));
  switch (w.relative) {
    case "today": return { from: today, to: addDays(today, 1) };
    case "tomorrow": return { from: addDays(today, 1), to: addDays(today, 2) };
    case "yesterday": return { from: addDays(today, -1), to: today };
    case "this_week": return { from: ws, to: addDays(ws, 7) };
    case "next_week": return { from: addDays(ws, 7), to: addDays(ws, 14) };
    case "last_week": return { from: addDays(ws, -7), to: ws };
    case "this_month": return { from: ms, to: addMonths(ms, 1) };
    case "next_month": return { from: addMonths(ms, 1), to: addMonths(ms, 2) };
    case "last_month": return { from: addMonths(ms, -1), to: ms };
    case "before_today": return { to: today };
    case "next_days": return { from: today, to: addDays(today, n) };
    case "past_days": return { from: addDays(today, -n), to: today };
  }
}

/** Does a stored date value ("YYYY-MM-DD" or an instant) fall on a day of the window? */
function inWindow(value: unknown, range: { from?: string; to?: string }): boolean {
  if (typeof value !== "string" || value.length < 10) return false;
  const day = value.length === 10 ? value : iso(new Date(value));
  return (range.from === undefined || day >= range.from) && (range.to === undefined || day < range.to);
}

const eqNode = (field: string, value: unknown) => ({ op: "eq", args: [{ field }, { const: value }] });

/**
 * A pack block view's `filters` + `within` + `me` + `anyOf` as ONE `where` (fields by id), ANDed — the shape
 * the block's grid asks the store (DatabaseBlock / records-ui TablePage, where a `where` outranks `filters`,
 * so the view's plain filters move into it too). Undefined when the view declares none of the three words.
 */
export function packViewWhere(view: Record<string, unknown>, table: ResolvedTable | undefined): Record<string, unknown> | undefined {
  const words = view as PackViewFilterWords & { filters?: Record<string, unknown> };
  const within = Object.entries(words.within ?? {});
  const me = words.me ?? [];
  const anyOf = Object.entries(words.anyOf ?? {}).filter(([, vals]) => Array.isArray(vals) && vals.length);
  if (!within.length && !me.length && !anyOf.length) return undefined;
  const idOf = (key: string) => table?.fieldIds?.[key] ?? key;
  const args: Record<string, unknown>[] = [];
  for (const [key, v] of Object.entries(words.filters ?? {})) {
    args.push(Array.isArray(v) ? { op: "or", args: v.map((x) => eqNode(idOf(key), x)) } : eqNode(idOf(key), v));
  }
  for (const [key, vals] of anyOf) args.push({ op: "or", args: vals.map((x) => eqNode(idOf(key), x)) });
  for (const [key, w] of within) {
    if (table?.preview) {
      const range = relativeWindowDays(w, table.preview.today);
      const hits = [...new Set(table.preview.valuesOf(key).filter((x) => inWindow(x, range)))];
      args.push({ op: "or", args: hits.map((x) => eqNode(idOf(key), x)) });
    } else {
      args.push({ op: "within", args: [{ field: idOf(key) }, { const: { relative: w.relative, ...(w.n !== undefined ? { n: w.n } : {}) } }] });
    }
  }
  for (const key of me) args.push(eqNode(idOf(key), { me: true }));
  return { op: "and", args };
}

/** A block view as stored: its filter words folded into `where` (see packViewWhere), the words themselves gone. */
function viewWithWhere(view: Record<string, unknown>, table: ResolvedTable | undefined): Record<string, unknown> {
  const where = packViewWhere(view, table);
  const { within: _w, me: _m, anyOf: _a, ...rest } = view;
  if (!where) return rest;
  const { filters: _f, ...plain } = rest;
  return { ...plain, where };
}

/** A block view with every field it names moved onto the install's keys. */
function viewOnKeys(view: Record<string, unknown>, keys: Record<string, string> | undefined): Record<string, unknown> {
  if (!keys || !Object.keys(keys).length) return view;
  const k = (x: unknown) => (typeof x === "string" ? (keys[x] ?? x) : x);
  const next: Record<string, unknown> = { ...view };
  for (const f of FIELD_REFS) if (typeof view[f] === "string") next[f] = k(view[f]);
  if (Array.isArray(view.sorts)) next.sorts = (view.sorts as Array<{ field: string }>).map((s) => ({ ...s, field: k(s.field) }));
  if (view.filters && typeof view.filters === "object") next.filters = Object.fromEntries(Object.entries(view.filters as Record<string, unknown>).map(([f, v]) => [k(f), v]));
  if (view.within && typeof view.within === "object") next.within = Object.fromEntries(Object.entries(view.within as Record<string, unknown>).map(([f, v]) => [k(f), v]));
  if (view.anyOf && typeof view.anyOf === "object") next.anyOf = Object.fromEntries(Object.entries(view.anyOf as Record<string, unknown>).map(([f, v]) => [k(f), v]));
  if (Array.isArray(view.me)) next.me = (view.me as unknown[]).map(k);
  if (Array.isArray(view.hiddenFields)) next.hiddenFields = (view.hiddenFields as unknown[]).map(k);
  const chart = view.chart as Record<string, unknown> | undefined;
  if (chart) next.chart = { ...chart, groupBy: k(chart.groupBy) ?? null, ...(chart.field !== undefined ? { field: k(chart.field) } : {}) };
  return next;
}

function resolveSpans(spans: RichSpan[] | undefined, r: PackResolution): RichSpan[] | undefined {
  return spans?.map((s) => {
    let out = s;
    const linkKey = pageKeyOf(s.link);
    if (linkKey !== null) out = { ...out, link: `/spaces/${r.pages[linkKey] ?? linkKey}` };
    const m = s.mention;
    if (m && m.kind === "space") {
      const key = pageKeyOf(m.spaceId);
      if (key !== null) out = { ...out, mention: { ...m, spaceId: r.pages[key] ?? key } };
    }
    return out;
  });
}

/** The pack's blocks as stored blocks: fresh ids, tokens swapped for the made tables and pages. */
export function resolvePackBlocks(blocks: PackBlock[], r: PackResolution): SpaceBlock[] {
  return blocks.map((b): SpaceBlock => {
    let props = b.props;
    if (props) {
      const spaceKey = pageKeyOf(props.spaceId);
      if (spaceKey !== null) props = { ...props, spaceId: r.pages[spaceKey] ?? spaceKey };
      if (isPackTableSource(props.source)) {
        const src = props.source;
        const t = r.tables[src.table];
        const viewId = src.view && t ? t.viewIds[src.view] : undefined;
        const { sample: _drop, ...rest } = props;
        props = {
          ...rest,
          source: viewId ? { kind: "table", tableId: t?.tableId ?? src.table, viewId } : { kind: "table", tableId: t?.tableId ?? src.table },
          ...(t?.sample ? { sample: t.sample } : {}),
          ...(Array.isArray(props.views) ? { views: (props.views as Array<Record<string, unknown>>).map((v) => viewWithWhere(viewOnKeys(v, t?.keys), t)) } : {}),
        };
      }
    }
    const text = resolveSpans(b.text, r);
    return {
      id: r.newId(),
      type: b.type,
      ...(text !== undefined ? { text } : {}),
      ...(b.color !== undefined ? { color: b.color } : {}),
      ...(b.background !== undefined ? { background: b.background } : {}),
      ...(props !== undefined ? { props } : {}),
      ...(b.children ? { children: resolvePackBlocks(b.children, r) } : {}),
    };
  });
}

export const PACK_DEFAULT_SETTINGS: SpacePageSettings = { font: "default", smallText: false, fullWidth: false, locked: false };

export function packPageSettings(page: PackPage): SpacePageSettings {
  return { ...PACK_DEFAULT_SETTINGS, ...(page.settings ?? {}) };
}

/** Pages ordered so every parent comes before its children (the order they are made in). */
export function packPagesInOrder(pages: PackPage[]): PackPage[] {
  const out: PackPage[] = [];
  const placed = new Set<string>();
  const visit = (parent: string | null) => {
    for (const p of pages) {
      if (p.parent !== parent || placed.has(p.key)) continue;
      placed.add(p.key);
      out.push(p);
      visit(p.key);
    }
  };
  visit(null);
  return out;
}

/** What `custom.template_declare` is sent for a pack: the records declaration plus the pack and the card face. */
export function packDeclaration<D extends { card: object }>(pack: SpaceTemplatePack, declaration: D): D & { spacePack: Omit<SpaceTemplatePack, "spec"> } {
  const { spec: _spec, ...rest } = pack;
  return { ...declaration, card: { ...declaration.card, name: pack.title, space: packCardFace(pack) }, spacePack: rest };
}
