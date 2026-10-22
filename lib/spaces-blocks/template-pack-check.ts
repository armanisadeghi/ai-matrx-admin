// lib/spaces-blocks/template-pack-check.ts — THE PACK CHECKER: every rule a Space template pack must pass,
// with no database. Run it with `pnpm spaces:templates:check <file|dir>` (features/spaces/templates/check.ts).
//
// What it proves, in order:
//   1. the pack's own shape (identity, catalog id, version, category, tags, page tree);
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
import { TEXT_CONTRAST, contrastRatio, readColorPair, readMotion, readOpacity, readShadowPair, readTypeStyle } from "@ai-matrx/design-system/field-formats";

import { isKnownGalleryCover } from "./cover-library";
import { buildSpaceSnapshotSchema } from "./jsonSchema";
import { validateSnapshot } from "./schema";
import {
  DESIGN_MOODS,
  DESIGN_TYPE_CLASSES,
  LEGACY_PACK_IDS,
  PACK_BOARD_COLUMN,
  PACK_BOARD_TILE_KINDS,
  PACK_BOARD_TILE_W,
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
  type PackBoard,
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

/** A cover's finding, or null: one media value, and a `gallery:` key must name a cover we have (bundled or the library). */
function coverFinding(c: unknown): string | null {
  if (!mediaOk(c)) return 'A cover is { "url": "gallery:<name>" } (or null).';
  const url = (c as { url?: unknown }).url;
  if (typeof url === "string" && url.startsWith("gallery:") && !isKnownGalleryCover(url)) {
    return `"${url}" is not a gallery cover: use a bundled one or a key from the cover library (lib/spaces-blocks/cover-library.json).`;
  }
  return null;
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
  const packCover = pack.cover !== undefined && pack.cover !== null ? coverFinding(pack.cover) : null;
  if (packCover) say("cover", packCover);
  const cats = SPACE_TEMPLATE_CATEGORIES.map((c) => c.key) as string[];
  if (!cats.includes(String(pack.category))) say("category", `"${String(pack.category)}" is not a category. Use one of: ${cats.join(", ")}.`);
  if (!Array.isArray(pack.tags) || pack.tags.length < 1 || pack.tags.length > 6) say("tags", "Give 1 to 6 search tags.");
  else pack.tags.forEach((t, i) => (typeof t === "string" && TAG.test(t) ? null : say(`tags[${i}]`, `"${String(t)}" must be lowercase words (letters, digits, spaces, & or -), at most 24 characters.`)));

  if (pack.designProfile !== undefined) checkDesignProfile(pack.designProfile, say);

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
  // INSTALL-ORDER: the assistant's variables bind tables this pack makes. A variable naming a table that is not one of them fails the
  // first press of Use template ("The template binds ... which was not created") and leaves a half-made assistant behind.
  (spec.agent?.variables ?? []).forEach((v, vi) => {
    if (!tables.has(v.table)) say(`spec.agent.variables[${vi}]`, `It binds "${v.name}" to "${v.table}", which this pack does not make. Its tables are: ${[...tables.keys()].join(", ")}.`);
  });
  // A board that STARTS EMPTY (Arman 2026-10-21: the AI builds it for the business) seeds no row at all.
  const startsEmpty = isObj(pack.board) && (pack.board as { startsEmpty?: unknown }).startsEmpty === true;
  for (const t of every) {
    if (startsEmpty) {
      if (t.rows?.length) say(`spec.tables (${t.token}).rows`, `This board starts empty: seed no rows (it has ${t.rows.length}); the AI builds them.`);
    } else if ((t.rows?.length ?? 0) < MIN_SAMPLE_ROWS) say(`spec.tables (${t.token}).rows`, `Seed at least ${MIN_SAMPLE_ROWS} realistic sample rows (it has ${t.rows?.length ?? 0}); every view opens on them.`);
  }

  const storeViewNames = new Set<string>();
  (spec.views ?? []).forEach((v, i) => {
    const key = `${v.table}\u0000${String(v.name ?? "").trim().toLowerCase()}`;
    if (v.name && storeViewNames.has(key)) say(`spec.views[${i}].name`, `Two views of "${v.table}" are named "${v.name}"; give each view its own name.`);
    storeViewNames.add(key);
    const table = tables.get(v.table);
    const me = table && !startsEmpty ? meViewSeedFinding(table, v as unknown as Record<string, unknown>) : null;
    if (me) say(`spec.views[${i}].me`, me);
  });
  for (const t of every) checkLookValues(t, say);
  for (const t of every) checkChoiceColors(t, say);

  // ── 3. the page tree ───────────────────────────────────────────────────────
  const pages = Array.isArray(pack.pages) ? pack.pages : [];
  if (!pages.length && pack.board === undefined) say("pages", "A pack has at least one page (pages[0] is the root \"Use template\" opens), or a \"board\".");
  if (pack.board !== undefined) checkBoard(pack.board, tables, say);
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
    const pageCover = p.cover !== undefined && p.cover !== null ? coverFinding(p.cover) : null;
    if (pageCover) say(`${at}.cover`, pageCover);
    // The installed root page is the template's face: it carries the template's cover.
    if (i === 0 && pack.cover && JSON.stringify(p.cover ?? null) !== JSON.stringify(pack.cover)) say(`${at}.cover`, "The root page's cover is the template's cover: write the same value.");
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
    checkTokens(p.blocks, `${base}.blocks`, { tables, views, keys, startsEmpty }, say);
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

/** State words and the color family each must wear (a choice's color is its meaning, never its position in the list). */
const FINISHED_STATES = new Set(["paid", "paid in full", "completed", "complete", "done", "closed won", "won", "active", "healthy", "resolved", "achieved", "delivered", "published", "signed", "settled", "funded", "finished", "graduated", "renewed", "on track", "attended"]);
const NEGATIVE_STATES = new Set(["cancelled", "canceled", "lost", "closed lost", "overdue", "failed", "rejected", "declined", "denied", "churned", "no-show", "no show", "late", "expired", "written off", "missed", "past due"]);
const WARNING_STATES = new Set(["at risk", "blocked", "refunded", "abandoned", "critical", "unhealthy", "on hold", "paused", "waiting", "waiting on client", "waiting on them", "waiting for approval", "on pause"]);
const GREEN_FAMILY = new Set(["green", "teal"]);
const RED_FAMILY = new Set(["red", "pink"]);
const QUIET_FAMILY = new Set(["slate", "gray"]);

/** A finished state wears green, a negative one red, and a warning is never green or gray. Names the choice and the fix. */
export function choiceColorFindings(choices: Record<string, string> | undefined): Array<{ choice: string; says: string }> {
  const out: Array<{ choice: string; says: string }> = [];
  for (const [choice, color] of Object.entries(choices ?? {})) {
    const word = choice.trim().toLowerCase();
    if (FINISHED_STATES.has(word) && !GREEN_FAMILY.has(color)) out.push({ choice, says: `"${choice}" is a finished state painted ${color}; finished and good states wear green (or teal).` });
    else if (NEGATIVE_STATES.has(word) && !RED_FAMILY.has(color)) out.push({ choice, says: `"${choice}" is a negative state painted ${color}; cancelled, lost, overdue and failed states wear red.` });
    else if (WARNING_STATES.has(word) && (GREEN_FAMILY.has(color) || QUIET_FAMILY.has(color))) out.push({ choice, says: `"${choice}" is a warning state painted ${color}; warnings, holds and waiting states wear amber, orange or red.` });
  }
  return out;
}

function checkChoiceColors(t: TemplateSpec["tables"][number], say: (at: string, says: string) => void) {
  for (const f of t.fields) {
    for (const c of choiceColorFindings(f.choiceColors as Record<string, string> | undefined)) {
      say(`spec.tables (${t.token}).fields (${f.key}).choiceColors`, c.says);
    }
  }
}

/** The design looks a seed value must be readable by (a value its look cannot read draws as raw JSON). */
const LOOK_READERS: Record<string, { reads: (v: unknown) => boolean; shape: string }> = {
  color_pair: { reads: (v) => readColorPair(v) !== null, shape: '{"light":"#ffffff","dark":"#0b0d12"} (hex colors)' },
  type_style: { reads: (v) => readTypeStyle(v) !== null, shape: '{"font":"system-ui","weight":400,"size":15,"lineHeight":24,"letterSpacing":0} (letterSpacing in em)' },
  shadow: { reads: (v) => readShadowPair(v) !== null, shape: '{"x":0,"y":4,"blur":8,"spread":0,"color":"#0f172a1a"}, {"layers":[…]} or {"light":…,"dark":…} (hex colors with alpha, never rgba())' },
  opacity: { reads: (v) => readOpacity(v) !== null, shape: "a number from 0 to 1 (0.5) or a percent string (\"50%\")" },
  motion: { reads: (v) => readMotion(v) !== null, shape: '{"duration":200,"easing":"ease-out"} (ms; a CSS easing keyword or cubic-bezier(…))' },
  measure: { reads: (v) => typeof v === "number" && Number.isFinite(v), shape: "a number (the unit is the column's)" },
};

/** Every sample value of a column wearing a design look is one the look can draw; a per-row ground names a real row. */
function checkLookValues(t: TemplateSpec["tables"][number], say: (at: string, says: string) => void) {
  const fields = (t.fields ?? []) as Array<{ key: string; look?: { id: string; options?: Record<string, unknown> } }>;
  // A row is named by the table's title field, else a column keyed `name` (the section card's own fallback).
  const titleField = (t as { titleField?: string }).titleField;
  const nameKey = titleField && fields.some((x) => x.key === titleField) ? titleField : fields.some((x) => x.key === "name") ? "name" : null;
  const nameOf = (r: (typeof t.rows)[number]) => {
    const v = nameKey ? (r.values as Record<string, unknown>)?.[nameKey] : undefined;
    return typeof v === "string" ? v.trim() : "";
  };
  const counts = new Map<string, number>();
  for (const r of t.rows ?? []) if (nameOf(r)) counts.set(nameOf(r), (counts.get(nameOf(r)) ?? 0) + 1);
  for (const f of fields) {
    const look = f.look;
    if (!look) continue;
    const reader = LOOK_READERS[look.id];
    const at = `spec.tables (${t.token}).fields (${f.key}).look`;
    (t.rows ?? []).forEach((r, i) => {
      const v = (r.values as Record<string, unknown>)?.[f.key];
      if (v === undefined || v === null || !reader || reader.reads(v)) return;
      say(`spec.tables (${t.token}).rows[${i}].values.${f.key}`, `The ${look.id} look cannot read ${JSON.stringify(v)}; write ${reader.shape}.`);
    });
    const on = (look.options?.contrastWith as { readsOnField?: unknown } | undefined)?.readsOnField;
    if (on === undefined) continue;
    if (typeof on !== "string" || !fields.some((x) => x.key === on)) {
      say(`${at}.options.contrastWith.readsOnField`, `"${String(on)}" is not a field of "${t.token}"; name the text column that says which row each color is read on.`);
      continue;
    }
    if (!nameKey) {
      say(`spec.tables (${t.token}).titleField`, `"${on}" names rows by their name, but "${t.token}" has no title field and no "name" column; give it a titleField.`);
      continue;
    }
    // Rows are found by name: two rows of one name make "read on X" ambiguous.
    for (const [name, n] of counts) if (n > 1) say(`spec.tables (${t.token}).rows`, `${n} rows are named "${name}"; "${on}" finds a row by its name, so each name is used once.`);
    (t.rows ?? []).forEach((r, i) => {
      const raw = (r.values as Record<string, unknown>)?.[on];
      const ground = typeof raw === "string" ? raw.trim() : "";
      if (!ground) return;
      const where = `spec.tables (${t.token}).rows[${i}].values.${on}`;
      if (ground === nameOf(r)) say(where, `"${ground}" is read on itself; name the row it sits on, or leave it empty.`);
      else if (!counts.has(ground)) say(where, `No row is named "${ground}"; a color is read on another row of this table, by its name.`);
      else if (look.id === "color_pair") {
        // A seeded color that names its ground is text on it: it reads at 4.5:1 or more in both themes.
        const ink = readColorPair((r.values as Record<string, unknown>)?.[f.key]);
        const base = (t.rows ?? []).find((x) => nameOf(x) === ground);
        const under = base ? readColorPair((base.values as Record<string, unknown>)?.[f.key]) : null;
        if (!ink || !under) return;
        // A color carries its own minimum (`min`: 3 for a line, a field outline, a focus ring); text is 4.5:1.
        // The same rule the section card draws (records-ui looks), so a board never shows a warning the pack passed.
        const need = ink.min ?? TEXT_CONTRAST;
        const isLine = need < TEXT_CONTRAST;
        for (const theme of ["light", "dark"] as const) {
          const ratio = contrastRatio(ink[theme] ?? ink.light, under[theme] ?? under.light);
          if (ratio !== null && ratio < need)
            say(where, `"${nameOf(r)}" on "${ground}" reads at ${ratio}:1 in ${theme}; ${isLine ? `a line color reaches its ${need}:1` : "seeded text colors reach 4.5:1"} on what it is read on.`);
        }
      }
    });
  }
}

/** A design pack's typed profile: every field present, enums and ranges real, colors hex. */
function checkDesignProfile(p: unknown, say: (at: string, says: string) => void) {
  const at = "designProfile";
  if (!isObj(p)) return say(at, "A design profile is an object (see DesignProfile in template-pack.ts).");
  const strs = (k: string, min = 0) => {
    const v = p[k];
    if (!Array.isArray(v) || v.length < min || !v.every((x) => typeof x === "string" && x.trim() !== "")) say(`${at}.${k}`, `Give a list of ${min ? "at least " + min + " " : ""}words.`);
  };
  const oneOf = (k: string, allowed: readonly string[]) => (allowed.includes(String(p[k])) ? null : say(`${at}.${k}`, `"${String(p[k])}" is not one of: ${allowed.join(", ")}.`));
  const scale = (k: string) => (Number.isInteger(p[k]) && (p[k] as number) >= 1 && (p[k] as number) <= 5 ? null : say(`${at}.${k}`, "A whole number from 1 to 5."));
  strs("industries", 1);
  strs("avoidFor");
  strs("adaptFirst", 1);
  strs("lockedTokens");
  if (!Array.isArray(p.mood) || p.mood.length < 1 || !p.mood.every((m) => (DESIGN_MOODS as readonly string[]).includes(String(m)))) say(`${at}.mood`, `One or more of: ${DESIGN_MOODS.join(", ")}.`);
  scale("formality");
  scale("energy");
  oneOf("density", ["compact", "medium", "airy"]);
  oneOf("shape", ["sharp", "soft", "round", "pill"]);
  oneOf("contrast", ["standard", "high"]);
  oneOf("defaultTheme", ["light", "dark"]);
  oneOf("typeClass", DESIGN_TYPE_CLASSES);
  const fonts = p.fonts;
  if (!Array.isArray(fonts) || fonts.length < 1) say(`${at}.fonts`, "Name each font family: { family, role, source: system|google|embedded }.");
  else fonts.forEach((f, i) => (isObj(f) && str(f.family) && str(f.role) && ["system", "google", "embedded"].includes(String(f.source)) ? null : say(`${at}.fonts[${i}]`, "{ family, role, source: system|google|embedded }.")));
  const hex = /^#[0-9a-f]{6}$/i;
  const pr = p.primary;
  if (!isObj(pr) || !hex.test(String(pr.light)) || !hex.test(String(pr.dark))) say(`${at}.primary`, '{ "light": "#rrggbb", "dark": "#rrggbb" }.');
  if (typeof p.chromatic !== "boolean") say(`${at}.chromatic`, "true or false.");
  if (typeof p.fallback !== "boolean") say(`${at}.fallback`, "true or false.");
  const a = p.a11y;
  if (!isObj(a) || !["AA", "AAA-leaning"].includes(String(a.level)) || !(Number(a.minTarget) >= 24) || !(Number(a.minBody) >= 12)) say(`${at}.a11y`, '{ "level": "AA"|"AAA-leaning", "minTarget": px ≥ 24, "minBody": px ≥ 12 }.');
}

const BOARD_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The pack's board: its shape, every chapter and tile, and every table token naming a spec table. */
function checkBoard(raw: unknown, tables: Map<string, TemplateSpec["tables"][number]>, say: (at: string, says: string) => void) {
  if (!isObj(raw)) {
    say("board", "A board is an object with key, title, layout, chapters and (optionally) pages.");
    return;
  }
  const board = raw as unknown as PackBoard;
  if (board.listed !== undefined && typeof board.listed !== "boolean") say("board.listed", "listed is true or false (false: reference only, never in a gallery).");
  if (board.startsEmpty !== undefined && typeof board.startsEmpty !== "boolean") say("board.startsEmpty", "startsEmpty is true or false.");
  const startsEmpty = board.startsEmpty === true;
  const keys = new Set<string>();
  const one = (b: unknown, at: string) => {
    if (!isObj(b)) {
      say(at, "A board is an object with key, title and chapters.");
      return;
    }
    if (!str(b.key) || !BOARD_KEY.test(b.key)) say(`${at}.key`, `"${String(b.key)}" must be lowercase letters, digits and single dashes ("files").`);
    else if (keys.has(b.key)) say(`${at}.key`, `"${b.key}" is used by two boards; each board key is unique.`);
    else keys.add(b.key);
    if (!str(b.title)) say(`${at}.title`, "Give the board a title.");
    else if (b.title.length > 80) say(`${at}.title`, `Keep the title to 80 characters (it is ${b.title.length}).`);
    if (b.layout !== undefined && b.layout !== "page" && b.layout !== "canvas") say(`${at}.layout`, `"${String(b.layout)}" is not a layout. Write "page" or "canvas".`);
    if (!Array.isArray(b.chapters)) {
      say(`${at}.chapters`, "A board's chapters are a list (each a frame with its tiles).");
      return;
    }
    const widest = b.layout === "page" ? PACK_BOARD_TILE_W : Infinity;
    (b.chapters as unknown[]).forEach((c, ci) => {
      const cat = `${at}.chapters[${ci}]`;
      if (!isObj(c)) {
        say(cat, "A chapter is { title, tiles }.");
        return;
      }
      if (!str(c.title)) say(`${cat}.title`, "Give the chapter a title (it is the Outline's entry).");
      if (c.note !== undefined && typeof c.note !== "string") say(`${cat}.note`, "A chapter's note is text.");
      if (!Array.isArray(c.tiles)) {
        say(`${cat}.tiles`, "A chapter's tiles are a list (it may be empty).");
        return;
      }
      (c.tiles as unknown[]).forEach((t, ti) => {
        const tat = `${cat}.tiles[${ti}]`;
        if (!isObj(t)) {
          say(tat, "A tile is { kind, title, size }.");
          return;
        }
        if (!(PACK_BOARD_TILE_KINDS as readonly string[]).includes(String(t.kind))) say(`${tat}.kind`, `"${String(t.kind)}" is not a tile kind. Use one of: ${PACK_BOARD_TILE_KINDS.join(", ")}.`);
        if (!str(t.title)) say(`${tat}.title`, "Give the tile a title.");
        const size = t.size;
        if (!isObj(size) || !Number.isFinite(size.w) || !Number.isFinite(size.h) || (size.w as number) < 160 || (size.h as number) < 120)
          say(`${tat}.size`, 'Give the tile a size of at least { "w": 160, "h": 120 } (world px).');
        else if ((size.w as number) > widest)
          say(`${tat}.size.w`, `A page-layout chapter is ${PACK_BOARD_COLUMN} wide; a tile is at most ${PACK_BOARD_TILE_W} (it is ${String(size.w)}).`);
        if (t.kind === "table") {
          if (t.entity !== undefined && t.table !== undefined) say(`${tat}`, "A table tile names a spec table or an entity, never both.");
          else if (t.entity !== undefined) {
            if (!str(t.entity) || !/^[a-z][a-z0-9_]*$/.test(t.entity)) say(`${tat}.entity`, "An entity tile names a registered entity token, like web_brand_choice.");
          } else if (!str(t.table)) say(`${tat}.table`, "A table tile names a spec table by its token, or an entity by its token.");
          else if (!tables.has(t.table)) say(`${tat}.table`, `No table has the token "${t.table}". Tables: ${[...tables.keys()].join(", ") || "none"}.`);
          if (t.layout !== undefined && t.layout !== "section" && t.layout !== "table") say(`${tat}.layout`, `"${String(t.layout)}" is not a table layout. Write "section" or "table".`);
          if (t.text !== undefined) say(`${tat}.text`, "A table tile has no text; its rows are the table's sample rows.");
        } else if (t.kind === "cover") {
          if (startsEmpty) {
            if (str(t.hero) || str(t.text)) say(`${tat}`, "This board starts empty: its cover has no hero and no text; the AI writes them.");
          } else if (!str(t.hero) && !str(t.text)) say(`${tat}`, "A cover tile has a hero (HTML) or text (markdown): write at least one.");
          if (t.hero !== undefined && typeof t.hero !== "string") say(`${tat}.hero`, "A cover's hero is HTML text.");
          else if (typeof t.hero === "string" && /<script\b/i.test(t.hero)) say(`${tat}.hero`, "A cover's hero is markup and CSS only: scripts do not run in it.");
          if (t.table !== undefined || t.entity !== undefined || t.layout !== undefined) say(`${tat}`, "A cover tile names no table and no layout.");
        } else if (t.kind === "note" || t.kind === "writeUp") {
          if (!str(t.text)) say(`${tat}.text`, `A ${String(t.kind)} tile starts with words: write its text.`);
          else if (/\bNotion\b/.test(t.text)) say(`${tat}.text`, "Write in our own words: the text names another product.");
          if (t.table !== undefined || t.entity !== undefined || t.layout !== undefined) say(`${tat}`, `A ${String(t.kind)} tile names no table and no layout.`);
        }
      });
    });
  };
  one(board, "board");
  if (board.pages !== undefined) {
    if (!Array.isArray(board.pages)) say("board.pages", "A board's pages are a list of boards.");
    else
      (board.pages as unknown[]).forEach((p, i) => {
        one(p, `board.pages[${i}]`);
        if (isObj(p) && p.pages !== undefined) say(`board.pages[${i}].pages`, "Pages are one level deep: a page has no pages of its own.");
      });
  }
}

interface TokenWorld {
  tables: Map<string, TemplateSpec["tables"][number]>;
  views: Map<string, TemplateSpec["views"][number]>;
  keys: Set<string>;
  /** A board that starts empty seeds no rows, so a "My" view has nothing to show by design. */
  startsEmpty?: boolean;
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
        const tabNames = new Set<string>();
        views.forEach((v, k) => {
          const vat = `${at}.props.views[${k}]`;
          if (!isObj(v)) return;
          // Two tabs of one table wearing the same name cannot be told apart (a grid and a chart both "Value by room").
          if (typeof v.name === "string" && v.name.trim()) {
            const tab = v.name.trim().toLowerCase();
            if (tabNames.has(tab)) say(`${vat}.name`, `Two view tabs of "${src.table}" are named "${v.name}"; give each tab its own name (for example "${v.name} chart").`);
            tabNames.add(tab);
          }
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
          if (!w.startsEmpty) {
            const me = meViewSeedFinding(table, v);
            if (me) say(`${vat}.me`, me);
          }
          for (const f of cardAmountFields(table.fields, v)) {
            say(`${vat}.hiddenFields`, `"${f.key}" (${f.label ?? f.key}) would show on every ${String(v.layout)} card as a bare amount, and ${f.why}. Add "${f.key}" to hiddenFields; keep an amount on a card only when the card's title says what it is (a cost line, a payout, a quote).`);
          }
          for (const key of cardStampFields(table.fields, v)) {
            say(`${vat}.hiddenFields`, `"${key}" is a created/edited stamp and would end every ${String(v.layout)} card as a date with no label. Add "${key}" to hiddenFields (the Properties menu can still show it).`);
          }
          if ((v.layout === "kanban" || v.layout === "board") && !str(v.groupField)) say(`${vat}.groupField`, "A board groups by a choice field: name it in groupField.");
          if ((v.layout === "calendar" || v.layout === "timeline") && !str(v.dateField)) say(`${vat}.dateField`, `A ${String(v.layout)} view places rows by a date field: name it in dateField.`);
        });
        if (typeof props.activeViewId === "string" && !ids.has(props.activeViewId)) say(`${at}.props.activeViewId`, `No view of this block has the id "${props.activeViewId}".`);
      }
    }
    if (Array.isArray(b.children)) checkTokens(b.children, `${at}.children`, w, say);
  });
}

