// lib/spaces-blocks/template-pack-check.ts — THE PACK CHECKER: every rule a Space template pack must pass,
// with no database. Run it with `pnpm spaces:templates:check <file|dir>` (features/spaces/templates/check.ts).
//
// What it proves, in order:
//   1. the pack's own shape (identity, catalogue id, version, category, tags, page tree);
//   2. every page, with its tokens resolved to stand-in ids, is a valid stored Space snapshot — both
//      the TypeScript validator (validateSnapshot: unique ids, block rules) and the generated JSON
//      schema the database enforces (content.space_snapshot_schema(), buildSpaceSnapshotSchema);
//   3. every token resolves: a database block's table and view exist in the spec (the view on that
//      table), every field a block view names is a field of that table, every page link names a page;
//   4. the TemplateSpec passes the records package's own validator (validateTemplate, "describe"
//      profile: every table, field, link, view and form rule the store enforces) plus this library's
//      bar (sample rows in every table). A finding the pack keeps on purpose is waived by name, with a reason.
//
// Every finding is { at, says }: `at` is the path in the file, `says` the fix.

import type { ValidateFunction } from "ajv";
import { Ajv2020 } from "ajv/dist/2020";
import { allTables, validateTemplate, type AgentSnapshotRow, type TemplateSpec } from "@ai-matrx/records/templates";

import { buildSpaceSnapshotSchema } from "./jsonSchema";
import { validateSnapshot } from "./schema";
import {
  LEGACY_PACK_IDS,
  PACK_RELATIVE_DAYS,
  PAGE_TOKEN,
  SPACE_PACK_ID,
  SPACE_PACK_VERSION,
  SPACE_TEMPLATE_CATEGORIES,
  isPackTableSource,
  packPageSettings,
  pageKeyOf,
  resolvePackBlocks,
  type PackBlock,
  type PackPage,
  type SpaceTemplatePack,
} from "./template-pack";
import type { RichSpan } from "./types";

export interface PackFinding {
  at: string;
  says: string;
}

