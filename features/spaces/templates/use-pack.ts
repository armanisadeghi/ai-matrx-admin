// features/spaces/templates/use-pack.ts — the Spaces template library in the browser: list the catalog,
// read one template, and "Use template".
//
// ONE CATALOG: a Space template is a platform `custom.template` row (published by
// spaces:templates:publish) whose card carries `space` and whose spec carries the page pack. The read is
// `custom.space_templates` (signed-in; platform rows for everyone, an organization's to its members).
//
// USE TEMPLATE = (1) template_install of that row into the ACTIVE organization through the one install
// door (a second press answers `already` with the same tables; an older install is upgraded first), then
// the host steps (the template's assistant), exactly like the gallery's Install; (2) the page tree made
// in the same organization with every token swapped for the made table, view and page ids; (3) the
// root page opened. Pressing it again makes a NEW copy of the pages over the SAME tables — Notion's
// "use again" gives another page set; the organization never gets a second set of tables.

import { allTables, runTemplateDoor, templateUpgradeHint, upgradeTemplateInstall, type TemplateDoorAnswer, type TemplateSpec } from "@ai-matrx/records/templates";
import { storeDoors, supabaseDataSource } from "@ai-matrx/records/core";

import { packPageSettings, packPagesInOrder, resolvePackBlocks, type ResolvedTable, type SpaceTemplateCardFace, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";
import type { AppDispatch } from "@/lib/redux/store";
import { errorSentence, toast } from "@/lib/toast";
import { createClient } from "@/utils/supabase/client";

import type { SpaceBlock, SpaceDoc, SpaceId, SpacesStore } from "../contract";
import type { PaintedSize } from "../editor/database-host";
import { runHostSteps, upgradeCountsText } from "../data/install-host";
import { registerSampleWorld } from "../data/sources";
import { saveOnCurrent } from "../store/save-on-current";

/**
 * WHERE "USE TEMPLATE" SPENDS ITS TIME: each phase is a `performance.measure` named `spaces:use-template:<phase>`
 * (read them with `performance.getEntriesByType("measure")`), so a slow run is measured, never guessed.
 */
export async function timed<T>(phase: string, work: () => Promise<T>): Promise<T> {
  const t0 = typeof performance === "undefined" ? 0 : performance.now();
  try {
    return await work();
  } finally {
    if (typeof performance !== "undefined" && typeof performance.measure === "function") {
      try {
        performance.measure(`spaces:use-template:${phase}`, { start: t0, end: performance.now() });
      } catch {
        // A measure the browser refuses (old engine) is not a failure of the run.
      }
    }
  }
}

/** One card of `custom.space_templates`. */
export interface SpaceTemplateCard {
  id: string;
  catalogue_id: string;
  version: number;
  scope: "platform" | "org";
  owner_organization_id: string | null;
  space: SpaceTemplateCardFace;
  footprint: { line?: string } | null;
  installed: { install_id: string; state: string; version: number } | null;
  updated_at: string;
}

/** One template read whole: its card, its tables and its pages. */
export interface SpaceTemplateFull extends SpaceTemplateCard {
  spec: TemplateSpec;
  pack: Omit<SpaceTemplatePack, "spec">;
}

type Door = { rpc(fn: "space_templates", args: { p_filter: Record<string, unknown> }): PromiseLike<{ data: { cards: unknown[] } | null; error: { message: string } | null }> };
// Not in the generated types until the next regeneration: a typed local shape for this one door.
const door = () => createClient().schema("custom") as unknown as Door;

/**
 * Every Space template the person can use; `installedIn` marks the ones that organization already has.
 * `makes` picks the gallery: "pages" (the Spaces gallery: packs with pages) or "board" (the Board gallery:
 * packs that carry a board, `card.space.board`). One catalog, two doors.
 */
export async function listSpaceTemplates(installedIn: string | null, makes: "pages" | "board" = "pages"): Promise<SpaceTemplateCard[]> {
  const { data, error } = await door().rpc("space_templates", { p_filter: installedIn ? { installed_in: installedIn } : {} });
  if (error) throw new Error(`We couldn't list the templates: ${error.message}`);
  const cards = (data?.cards ?? []) as SpaceTemplateCard[];
  return cards.filter((c) => (makes === "board" ? !!c.space?.board : (c.space?.pages ?? 0) > 0));
}

const full = new Map<string, Promise<SpaceTemplateFull>>();

/** One template with its spec and pages (read once per tab). */
export function readSpaceTemplate(id: string): Promise<SpaceTemplateFull> {
  let p = full.get(id);
  if (!p) {
    p = (async () => {
      const { data, error } = await door().rpc("space_templates", { p_filter: { id } });
      if (error) throw new Error(`We couldn't open this template: ${error.message}`);
      const card = data?.cards?.[0] as SpaceTemplateFull | undefined;
      if (!card?.pack?.pages?.length && !card?.pack?.board) throw new Error("This template has no pages.");
      return card;
    })();
    p.catch(() => full.delete(id));
    full.set(id, p);
  }
  return p;
}

/**
 * The built-in sample — the Spaces home's "Add a sample" and the source picker's sample tables: one of
 * our own clean-room library packs (Projects & Tasks), installed through the same door as "Use
 * template". Never a customer's or a stranger's page.
 */
export const STARTER_CATALOGUE_ID = "SP0002";

/** The sample template, read whole (its newest platform version). */
export async function readStarterTemplate(): Promise<SpaceTemplateFull> {
  const cards = (await listSpaceTemplates(null)).filter((c) => c.catalogue_id === STARTER_CATALOGUE_ID && c.scope === "platform");
  const card = cards.sort((a, b) => b.version - a.version)[0];
  if (!card) throw new Error("The sample template is not in the library.");
  return readSpaceTemplate(card.id);
}

/** The world id a template's preview tables live in. */
export const previewWorldId = (t: Pick<SpaceTemplateCard, "catalogue_id" | "version">) => `pack:${t.catalogue_id}@${t.version}`;

/** The template's tables in memory (read-only), as the gallery preview's blocks read them. */
export function previewTables(t: SpaceTemplateFull): Record<string, ResolvedTable> {
  const world = previewWorldId(t);
  const preview = registerSampleWorld(world, t.spec);
  const today = preview.world.today;
  return Object.fromEntries(
    preview.world.tables.map((x) => {
      const fieldIds = Object.fromEntries(x.fields.map((f) => [String(f.data["key"]), f.id]));
      // The memory store answers no relative-day node: the block view asks for the sample values that fall in it.
      const valuesOf = (key: string) => [...x.rows.values()].map((r) => r[key]);
      return [x.token, { tableId: x.id, viewIds: {}, sample: world, fieldIds, preview: { today, valuesOf } }];
    }),
  );
}

/** The template's pages as previewable docs (root first), over the in-memory tables. */
export function previewPages(t: SpaceTemplateFull): Array<{ key: string; title: string; doc: Pick<SpaceDoc, "title" | "icon" | "cover" | "blocks" | "settings"> }> {
  const tables = previewTables(t);
  const pages = Object.fromEntries(t.pack.pages.map((p) => [p.key, `preview-${p.key}`]));
  return packPagesInOrder(t.pack.pages).map((p) => {
    // The k-th id of each page is `preview-<key>-<k>`: the made page's k-th block is the same block (PreviewSizes).
    let n = 0;
    return {
      key: p.key,
      title: p.title,
      doc: { title: p.title, icon: p.icon ?? null, cover: p.cover ?? null, settings: packPageSettings(p), blocks: resolvePackBlocks(p.blocks, { tables, pages, newId: () => previewBlockId(p.key, ++n) }) },
    };
  });
}

/** The preview id of a page's k-th block (1-based, in resolvePackBlocks order). */
export const previewBlockId = (pageKey: string, k: number) => `preview-${pageKey}-${k}`;

/**
 * The sizes a template page's database blocks were drawn at in the gallery preview, by the block's place k
 * (previewBlockId): the made page's blocks hold them from the first frame (`paintedSize`, marked `any`), so the
 * page opened by "Use template" does not move when its rows arrive (ADVERSARIAL-1 #2).
 */
export interface PreviewSizes {
  page: string;
  vw: number;
  blocks: Record<number, { w: number; h: number }>;
}

/** The made page's blocks with the preview's sizes on its database blocks; `ids` = the fresh ids in newId order. */
export function withPreviewSizes(blocks: SpaceBlock[], ids: string[], sizes: PreviewSizes): SpaceBlock[] {
  const place = new Map(ids.map((id, i) => [id, i + 1]));
  const walk = (list: SpaceBlock[]): SpaceBlock[] =>
    list.map((b) => {
      const size = b.type === "database" ? sizes.blocks[place.get(b.id) ?? 0] : undefined;
      const children = b.children?.length ? walk(b.children) : b.children;
      if (!size) return children === b.children ? b : { ...b, children };
      const painted: PaintedSize = { w: size.w, h: size.h, vw: sizes.vw, nr: 1, any: 1 };
      return { ...b, props: { ...b.props, paintedSize: [painted] }, ...(children ? { children } : {}) };
    });
  return walk(blocks);
}

/** The installed tables an install answer made, by spec token (tables, shared blocks) with their views. Throws, by name, on a missing table. */
function tablesFrom(answer: TemplateDoorAnswer, spec: TemplateSpec): Record<string, ResolvedTable> {
  const made = answer.made ?? [];
  const out: Record<string, ResolvedTable> = {};
  for (const t of allTables(spec)) {
    const hit = made.find((m) => m.kind === "table" && m.ref === `tables.${t.token}`);
    if (!hit?.id) throw new Error(`The template's ${t.name ?? t.token} table was not made.`);
    const viewIds: Record<string, string> = {};
    for (const v of spec.views.filter((x) => x.table === t.token)) {
      const view = made.find((m) => m.kind === "view" && m.ref === `views.${v.token}`);
      if (view?.id) viewIds[v.token] = view.id;
    }
    out[t.token] = { tableId: hit.id, viewIds };
  }
  return out;
}

/** Each installed table's field keys mapped from the spec's by label (an upgraded install renames a converted column), and their field ids. */
async function withInstalledKeys(tables: Record<string, ResolvedTable>, spec: TemplateSpec, organizationId: string): Promise<Record<string, ResolvedTable>> {
  const db = storeDoors(createClient());
  const out = { ...tables };
  await Promise.all(
    Object.entries(tables).map(async ([token, table]) => {
      const { data, error } = await db.applicableFields(organizationId, table.tableId);
      if (error) throw new Error(`We couldn't read the template's table fields: ${error.message}`);
      const installed = ((data ?? []) as unknown as Array<{ id?: string; data?: { key?: string; label?: string } }>).map((r) => ({ id: r.id, ...(r.data ?? {}) }));
      const keys: Record<string, string> = {};
      // A block view's `where` names fields by id (template-pack.ts packViewWhere): this install's key → id.
      const fieldIds: Record<string, string> = {};
      for (const f of allTables(spec).find((t) => t.token === token)?.fields ?? []) {
        const hit = installed.find((x) => x.label === f.label);
        if (hit?.key && hit.key !== f.key) keys[f.key] = hit.key;
        if (hit?.id) fieldIds[hit.key ?? f.key] = hit.id;
      }
      out[token] = { ...table, ...(Object.keys(keys).length ? { keys } : {}), fieldIds };
    }),
  );
  return out;
}

/** Installs (or finds, or upgrades) the template's tables in `organizationId`, with its host steps. */
export async function installTemplateTables(t: SpaceTemplateFull, organizationId: string, dispatch: AppDispatch, onStage?: (stage: string) => void): Promise<Record<string, ResolvedTable>> {
  const client = createClient();
  onStage?.("Making tables…");
  const done = await timed("install-door", () => runTemplateDoor(supabaseDataSource(client), "template_install", organizationId, t.id, { maxCalls: 400 }));
  if (!done.ok || !done.answer?.done) {
    const refusal = done.answer?.refusal as { message?: string } | null | undefined;
    throw new Error(`The template's tables were not made: ${refusal?.message ?? done.error?.message ?? "the install stopped before it finished."}`);
  }
  let answer: TemplateDoorAnswer = done.answer;
  const hint = templateUpgradeHint(answer);
  if (hint) {
    onStage?.(`Upgrading v${hint.from_version} → v${hint.to_version}…`);
    const up = await upgradeTemplateInstall(supabaseDataSource(client), organizationId, hint.install_id, hint.template_id, { maxCalls: 6 });
    if (!up.ok || !up.answer) {
      const refusal = up.answer?.refusal as { message?: string } | null | undefined;
      throw new Error(`The template's tables were not upgraded to version ${hint.to_version}: ${refusal?.message ?? up.error?.message ?? "the upgrade stopped before it finished."}`);
    }
    if (up.answer.upgraded !== false) toast.success(`Tables upgraded to version ${up.answer.version ?? hint.to_version}: ${upgradeCountsText(up.answer.counts)}.`);
    answer = up.answer;
  }
  const tables = await timed("field-keys", () => withInstalledKeys(tablesFrom(answer, t.spec), t.spec, organizationId));
  onStage?.("Adding the assistant…");
  await timed("host-steps", () => runHostSteps(answer, organizationId, dispatch, "The template's assistant"));
  return tables;
}

/**
 * The page set of a "Use template" run that has not finished: its root page id, kept while the run works.
 * TEMPLATE-INSTALL-3: a run cut off after its first pages (Oak Street Studio, Fundraising CRM: three empty
 * pages, a second press made a full new set beside them) leaves its root here; the next run moves that
 * unfinished set to Trash before it starts, so a retry never leaves a duplicate.
 */
export interface PackRunJournal {
  read(): SpaceId | null;
  write(rootId: SpaceId | null): void;
}

/** A browser-tab journal for one template in one organization (an in-flight run is specific to this client). */
export function packRunJournal(organizationId: string, templateId: string): PackRunJournal {
  const key = `matrx:spaces:pack-run:${organizationId}:${templateId}`;
  const storage = () => (typeof window === "undefined" ? null : window.localStorage);
  return {
    read: () => storage()?.getItem(key) ?? null,
    write: (rootId) => (rootId ? storage()?.setItem(key, rootId) : storage()?.removeItem(key)),
  };
}

const reasonOf = (err: unknown) => (err instanceof Error && err.message ? err.message : errorSentence(err));

/** What makeTemplatePages can also do: hold preview sizes, and say the moment the root is ready to open. */
export interface MakePagesOptions {
  sizes?: PreviewSizes | null;
  /** Called once the root page holds its finished content — before the sub-pages are written. */
  onRootReady?: (root: SpaceDoc) => void;
}

/**
 * Makes the template's pages in `organizationId`: the root at the top level (through `createRoot`), every
 * sub-page under its parent in order, then each page's content with the tokens swapped for the made
 * tables and pages (each write lands on the page's current version). Answers the root.
 * FAST (ADVERSARIAL-1 #2): the page tree is made WHILE the tables install (`tables` may be a promise; only the
 * content needs them); sub-pages under different parents are made at once (siblings in order); the root's
 * content is written first and `onRootReady` opens it while the sub-pages are filled six at a time.
 * ALL OR NOTHING: a failure part-way (the tables' install included) moves the pages already made to Trash
 * (the root takes its sub-pages) and throws the reason; an earlier run that never finished (closed tab,
 * reload) is moved to Trash first.
 */
export async function makeTemplatePages(
  store: SpacesStore,
  createRoot: (title: string) => Promise<SpaceDoc>,
  t: SpaceTemplateFull,
  tables: Record<string, ResolvedTable> | Promise<Record<string, ResolvedTable>>,
  onProgress?: (done: number, total: number) => void,
  journal?: PackRunJournal,
  options: MakePagesOptions = {},
): Promise<SpaceDoc> {
  const unfinished = journal?.read();
  if (unfinished) {
    try {
      await store.archive(unfinished);
    } catch (err) {
      toast.warning(`An earlier unfinished copy of this template could not be moved to Trash: ${reasonOf(err)}`);
    }
    journal?.write(null);
  }
  const ordered = packPagesInOrder(t.pack.pages);
  const root = await createRoot(ordered[0].title);
  journal?.write(root.id);
  try {
    const made = await fillTemplatePages(store, root, ordered, Promise.resolve(tables), onProgress, options);
    journal?.write(null);
    return made;
  } catch (err) {
    let undone = true;
    try {
      await store.archive(root.id);
    } catch {
      undone = false;
    }
    if (undone) journal?.write(null);
    throw new Error(
      `The template's pages were not finished (${reasonOf(err)}). ${
        undone ? "The pages made so far were moved to Trash; use the template again." : "Use the template again; the unfinished pages will be moved to Trash first."
      }`,
    );
  }
}

/** Makes every sub-page under its parent: parents in parallel, each parent's children in their order. */
async function makePageTree(store: SpacesStore, root: SpaceDoc, ordered: ReturnType<typeof packPagesInOrder>, onMade: () => void): Promise<Record<string, SpaceId>> {
  const ids: Record<string, SpaceId> = { [ordered[0].key]: root.id };
  const childrenOf = new Map<string, typeof ordered>();
  for (const p of ordered.slice(1)) {
    const parent = p.parent ?? ordered[0].key;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), p]);
  }
  const under = async (parentKey: string): Promise<void> => {
    let after: SpaceId | undefined;
    const kids = childrenOf.get(parentKey) ?? [];
    for (const p of kids) {
      const made = await store.create({ parentId: ids[parentKey], title: p.title, afterId: after });
      ids[p.key] = made.id;
      after = made.id;
      onMade();
    }
    await Promise.all(kids.map((p) => under(p.key)));
  };
  await under(ordered[0].key);
  return ids;
}