const CARD_LAYOUTS = ["kanban", "gallery", "calendar", "timeline"];

type CardField = { key: string; label?: unknown; parityType?: unknown; format?: unknown; unit?: unknown };
/** A money label on a derived or standing amount: a bare "$99.00" under it cannot be read as this card's own price. */
const STANDING_AMOUNT = /\b(per|limit|average|avg|monthly|weekly|yearly|annual|rate|dues|advance|unit|each|retail|wholesale|suggested|list price|bill|budget|credit|floor|cap)\b/i;
const MONEY_LABEL = /\((USD|EUR|GBP|CAD|AUD)\)|\$/;
const isMoney = (f: CardField) =>
  f.parityType === "currency" || (["rollup", "lookup", "formula"].includes(String(f.parityType)) && (f.format === "currency" || MONEY_LABEL.test(String(f.label ?? ""))));

/** The fields a card view shows (title excluded), mirroring features/spaces/data/view-spec.ts effectiveHidden. */
function cardShownFields<F extends CardField>(fields: ReadonlyArray<F>, view: Record<string, unknown>): F[] {
  const rest = fields.slice(1).filter((f) => f.key !== view.groupField);
  if (Array.isArray(view.hiddenFields)) return rest.filter((f) => !(view.hiddenFields as unknown[]).includes(f.key));
  return rest.filter((f) => f.key !== view.dateField && !DATE_ONLY_KINDS.includes(String(f.parityType))).slice(0, 4);
}