export interface PackCheckOptions {
  /** The platform agents a spec may copy (aidream's templates/AGENTS.snapshot.json). */
  agents?: AgentSnapshotRow[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const PAGE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TAG = /^[a-z0-9][a-z0-9 &-]{0,23}$/;
/** Each table seeds at least this many sample rows, so every view opens on real-looking data. */
export const MIN_SAMPLE_ROWS = 3;

let schemaValidator: ValidateFunction | null = null;
function snapshotSchema() {
  schemaValidator ??= new Ajv2020({ allErrors: true, strict: false }).compile(buildSpaceSnapshotSchema());
  return schemaValidator;
}

function mediaOk(m: unknown): boolean {
  if (!isObj(m)) return false;
  return ["fileId", "url", "icon", "emoji"].filter((k) => str(m[k])).length === 1;
}

/** Every finding in one pack. Empty = it may be published. */
export function checkPack(raw: unknown, options: PackCheckOptions = {}): PackFinding[] {
  const out: PackFinding[] = [];
  const say = (at: string, says: string) => out.push({ at, says });
  if (!isObj(raw)) return [{ at: "(file)", says: "A pack is one JSON object; this file holds something else." }];
  const pack = raw as unknown as SpaceTemplatePack;

  // ── 1. identity ────────────────────────────────────────────────────────────
  if (pack.packVersion !== SPACE_PACK_VERSION) say("packVersion", `Write "packVersion": ${SPACE_PACK_VERSION}.`);
  if (!str(pack.catalogueId) || !(SPACE_PACK_ID.test(pack.catalogueId) || LEGACY_PACK_IDS.includes(pack.catalogueId)))
    say("catalogueId", `"${String(pack.catalogueId)}" is not a pack id. Use the next free "SP" number with four digits, like "SP0042" (catalog/ lists the taken ones).`);
  if (!Number.isInteger(pack.version) || pack.version < 1) say("version", "Write a whole-number version of 1 or more; bump it on every published change.");
  if (!str(pack.title)) say("title", "Give the template a title.");
  else if (pack.title.length > 48) say("title", `The title is ${pack.title.length} characters; keep it to 48 so the card shows it whole.`);
  if (!str(pack.description)) say("description", "Write the one-line description the card shows.");
  else if (pack.description.length > 90 || /\n/.test(pack.description)) say("description", `Keep the description to one line of at most 90 characters (it is ${pack.description.length}).`);
  if (!str(pack.forWho)) say("forWho", 'Say who it is for in a few words ("Small teams shipping client projects").');
  else if (pack.forWho.length > 60) say("forWho", `Keep forWho to 60 characters (it is ${pack.forWho.length}).`);
  if (!mediaOk(pack.icon)) say("icon", 'The template icon is one of { "emoji": "🗂️" } or { "icon": "<Lucide name>" }.');
  if (pack.cover !== undefined && pack.cover !== null && !mediaOk(pack.cover)) say("cover", 'A cover is { "url": "gallery:<name>" } (or null).');
  const cats = SPACE_TEMPLATE_CATEGORIES.map((c) => c.key) as string[];
  if (!cats.includes(String(pack.category))) say("category", `"${String(pack.category)}" is not a category. Use one of: ${cats.join(", ")}.`);
  if (!Array.isArray(pack.tags) || pack.tags.length < 1 || pack.tags.length > 6) say("tags", "Give 1 to 6 search tags.");
  else pack.tags.forEach((t, i) => (typeof t === "string" && TAG.test(t) ? null : say(`tags[${i}]`, `"${String(t)}" must be lowercase words (letters, digits, spaces, & or -), at most 24 characters.`)));

  // ── 2. the spec agrees with the pack ───────────────────────────────────────
  const spec = pack.spec as TemplateSpec | undefined;
  if (!isObj(spec)) {
    say("spec", "The pack needs its tables: a records TemplateSpec under \"spec\".");
    return out;
  }
  if (spec.catalogueId !== pack.catalogueId) say("spec.catalogueId", `Must equal the pack's catalogueId "${pack.catalogueId}".`);
  if (spec.version !== pack.version) say("spec.version", `Must equal the pack's version ${pack.version}.`);
  // The spec's own tables and the shared blocks it seeds (a Team table is a table too).
  let every: TemplateSpec["tables"] = [];
  try {
    every = allTables(spec);
  } catch (error) {
    say("spec.sharedBlocks", `The shared blocks could not be read: ${(error as Error).message}`);
  }
  const tables = new Map(every.map((t) => [t.token, t] as const));
  const views = new Map((spec.views ?? []).map((v) => [v.token, v] as const));
  for (const t of every) {
    if ((t.rows?.length ?? 0) < MIN_SAMPLE_ROWS) say(`spec.tables (${t.token}).rows`, `Seed at least ${MIN_SAMPLE_ROWS} realistic sample rows (it has ${t.rows?.length ?? 0}); every view opens on them.`);
  }

  // ── 3. the page tree ───────────────────────────────────────────────────────
  const pages = Array.isArray(pack.pages) ? pack.pages : [];
  if (!pages.length) say("pages", "A pack has at least one page; pages[0] is the root \"Use template\" opens.");
  const keys = new Set<string>();
  pages.forEach((p, i) => {
    const at = `pages[${i}]`;
    if (!isObj(p)) {
      say(at, "A page is an object with key, parent, title and blocks.");
      return;
    }
    if (!str(p.key) || !PAGE_KEY.test(p.key)) say(`${at}.key`, `"${String(p.key)}" must be lowercase letters, digits and single dashes ("weekly-review").`);
    else if (keys.has(p.key)) say(`${at}.key`, `"${p.key}" is used by two pages; each page key is unique.`);
    else keys.add(p.key);
    if (!str(p.title)) say(`${at}.title`, "Give the page a title.");
    if (i === 0 && p.parent !== null) say(`${at}.parent`, "pages[0] is the root: write \"parent\": null.");
    if (i > 0 && p.parent === null) say(`${at}.parent`, "Only pages[0] is the root; name this page's parent key.");
    if (p.icon !== undefined && p.icon !== null && !mediaOk(p.icon)) say(`${at}.icon`, 'A page icon is { "emoji": "…" } or { "icon": "<Lucide name>" }.');
    if (!Array.isArray(p.blocks)) say(`${at}.blocks`, "A page's blocks are a list (it may be empty).");
  });
  pages.forEach((p, i) => {
    if (i > 0 && isObj(p) && p.parent !== null && !keys.has(String(p.parent))) say(`pages[${i}].parent`, `No page has the key "${String(p.parent)}".`);
  });
  // cycles: walk each page up to the root
  const parentOf = new Map(pages.filter(isObj).map((p) => [p.key, p.parent] as const));
  pages.forEach((p, i) => {
    if (!isObj(p)) return;
    let at: string | null = p.parent;
    for (let hops = 0; at !== null && hops <= pages.length; hops++) {
      if (at === p.key) {
        say(`pages[${i}].parent`, "This page is its own ancestor; the pages must form one tree under pages[0].");
        return;
      }
      at = parentOf.get(at) ?? null;
    }
  });

  // ── 4. every page: tokens, then the stored-snapshot rules ─────────────────
  const fakeTables = Object.fromEntries(
    [...tables.keys()].map((token, n) => [
      token,
      {
        tableId: `00000000-0000-4000-8000-${String(n + 1).padStart(12, "0")}`,
        viewIds: Object.fromEntries([...views.values()].filter((v) => v.table === token).map((v, k) => [v.token, `00000000-0000-4000-9000-${String(n * 100 + k + 1).padStart(12, "0")}`])),
      },
    ]),
  );
  const fakePages = Object.fromEntries([...keys].map((k, n) => [k, `00000000-0000-4000-a000-${String(n + 1).padStart(12, "0")}`]));
  pages.forEach((p, i) => {
    if (!isObj(p) || !Array.isArray(p.blocks)) return;
    const base = `pages[${i}] (${p.key})`;
    checkTokens(p.blocks, `${base}.blocks`, { tables, views, keys }, say);
    let n = 0;
    const blocks = resolvePackBlocks(p.blocks, { tables: fakeTables, pages: fakePages, newId: () => `b${++n}` });
    const snapshot = { v: 1, settings: packPageSettings(p as PackPage), icon: p.icon ?? null, cover: p.cover ?? null, ...(p.properties ? { properties: p.properties } : {}), blocks };
    for (const problem of validateSnapshot(snapshot)) say(base, `${problem} (the stored-page rules, BLOCK-SCHEMA.md).`);
    const schema = snapshotSchema();
    if (!schema(snapshot)) {
      const seen = new Set<string>();
      for (const e of schema.errors ?? []) {
        if (e.keyword === "if" || e.keyword === "allOf") continue;
        const line = `${e.instancePath || "/"} ${e.message ?? "is invalid"}${e.params && "allowedValues" in e.params ? ` (${(e.params.allowedValues as unknown[]).join(", ")})` : ""}`;
        if (seen.has(line)) continue;
        seen.add(line);
        say(base, `JSON schema: ${line} — the database refuses this page (content.space_snapshot_schema()).`);
      }
    }
  });

  // ── 4b. every row template body: the same stored-page rules ────────────────
  // A row template's body becomes the new row's page (features/spaces/embed/row-page.ts, fresh block ids),
  // so a body the database refuses fails at use time — "New" makes the row and then cannot start its page.
  // Judged here with stand-in ids, exactly as a page is.
  const withIds = (list: unknown, next: () => string): unknown =>
    Array.isArray(list) ? list.map((b) => (isObj(b) ? { ...b, id: next(), ...(Array.isArray(b.children) ? { children: withIds(b.children, next) } : {}) } : b)) : list;
  const specTables = isObj(spec) && Array.isArray((spec as { tables?: unknown }).tables) ? ((spec as { tables: unknown[] }).tables) : [];
  specTables.forEach((t, ti) => {
    if (!isObj(t) || !Array.isArray(t.rowTemplates)) return;
    (t.rowTemplates as unknown[]).forEach((rt, ri) => {
      if (!isObj(rt) || rt.body === undefined) return;
      const base = `spec.tables[${ti}].rowTemplates[${ri}]${str(rt.name) ? ` (${rt.name})` : ""}.body`;
      const body = rt.body;
      if (!isObj(body) || !Array.isArray(body.blocks)) {
        say(base, 'A row template body is { "v": 1, "blocks": [...] }.');
        return;
      }
      let n = 0;
      const snapshot = { v: 1, settings: packPageSettings({} as PackPage), icon: null, cover: null, blocks: withIds(body.blocks, () => `rt${++n}`) };
      for (const problem of validateSnapshot(snapshot)) say(base, `${problem} (the stored-page rules, BLOCK-SCHEMA.md).`);
      const schema = snapshotSchema();
      if (!schema(snapshot)) {
        const seen = new Set<string>();
        for (const e of schema.errors ?? []) {
          if (e.keyword === "if" || e.keyword === "allOf") continue;
          const line = `${e.instancePath || "/"} ${e.message ?? "is invalid"}`;
          if (seen.has(line)) continue;
          seen.add(line);
          say(base, `JSON schema: ${line} — the new row's page would be refused (content.space_snapshot_schema()).`);
        }
      }
    });
  });

  // ── 5. the records package's own check ─────────────────────────────────────
  const waivers = Array.isArray(pack.waivers) ? pack.waivers : [];
  waivers.forEach((w, i) => (isObj(w) && str(w.at) && str(w.because) ? null : say(`waivers[${i}]`, "A waiver names the finding's exact `at` and says `because`.")));
  const used = new Set<number>();
  let verdict: ReturnType<typeof validateTemplate> | null = null;
  try {
    verdict = validateTemplate(spec, { agents: options.agents, profile: "describe" });
  } catch (error) {
    say("spec", `The records validator could not read the spec: ${(error as Error).message}`);
  }
  for (const p of verdict?.problems ?? []) {
    // One waiver covers every finding at its `at` (a field can draw one finding per choice).
    const hit = waivers.findIndex((x) => isObj(x) && x.at === `spec.${p.at}`);
    if (hit >= 0) {
      used.add(hit);
      continue;
    }
    say(`spec.${p.at}`, p.says);
  }
  waivers.forEach((w, i) => (used.has(i) || !isObj(w) ? null : say(`waivers[${i}]`, `No finding at "${String(w.at)}" any more; remove the waiver.`)));
  return out;
}

interface TokenWorld {
  tables: Map<string, TemplateSpec["tables"][number]>;
  views: Map<string, TemplateSpec["views"][number]>;
  keys: Set<string>;
}

function checkSpans(spans: RichSpan[] | undefined, at: string, w: TokenWorld, say: (at: string, says: string) => void) {
  (spans ?? []).forEach((s, i) => {
    if (!isObj(s)) return;
    if (typeof s.link === "string") {
      if (s.link.startsWith("/spaces/")) say(`${at}.text[${i}].link`, `"${s.link}" points at one person's page. Link a pack page as "${PAGE_TOKEN}<key>".`);
      const key = pageKeyOf(s.link);
      if (key !== null && !w.keys.has(key)) say(`${at}.text[${i}].link`, `No page has the key "${key}".`);
    }
    const m = s.mention as { kind?: string; spaceId?: string } | undefined;
    if (m?.kind === "space") {
      const key = pageKeyOf(m.spaceId);
      if (key === null) say(`${at}.text[${i}].mention`, `Mention a pack page as "${PAGE_TOKEN}<key>".`);
      else if (!w.keys.has(key)) say(`${at}.text[${i}].mention`, `No page has the key "${key}".`);
    }
    if (/\bNotion\b/.test(s.text ?? "")) say(`${at}.text[${i}]`, "Write in our own words: the text names another product.");
  });
}

function checkTokens(blocks: PackBlock[], path: string, w: TokenWorld, say: (at: string, says: string) => void) {
  blocks.forEach((b, i) => {
    const at = `${path}[${i}]`;
    if (!isObj(b)) return;
    checkSpans(b.text, at, w, say);
    const props = isObj(b.props) ? b.props : undefined;
    if ((b.type === "page" || b.type === "linkToPage") && props) {
      const key = pageKeyOf(props.spaceId);
      if (key === null) say(`${at}.props.spaceId`, `A ${b.type} block names a pack page as "${PAGE_TOKEN}<key>".`);
      else if (!w.keys.has(key)) say(`${at}.props.spaceId`, `No page has the key "${key}".`);
    }
    if (b.type === "database" && props) {
      const src = props.source;
      if (isObj(src) && src.kind === "table") say(`${at}.props.source`, 'A pack never names a real table id. Write { "kind": "template", "table": "<table token>", "view": "<view token>" }.');
      else if (isObj(src) && src.kind !== "entity" && !isPackTableSource(src)) say(`${at}.props.source`, 'Write { "kind": "template", "table": "<table token>" } (or { "kind": "entity", "token": "task" } for a built-in module).');
      if (props.sample !== undefined) say(`${at}.props.sample`, "Leave sample out; the gallery preview sets it.");
      if (isPackTableSource(src)) {
        const table = w.tables.get(src.table);
        if (!table) say(`${at}.props.source.table`, `No table has the token "${src.table}". Tables: ${[...w.tables.keys()].join(", ") || "none"}.`);
        if (src.view !== undefined) {
          const view = w.views.get(src.view);
          if (!view) say(`${at}.props.source.view`, `No view has the token "${src.view}".`);
          else if (view.table !== src.table) say(`${at}.props.source.view`, `The view "${src.view}" is on the table "${view.table}", not "${src.table}".`);
        }
        const fields = new Set((table?.fields ?? []).map((f) => f.key));
        const typeOf = new Map((table?.fields ?? []).map((f) => [f.key, String(f.parityType)] as const));
        const choicesOf = new Map((table?.fields ?? []).map((f) => [f.key, (f as { choices?: unknown }).choices] as const));
        const views = Array.isArray(props.views) ? (props.views as Array<Record<string, unknown>>) : [];
        if (!views.length) say(`${at}.props.views`, 'Give the block at least one view: [{ "id": "view-table", "name": "Table", "layout": "grid" }].');
        const ids = new Set<string>();
        views.forEach((v, k) => {
          const vat = `${at}.props.views[${k}]`;
          if (!isObj(v)) return;
          if (typeof v.id === "string") {
            if (ids.has(v.id)) say(`${vat}.id`, `"${v.id}" is used by two views of this block.`);
            ids.add(v.id);
          }
          if (!table) return;
          const field = (name: unknown, where: string) => {
            if (typeof name !== "string" || name.startsWith("linked:")) return;
            if (!fields.has(name)) say(`${vat}.${where}`, `"${name}" is not a field of "${src.table}". Fields: ${[...fields].join(", ")}.`);
          };
          field(v.groupField, "groupField");
          field(v.dateField, "dateField");
          (Array.isArray(v.sorts) ? (v.sorts as Array<{ field?: unknown }>) : []).forEach((s, j) => field(s?.field, `sorts[${j}].field`));
          Object.keys(isObj(v.filters) ? v.filters : {}).forEach((f) => field(f, `filters.${f}`));
          (Array.isArray(v.hiddenFields) ? v.hiddenFields : []).forEach((f, j) => field(f, `hiddenFields[${j}]`));
          if (isObj(v.chart)) {
            field(v.chart.groupBy, "chart.groupBy");
            field(v.chart.field, "chart.field");
          }
          checkFilterWords(v, vat, src.table, fields, typeOf, choicesOf, say);
          if ((v.layout === "kanban" || v.layout === "board") && !str(v.groupField)) say(`${vat}.groupField`, "A board groups by a choice field: name it in groupField.");
          if ((v.layout === "calendar" || v.layout === "timeline") && !str(v.dateField)) say(`${vat}.dateField`, `A ${String(v.layout)} view places rows by a date field: name it in dateField.`);
        });
        if (typeof props.activeViewId === "string" && !ids.has(props.activeViewId)) say(`${at}.props.activeViewId`, `No view of this block has the id "${props.activeViewId}".`);
      }
    }
    if (Array.isArray(b.children)) checkTokens(b.children, `${at}.children`, w, say);
  });
}

const DATE_KINDS = ["datetime", "date", "created_time", "modified_time"];
const PERSON_KINDS = ["member", "created_by", "modified_by"];
/** Layouts whose body asks the store with the view's `where` (a chart and a form read `filters` only). */
const WHERE_LAYOUTS = ["grid", "kanban", "board", "gallery", "list", "calendar", "timeline"];

/** A block view's `within` / `me` / `anyOf` (by field key), as the install folds them into its `where`. */
function checkFilterWords(
  v: Record<string, unknown>,
  vat: string,
  table: string,
  fields: Set<string>,
  typeOf: Map<string, string>,
  choicesOf: Map<string, unknown>,
  say: (at: string, says: string) => void,
) {
  const has = v.within !== undefined || v.me !== undefined || v.anyOf !== undefined;
  if (v.where !== undefined) say(`${vat}.where`, 'A pack never writes `where` (it names fields by install-time id). Write "within", "me" or "anyOf" by field key; the install builds the where.');
  if (!has) return;
  if (!WHERE_LAYOUTS.includes(String(v.layout))) say(`${vat}.layout`, `A ${String(v.layout)} view reads only "filters"; put within / me / anyOf on a grid, board, list, gallery, calendar or timeline view.`);
  const filters = isObj(v.filters) ? v.filters : {};
  if (Object.values(filters).includes("@this-row")) say(`${vat}.filters`, "\"This page's row\" cannot sit beside within / me / anyOf; keep the view to one or the other.");
  const known = (key: string, at: string) => {
    if (fields.has(key)) return true;
    say(at, `"${key}" is not a field of "${table}". Fields: ${[...fields].join(", ")}.`);
    return false;
  };
  if (v.within !== undefined) {
    if (!isObj(v.within)) say(`${vat}.within`, 'Write within as { "<date field key>": { "relative": "this_week" } }.');
    else
      for (const [key, w] of Object.entries(v.within)) {
        const at = `${vat}.within.${key}`;
        if (!known(key, at)) continue;
        if (!DATE_KINDS.includes(typeOf.get(key) ?? "")) say(at, `"${key}" is a ${typeOf.get(key)} field; a day range reads a date, datetime, created_time or modified_time field.`);
        if (key in filters) say(at, `"${key}" is in both filters and within; keep it in one.`);
        const rel = isObj(w) ? w.relative : undefined;
        if (!(PACK_RELATIVE_DAYS as readonly string[]).includes(String(rel))) {
          say(`${at}.relative`, `"${String(rel)}" is not a day range. Use one of: ${PACK_RELATIVE_DAYS.join(", ")}.`);
          continue;
        }
        const n = (w as { n?: unknown }).n;
        if (rel === "next_days" || rel === "past_days") {
          if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > 3660) say(`${at}.n`, `${String(rel)} counts a whole number of days, 1 to 3660 ("n": 7).`);
        } else if (n !== undefined) say(`${at}.n`, `n is only for next_days / past_days; "${String(rel)}" is a fixed range. Remove n.`);
      }
  }
  if (v.me !== undefined) {
    if (!Array.isArray(v.me) || !v.me.length || v.me.some((k) => !str(k))) say(`${vat}.me`, 'Write me as a list of person field keys: ["owner"].');
    else
      v.me.forEach((key: string, j: number) => {
        const at = `${vat}.me[${j}]`;
        if (known(key, at) && !PERSON_KINDS.includes(typeOf.get(key) ?? ""))
          say(at, `"${key}" is a ${typeOf.get(key)} field; "me" matches a signed-in member, so name a member, created_by or modified_by field (a Team table row is not a signed-in person).`);
      });
  }
  if (v.anyOf !== undefined) {
    if (!isObj(v.anyOf)) say(`${vat}.anyOf`, 'Write anyOf as { "<field key>": ["Choice one", "Choice two"] }.');
    else
      for (const [key, vals] of Object.entries(v.anyOf)) {
        const at = `${vat}.anyOf.${key}`;
        if (!known(key, at)) continue;
        if (!Array.isArray(vals) || !vals.length || vals.some((x) => typeof x !== "string")) say(at, 'Give anyOf a list of the values to match: ["To do", "Doing"].');
        else {
          const choices = choicesOf.get(key);
          if (Array.isArray(choices)) vals.forEach((x) => (choices.includes(x) ? null : say(at, `"${String(x)}" is not a choice of "${key}". Choices: ${choices.join(", ")}.`)));
        }
        if (key in filters) say(at, `"${key}" is in both filters and anyOf; keep it in one.`);
      }
  }
}
