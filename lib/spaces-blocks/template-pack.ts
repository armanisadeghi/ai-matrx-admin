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
  /** pages[0] is the root page; "Use template" opens it. */
  pages: PackPage[];
  /**
   * Records-check findings the pack keeps on purpose, each with its reason (the agency sample's all-yellow
   * win kinds match its reference). A waiver that no longer matches a finding is itself a finding.
   */
  waivers?: Array<{ at: string; because: string }>;
}

/** What the card carries under `space` (custom.template.card.space). */
export interface SpaceTemplateCardFace extends PackIdentity {
  pages: number;
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
}

export interface PackResolution {
  tables: Record<string, ResolvedTable>;
  /** page key → the made page's id. */
  pages: Record<string, string>;
  /** A fresh block id (each use gets new ids). */
  newId: () => string;
}

const FIELD_REFS = ["groupField", "dateField"] as const;

/** A block view with every field it names moved onto the install's keys. */
function viewOnKeys(view: Record<string, unknown>, keys: Record<string, string> | undefined): Record<string, unknown> {
  if (!keys || !Object.keys(keys).length) return view;
  const k = (x: unknown) => (typeof x === "string" ? (keys[x] ?? x) : x);
  const next: Record<string, unknown> = { ...view };
  for (const f of FIELD_REFS) if (typeof view[f] === "string") next[f] = k(view[f]);
  if (Array.isArray(view.sorts)) next.sorts = (view.sorts as Array<{ field: string }>).map((s) => ({ ...s, field: k(s.field) }));
  if (view.filters && typeof view.filters === "object") next.filters = Object.fromEntries(Object.entries(view.filters as Record<string, unknown>).map(([f, v]) => [k(f), v]));
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
          ...(Array.isArray(props.views) ? { views: (props.views as Array<Record<string, unknown>>).map((v) => viewOnKeys(v, t?.keys)) } : {}),
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