/**
 * The amounts a card would show that a reader cannot place (ADVERSARIAL-7 F2). A card draws values with no property
 * name, so "Castellano-Reyes household · Rural co-op · $126.00" leaves the reader guessing. An amount is ambiguous when
 * the card shows two of them, when it is a total or a looked-up figure from other rows (it reads as this card's own
 * price), or when its label names a standing amount (a monthly fee, a credit limit, a cost per unit, an advance).
 */
export function cardAmountFields(fields: ReadonlyArray<CardField>, view: Record<string, unknown>): Array<CardField & { why: string }> {
  if (typeof view.layout !== "string" || !CARD_LAYOUTS.includes(view.layout)) return [];
  const money = cardShownFields(fields, view).filter(isMoney);
  return money.flatMap((f) => {
    if (money.length > 1) return [{ ...f, why: "the card shows another amount beside it" }];
    if (f.parityType !== "currency") return [{ ...f, why: "it is a figure added up or looked up from other rows" }];
    if (STANDING_AMOUNT.test(String(f.label ?? f.key))) return [{ ...f, why: "it is a standing amount, not this card's own price" }];
    return [];
  });
}

const INSTALLER = "@installer";
type SeedTable = { fields: ReadonlyArray<{ key: string; parityType?: unknown }>; rows?: ReadonlyArray<{ values?: Record<string, unknown> }> };
/**
 * A "My ..." view (`me`) opens empty unless a seed row names the person who installs (ADVERSARIAL-7 F1). At least one
 * seed row must put "@installer" in one of the view's person fields and match its filters and any-of choices
 * (relative days are left to the day the copy is opened).
 */