async function fillTemplatePages(
  store: SpacesStore,
  root: SpaceDoc,
  ordered: ReturnType<typeof packPagesInOrder>,
  tablesReady: Promise<Record<string, ResolvedTable>>,
  onProgress: ((done: number, total: number) => void) | undefined,
  options: MakePagesOptions,
): Promise<SpaceDoc> {
  // Both the tree and the content count: 2 steps a sub-page, 1 for the root's content.
  const total = ordered.length * 2 - 1;
  let done = 0;
  const step = () => onProgress?.(++done, total);
  // The tree is made while the tables install; a failed install still waits for the tree, so Trash takes it all.
  const [treeResult, tablesResult] = await Promise.allSettled([timed("page-tree", () => makePageTree(store, root, ordered, step)), tablesReady]);
  if (treeResult.status === "rejected") throw treeResult.reason;
  if (tablesResult.status === "rejected") throw tablesResult.reason;
  const ids = treeResult.value;
  const tables = tablesResult.value;
  const write = (p: (typeof ordered)[number]) => {
    const fresh: string[] = [];
    const newId = () => {
      const id = crypto.randomUUID();
      fresh.push(id);
      return id;
    };
    const resolved = resolvePackBlocks(p.blocks, { tables, pages: ids, newId });
    const blocks = options.sizes?.page === p.key ? withPreviewSizes(resolved, fresh, options.sizes) : resolved;
    return saveOnCurrent(store, ids[p.key], (cur) => ({
      ...cur,
      title: p.title,
      icon: p.icon ?? null,
      cover: p.cover ?? null,
      settings: packPageSettings(p),
      ...(p.properties ? { properties: p.properties } : {}),
      blocks,
    })).then((doc) => (step(), doc));
  };
  return timed("page-content", async () => {
    // The root first: it opens finished while its sub-pages are written behind it.
    const madeRoot = await write(ordered[0]);
    options.onRootReady?.(madeRoot);
    const kids = ordered.slice(1);
    for (let i = 0; i < kids.length; i += 6) await Promise.all(kids.slice(i, i + 6).map(write));
    return madeRoot;
  });
}