export function meViewSeedFinding(table: SeedTable, view: Record<string, unknown>): string | null {
  const me = Array.isArray(view.me) ? (view.me as unknown[]).filter((k): k is string => typeof k === "string") : [];
  if (!me.length) return null;
  // A created_by / modified_by field names whoever installs on every seed row already (the install writes them).
  const kinds = new Map(table.fields.map((f) => [f.key, String(f.parityType)] as const));
  if (me.some((k) => kinds.get(k) === "created_by" || kinds.get(k) === "modified_by")) return null;
  const filters = isObj(view.filters) ? view.filters : {};
  const anyOf = isObj(view.anyOf) ? view.anyOf : {};
  const names = (x: unknown) => x === INSTALLER || (Array.isArray(x) && x.includes(INSTALLER));
  const hit = (table.rows ?? []).some((r) => {
    const v = r.values ?? {};
    if (!me.some((k) => names(v[k]))) return false;
    if (Object.entries(filters).some(([k, want]) => typeof want !== "object" && want !== "@this-row" && v[k] !== want)) return false;
    return Object.entries(anyOf).every(([k, list]) => !Array.isArray(list) || list.includes(v[k] as never));
  });
  return hit ? null : `This "My" view opens empty for whoever installs: no seed row puts "${INSTALLER}" in ${me.map((k) => `"${k}"`).join(" or ")} and matches the view's filters. Seed "${INSTALLER}" on two or three open rows.`;
}
const STAMP_KINDS = ["created_time", "modified_time"];
const DATE_ONLY_KINDS = ["date", "datetime"];

/**
 * The created/edited stamp fields a card view would show. A card draws values with no property name, so a stamp
 * ("Oct 19, 2026, 5:30 PM") ends every card unexplained (ADVERSARIAL-5 F9). Mirrors features/spaces/data/view-spec.ts
 * effectiveHidden: a saved hiddenFields list wins; else only the first four non-date properties show.
 */
export function cardStampFields(fields: ReadonlyArray<{ key: string; parityType?: unknown }>, view: Record<string, unknown>): string[] {
  if (typeof view.layout !== "string" || !CARD_LAYOUTS.includes(view.layout)) return [];
  const group = view.groupField;
  const date = view.dateField;
  const rest = fields.slice(1).filter((f) => f.key !== group);
  let shown: typeof rest;
  if (Array.isArray(view.hiddenFields)) shown = rest.filter((f) => !(view.hiddenFields as unknown[]).includes(f.key));
  else {
    const pool = rest.filter((f) => f.key !== date && !DATE_ONLY_KINDS.includes(String(f.parityType)));
    shown = [...pool.slice(0, 4), ...rest.filter((f) => f.key !== date && DATE_ONLY_KINDS.includes(String(f.parityType)))];
  }
  return shown.filter((f) => STAMP_KINDS.includes(String(f.parityType))).map((f) => f.key);
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
