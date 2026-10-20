// features/spaces/templates/use-pack.ts — the Spaces template library in the browser: list the catalog,
// read one template, and "Use template".
//
// ONE CATALOG: a Space template is a platform `custom.template` row (published by
// spaces:templates:publish) whose card carries `space` and whose spec carries the page pack. The read is
// `custom.space_templates` (signed-in; platform rows for everyone, an organization's to its members).
//
// USE TEMPLATE = (1) template_install_fresh of that row into the ACTIVE organization: every press makes its
// OWN copy of the tables, named "<Table> · <page title>" (TEMPLATE-FRESH, Notion parity), then the host steps
// (the template's assistant); (2) the page tree made in the same organization with every token swapped for
// that copy's table, view and page ids; (3) the root page opened. A run that stops (refusal, failure, Cancel)
// is resumed by Try again on the SAME copy and the SAME pages (PackRun journal), never a second set.

import { allTables, listTemplateInstances, newTemplateInstallId, runTemplateDoor, templateUpgradeHint, upgradeTemplateInstall, type TemplateDoorAnswer, type TemplateSpec } from "@ai-matrx/records/templates";
import { storeDoors, supabaseDataSource } from "@ai-matrx/records/core";

import { packPageSettings, packPagesInOrder, resolvePackBlocks, spaceTemplateMakes, type ResolvedTable, type SpaceTemplateCardFace, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";
import type { AppDispatch } from "@/lib/redux/store";
import { errorSentence, toast } from "@/lib/toast";
import { createClient } from "@/utils/supabase/client";

import type { SpaceBlock, SpaceDoc, SpaceId, SpacesStore } from "../contract";
import type { PaintedSize } from "../editor/database-host";
import { runHostSteps, upgradeCountsText } from "../data/install-host";
import { registerSampleWorld } from "../data/sources";
import { saveOnCurrent } from "../store/save-on-current";
import { copyIsLive, copyRoots, templateDoorSentence } from "./template-copy";

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
 * `makes` picks the gallery: "any" (the Spaces gallery: packs with pages AND page-less board packs, through the one
 * test `spaceTemplateMakes`; a board card opens the Board gallery's install) or "board" (the Board gallery: packs
 * that carry a board, `card.space.board`). One catalog, two doors.
 */
export async function listSpaceTemplates(installedIn: string | null, makes: "any" | "board" = "any"): Promise<SpaceTemplateCard[]> {
  const { data, error } = await door().rpc("space_templates", { p_filter: installedIn ? { installed_in: installedIn } : {} });
  if (error) throw new Error(`We couldn't list the templates: ${error.message}`);
  const cards = (data?.cards ?? []) as SpaceTemplateCard[];
  return cards.filter((c) => (makes === "board" ? !!c.space?.board : spaceTemplateMakes(c.space) !== null));
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

/**
 * USE-TEMPLATE-FAILURES (Accounting Firm Desk, 2026-10-19): the store REFUSED the install (step 13, lock timeout
 * 55P03 after 148 s) and the screen spun on "Making tables… · Pages 5/11" for minutes. The door re-asks a refusal
 * whose code is transient, up to `maxCalls` (400) times, and each call can wait out the lock again. Now every
 * refusal ends the run at once with the store's sentence. "Try again" asks the same door again, and the store
 * resumes from the refused step.
 */
export class TemplateInstallRefused extends Error {
  constructor(readonly refusal: Record<string, unknown> | null | undefined) {
    super(refusalSentence(refusal));
    this.name = "TemplateInstallRefused";
  }
}

/** The person stopped the run (Cancel): nothing more is asked of the store; what was made is kept for Try again. */
export class TemplateUseStopped extends Error {
  constructor() {
    super("Stopped; the tables made so far are kept.");
    this.name = "TemplateUseStopped";
  }
}

/**
 * The store's refusal as ONE plain sentence (ADVERSARIAL-6 F4): the records family's words (template-copy.ts
 * `templateDoorSentence`); the step, its label and the raw text go to the console. "Try again" is the screen's button.
 */
export function refusalSentence(refusal: Record<string, unknown> | null | undefined): string {
  return templateDoorSentence(refusal ?? { message: "" });
}

/** Waits for `work`, or rejects with the signal's reason the moment it is aborted. */
export function untilStopped<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const stop = () => reject(signal.reason);
    signal.addEventListener("abort", stop, { once: true });
    work.then(
      (v) => (signal.removeEventListener("abort", stop), resolve(v)),
      (e) => (signal.removeEventListener("abort", stop), reject(e)),
    );
  });
}

type Source = ReturnType<typeof supabaseDataSource>;
/** The data source with every rpc cut off by `signal`: a stopped run asks the store nothing more. */
function stoppable(source: Source, signal?: AbortSignal): Source {
  if (!signal) return source;
  const rpc = ((...args: Parameters<Source["rpc"]>) => {
    if (signal.aborted) return Promise.reject(signal.reason);
    return untilStopped(Promise.resolve(source.rpc(...args)), signal);
  }) as Source["rpc"];
  return { ...source, rpc };
}

/**
 * TEMPLATE-FRESH (Notion parity): every "Use template" makes its OWN copy of the tables, named
 * "<Table> · <title>" (the store numbers a repeated title: "Acme Projects 2"). `installId` continues one copy
 * (Try again after a refusal or a stop); `onInstallId` hears the copy's id the moment the store names it.
 */
export interface FreshCopy {
  title: string | null;
  installId?: string | null;
  onInstallId?: (installId: string) => void;
}

/**
 * Installs (or finds, or upgrades) the template's tables in `organizationId`, with its host steps.
 * With `fresh`, makes (or continues) one new copy instead of the organization's one default install.
 * Each step the store takes streams into `onStage` ("Making tables 12/40…"). A refusal throws
 * TemplateInstallRefused at once. `signal` stops the run (its reason is thrown); the install stays at its step.
 */
export async function installTemplateTables(
  t: SpaceTemplateFull,
  organizationId: string,
  dispatch: AppDispatch,
  onStage?: (stage: string) => void,
  signal?: AbortSignal,
  fresh?: FreshCopy,
): Promise<Record<string, ResolvedTable>> {
  const source = stoppable(supabaseDataSource(createClient()), signal);
  onStage?.("Making tables…");
  const door = timed("install-door", () =>
    runTemplateDoor(source, fresh ? "template_install_fresh" : "template_install", organizationId, t.id, {
      maxCalls: 400,
      // TEMPLATE-INSTALL-2: the id is the page's from before the first call (held for a refresh, else minted by the door runner and
      // announced through onInstallId at once), so a refresh inside the door's first ~4 s resumes this copy instead of making another.
      ...(fresh ? { title: fresh.title, installId: fresh.installId ?? null, ...(fresh.onInstallId ? { onInstallId: fresh.onInstallId } : {}) } : {}),
      onCall: (answer) => {
        // The copy's id first: a refused or stopped run is resumed on THIS copy, never a new one.
        if (fresh && answer.install_id) fresh.onInstallId?.(answer.install_id);
        // A refusal ends the run now, never re-asked in a loop the person cannot see (55P03 waited 148 s a call).
        if (answer.state === "refused") throw new TemplateInstallRefused(answer.refusal);
        if (typeof answer.next_step === "number" && typeof answer.steps === "number" && !answer.done) onStage?.(`Making tables ${answer.next_step}/${answer.steps}…`);
      },
    }),
  );
  // A thrown transport failure (a dropped connection) reads as the shared mapper's one sentence, never "Failed to fetch".
  const done = await door.catch((err: unknown) => {
    if (err instanceof TemplateInstallRefused || signal?.aborted) throw err;
    throw new Error(templateDoorSentence(null, { code: "", message: err instanceof Error ? err.message : String(err) }));
  });
  if (!done.ok || !done.answer?.done) {
    if (done.answer?.refusal) throw new TemplateInstallRefused(done.answer.refusal);
    throw new Error(templateDoorSentence(null, done.error ?? { code: "", message: "" }));
  }
  let answer: TemplateDoorAnswer = done.answer;
  // A fresh copy is made at the newest version; only the default install is upgraded in place.
  const hint = fresh ? null : templateUpgradeHint(answer);
  if (hint) {
    onStage?.(`Upgrading v${hint.from_version} → v${hint.to_version}…`);
    const up = await upgradeTemplateInstall(source, organizationId, hint.install_id, hint.template_id, { maxCalls: 6 });
    signal?.throwIfAborted();
    if (!up.ok || !up.answer) {
      const refusal = up.answer?.refusal as { message?: string } | null | undefined;
      console.warn("[spaces] the template upgrade stopped", { to: hint.to_version, refusal, error: up.error });
      throw new Error(templateDoorSentence(up.answer?.refusal ?? null, up.error ?? { code: "", message: "" }));
    }
    if (up.answer.upgraded !== false) toast.success(`Tables upgraded to version ${up.answer.version ?? hint.to_version}: ${upgradeCountsText(up.answer.counts)}.`);
    answer = up.answer;
  }
  onStage?.("Reading the tables' fields…");
  const tables = await untilStopped(
    timed("field-keys", () => withInstalledKeys(tablesFrom(answer, t.spec), t.spec, organizationId)),
    signal,
  );
  onStage?.("Adding the assistant…");
  await untilStopped(
    timed("host-steps", () => runHostSteps(answer, organizationId, dispatch, "The template's assistant")),
    signal,
  );
  return tables;
}

/**
 * The organization's earlier copies of this template on an older version (TEMPLATE-FRESH: a new copy is made at
 * the newest version; each earlier copy is upgraded only when the person says so). Answers how many there are and
 * the step that upgrades them all, one copy at a time.
 */
export async function olderTemplateCopies(t: Pick<SpaceTemplateCard, "catalogue_id">, organizationId: string): Promise<{ count: number; upgrade: () => Promise<{ upgraded: number; refused: string[] }> }> {
  const source = supabaseDataSource(createClient());
  const { instances } = await listTemplateInstances(source, organizationId, t.catalogue_id);
  const older = instances.filter((i) => i.upgrade);
  return {
    count: older.length,
    upgrade: async () => {
      let upgraded = 0;
      const refused: string[] = [];
      for (const i of older) {
        const hint = i.upgrade!;
        const up = await upgradeTemplateInstall(source, organizationId, hint.install_id, hint.template_id, { maxCalls: 6 });
        if (up.ok && up.answer) upgraded++;
        else refused.push(`${i.title ?? "A copy"}: ${(up.answer?.refusal as { message?: string } | null)?.message ?? up.error?.message ?? "the upgrade stopped"}`);
      }
      return { upgraded, refused };
    },
  };
}

/**
 * NOTHING WAITS SILENTLY (ADVERSARIAL-5 F4): a read that never answers (the database API restarting) rejects with
 * `message` after `ms`, so the screen names what it was waiting on and offers Try again.
 */
export function withDeadline<T>(work: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(work).then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e: unknown) => (clearTimeout(timer), reject(e)),
    );
  });
}

/** How long a template link's opening reads (the library, the person's pages, their copies) may take before it is said. */
export const USE_TEMPLATE_OPEN_DEADLINE_MS = 15_000;

/** One copy of a template in an organization (custom.template_instances), as "You already have this" shows it. */
export interface InstalledCopy {
  installId: string;
  title: string | null;
  /** The template version the copy was made at, and the newest one when it is newer. */
  version: number;
  newerVersion: number | null;
  startedAt: string;
  finishedAt: string | null;
  /** The copy's root page, by the id the run recorded on it (template-copy.ts): never found by title. */
  root: SpaceId;
  /** True when the copy was removed (Move to Trash on its root): offered as "Restore it", never "Open it". */
  trashed: boolean;
}

/**
 * The organization's copies of a catalog id that can be opened or restored, newest first (ADVERSARIAL-6 F2):
 * - live: the install is installed AND its recorded root page is live → "Open it";
 * - trashed: the install was removed AND its root page is in Trash → "Restore it".
 * A copy whose root page is gone, was never recorded, or disagrees with its install (live tables, trashed page) is not
 * offered: the default press must never end in "its pages were not found".
 */
export async function installedCopies(organizationId: string, catalogueId: string): Promise<InstalledCopy[]> {
  const { ok, instances, error } = await listTemplateInstances(supabaseDataSource(createClient()), organizationId, catalogueId);
  if (!ok) throw new Error(`We couldn't read your copies of this template: ${error?.message ?? "no answer"}`);
  const candidates = instances.filter((i) => i.state !== "refused" && i.finished_at);
  const roots = await copyRoots(organizationId, candidates.map((i) => i.install_id));
  const out: InstalledCopy[] = [];
  for (const i of candidates) {
    const root = roots.get(i.install_id);
    if (!root) continue;
    const live = copyIsLive(i.state);
    if (live === root.trashed) continue;
    out.push({ installId: i.install_id, title: i.title, version: i.version, newerVersion: i.newer_version, startedAt: i.started_at, finishedAt: i.finished_at, root: root.id, trashed: !live });
  }
  return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/**
 * The page set of a "Use template" run that has not finished: its root, every page made so far by pack key,
 * whether the failed run moved them to Trash, and the table copy they are made over. TEMPLATE-INSTALL-3 (a cut-off
 * run left three empty pages, and a second press made a full new set beside them) and USE-TEMPLATE-FAILURES (Try
 * again must resume): the next run REUSES this set. It is brought back from Trash, the missing pages are made,
 * and every page is filled, so a retry never duplicates.
 */
export interface PackRun {
  root: SpaceId;
  ids: Record<string, SpaceId>;
  trashed: boolean;
  /** The table copy this page set is made over (TEMPLATE-FRESH): Try again continues it, never a new copy. */
  installId?: string | null;
  /**
   * ADVERSARIAL-5 F5: page ids chosen and journaled BEFORE their write, whose write has not answered yet. A refresh
   * between a page's insert and the journal write used to lose the id, and the resume made the page again (a stray
   * top-level "Insurance notes"). A resume writes a pending page again under the SAME id; the store's create is
   * idempotent by id (an existing page is reused and put under its parent).
   */
  pending?: SpaceId[];
}

export interface PackRunJournal {
  read(): PackRun | null;
  write(run: PackRun | null): void;
  /** The table copy's install id when it is known before any page exists (an attempt journal keeps it). */
  installId?(): string | null;
  /** Keeps the install id the door answered before the run's first page write (refresh resumes that copy). */
  noteInstallId?(installId: string): void;
}

/** A browser-tab journal for one template in one organization (an in-flight run is specific to this client). */
export function packRunJournal(organizationId: string, templateId: string): PackRunJournal {
  const key = `matrx:spaces:pack-run:${organizationId}:${templateId}`;
  const storage = () => (typeof window === "undefined" ? null : window.localStorage);
  return {
    read: () => {
      const raw = storage()?.getItem(key);
      if (!raw) return null;
      try {
        const run = JSON.parse(raw) as PackRun;
        if (run && typeof run.root === "string") return { root: run.root, ids: run.ids ?? {}, trashed: !!run.trashed, installId: run.installId ?? null, pending: run.pending ?? [] };
      } catch {
        // An older journal held the bare root id of a run that was cut off (never trashed).
      }
      return { root: raw, ids: {}, trashed: false };
    },
    write: (run) => (run ? storage()?.setItem(key, JSON.stringify(run)) : storage()?.removeItem(key)),
  };
}

const reasonOf = (err: unknown) => (err instanceof Error && err.message ? err.message : errorSentence(err));

/** What makeTemplatePages can also do: hold preview sizes, say the moment the root is ready, and be stopped. */
export interface MakePagesOptions {
  sizes?: PreviewSizes | null;
  /** Called once the root page holds its finished content — before the sub-pages are written. */
  onRootReady?: (root: SpaceDoc) => void;
  /** Stops the run (Cancel): the pages made so far go to Trash and are kept in the journal for Try again. */
  signal?: AbortSignal;
  /**
   * TEMPLATE-INSTALL-3: tells the template's install the root page it made, so Remove moves it (and its sub-pages) to Trash and Restore
   * brings it back. Called once the tables are installed and every page is written; a failure is the run's failure (the pages go to Trash,
   * Try again resumes the same copy, and recording the same page twice is one record).
   */
  notePage?: (installId: string, root: SpaceDoc) => Promise<void>;
}

/** The unfinished run's root, brought back (from Trash if the failed run put it there); null = start fresh. */
async function resumeRun(store: SpacesStore, run: PackRun): Promise<SpaceDoc | null> {
  try {
    if (run.trashed) await store.restore(run.root);
    return await store.get(run.root);
  } catch (err) {
    toast.warning(`An earlier unfinished copy of this template could not be brought back, so a new copy is made: ${reasonOf(err)}`);
    return null;
  }
}

/**
 * Makes the template's pages in `organizationId`: the root at the top level (through `createRoot`), every
 * sub-page under its parent in order, then each page's content with the tokens swapped for the made
 * tables and pages (each write lands on the page's current version). Answers the root.
 * FAST (ADVERSARIAL-1 #2): the page tree is made WHILE the tables install (`tables` may be a promise; only the
 * content needs them); sub-pages under different parents are made at once (siblings in order); the root's
 * content is written first and `onRootReady` opens it while the sub-pages are filled six at a time.
 * NEVER STUCK, NEVER DOUBLED (USE-TEMPLATE-FAILURES): the first failure on either side ends the run at once. A
 * refused install stops the tree at its next page, and a failed page write never waits out the install. The
 * pages made so far go to Trash and stay in the journal; the next run brings them back and finishes them.
 */
export async function makeTemplatePages(
  store: SpacesStore,
  createRoot: (title: string, id: SpaceId) => Promise<SpaceDoc>,
  t: SpaceTemplateFull,
  tables: Record<string, ResolvedTable> | Promise<Record<string, ResolvedTable>>,
  onProgress?: (done: number, total: number) => void,
  journal?: PackRunJournal,
  options: MakePagesOptions = {},
): Promise<SpaceDoc> {
  const ordered = packPagesInOrder(t.pack.pages);
  const earlier = journal?.read() ?? null;
  // A root whose write never answered (a refresh in the first second) is written again under its journaled id.
  const rootPending = !!earlier && (earlier.pending ?? []).includes(earlier.root);
  const resumed = earlier && !rootPending ? await resumeRun(store, earlier) : null;
  options.signal?.throwIfAborted();
  const run: PackRun = {
    root: resumed?.id ?? (rootPending && earlier ? earlier.root : newPageId()),
    ids: resumed && earlier ? { ...earlier.ids } : {},
    trashed: false,
    installId: earlier?.installId ?? null,
    pending: resumed && earlier ? [...(earlier.pending ?? [])] : [],
  };
  run.ids[ordered[0].key] = run.root;
  const remember = () => journal?.write({ ...run, pending: [...(run.pending ?? [])], installId: journal.read()?.installId ?? run.installId ?? null });
  let root: SpaceDoc;
  if (resumed) root = resumed;
  else {
    // The id is in the journal BEFORE the write: a refresh at any point finds this root again, never a second one.
    run.pending = [run.root];
    remember();
    root = await createRoot(ordered[0].title, run.root);
    run.pending = [];
    run.root = root.id;
    run.ids[ordered[0].key] = root.id;
  }
  remember();
  try {
    const made = await fillTemplatePages(store, root, ordered, Promise.resolve(tables), onProgress, options, run, remember);
    if (options.notePage) {
      const installId = journal?.read()?.installId ?? run.installId;
      if (!installId) throw new Error("The template's copy was made, but its id was not kept, so Remove would leave the pages behind.");
      await options.notePage(installId, made);
    }
    journal?.write(null);
    return made;
  } catch (err) {
    let undone = true;
    try {
      await store.archive(root.id);
    } catch {
      undone = false;
    }
    run.trashed = undone;
    remember();
    // ADVERSARIAL-6 F4: one sentence on the screen; where the pages are is the console's (Try again finishes them either way).
    console.warn(`[spaces] the template run stopped; the pages made so far are ${undone ? "in Trash" : "kept"} for Try again.`, err);
    throw err instanceof Error ? err : new Error(reasonOf(err));
  }
}

/** A page id chosen by the run before its write (journaled first, so a resume reuses it). */
export const newPageId = (): SpaceId => crypto.randomUUID();

/** How long a failed run waits for a page create already on the wire before it answers. */
const TREE_SETTLE_MS = 5_000;

/** Makes every sub-page not already in `ids` under its parent: parents in parallel, each parent's children in order. */
async function makePageTree(
  store: SpacesStore,
  ordered: ReturnType<typeof packPagesInOrder>,
  ids: Record<string, SpaceId>,
  onMade: () => void,
  signal: AbortSignal,
  pending: SpaceId[] = [],
  remember: () => void = () => undefined,
): Promise<Record<string, SpaceId>> {
  const childrenOf = new Map<string, typeof ordered>();
  for (const p of ordered.slice(1)) {
    const parent = p.parent ?? ordered[0].key;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), p]);
  }
  const under = async (parentKey: string): Promise<void> => {
    let after: SpaceId | undefined;
    const kids = childrenOf.get(parentKey) ?? [];
    for (const p of kids) {
      signal.throwIfAborted();
      // A page an earlier run made is reused, never made twice. A page whose id was journaled but whose write never
      // answered is written again under that SAME id (the store reuses it if the insert landed).
      const id = ids[p.key];
      if (!id || pending.includes(id)) {
        const planned = id ?? newPageId();
        ids[p.key] = planned;
        if (!pending.includes(planned)) pending.push(planned);
        remember();
        const made = await store.create({ id: planned, parentId: ids[parentKey], title: p.title, afterId: after });
        pending.splice(pending.indexOf(planned), 1);
        ids[p.key] = made.id;
      }
      after = ids[p.key];
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
  run: PackRun,
  remember: () => void,
): Promise<SpaceDoc> {
  // Both the tree and the content count: 2 steps a sub-page, 1 for the root's content.
  const total = ordered.length * 2 - 1;
  let done = 0;
  const step = () => onProgress?.(++done, total);
  // One stop for both sides: Cancel, or the tables' failure (the tree stops at its next page and is not waited for).
  const stop = new AbortController();
  const external = options.signal;
  const onExternal = () => stop.abort(external?.reason);
  if (external?.aborted) onExternal();
  external?.addEventListener("abort", onExternal, { once: true });
  let treeSettled: Promise<void> = Promise.resolve();
  try {
    const tablesP = tablesReady.catch((err: unknown) => {
      stop.abort(err);
      throw err;
    });
    run.pending ??= [];
    const tree = timed("page-tree", () => makePageTree(store, ordered, run.ids, () => (remember(), step()), stop.signal, run.pending, remember));
    treeSettled = tree.then(
      () => undefined,
      () => undefined,
    );
    // Both are always settled by someone: a page failure never leaves the install's rejection unhandled.
    tablesP.catch(() => undefined);
    tree.catch(() => undefined);
    const ids = await untilStopped(tree, stop.signal);
    const tables = await untilStopped(tablesP, stop.signal);
    const write = (p: (typeof ordered)[number]) => {
      stop.signal.throwIfAborted();
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
    return await timed("page-content", async () => {
      // The root first: it opens finished while its sub-pages are written behind it.
      const madeRoot = await untilStopped(write(ordered[0]), stop.signal);
      options.onRootReady?.(madeRoot);
      const kids = ordered.slice(1);
      for (let i = 0; i < kids.length; i += 6) await untilStopped(Promise.all(kids.slice(i, i + 6).map(write)), stop.signal);
      return madeRoot;
    });
  } catch (err) {
    // A page create already on the wire lands before the set goes to Trash and the journal is final, or a
    // Try again would make that page a second time. Bounded: a create that never answers does not hold the run.
    stop.abort(err);
    await Promise.race([treeSettled, new Promise((r) => setTimeout(r, TREE_SETTLE_MS))]);
    throw err;
  } finally {
    external?.removeEventListener("abort", onExternal);
  }
}

/**
 * How long a "Use template" run may go without one step of progress before the person is told it is still
 * working and offered Cancel. A knob: one constant, read by every run.
 */
export const USE_TEMPLATE_STALL_MS = 20_000;

/** What one "Use template" run needs; every side effect is handed in, so the whole flow runs under test. */
export interface UseTemplateRun {
  template: SpaceTemplateFull;
  store: SpacesStore;
  /**
   * Makes the root page under the id the run chose (idempotent by id: a resume after a lost answer reuses it), stamped
   * with the copy's install id (ADVERSARIAL-6 F1: the root's Trash and Restore follow the install; template-copy.ts).
   */
  createRoot: (title: string, id: SpaceId, installId: string) => Promise<SpaceDoc>;
  /** Installs the tables (installTemplateTables with the stage, the stop signal and the fresh copy). */
  install: (onStage: (stage: string) => void, signal: AbortSignal, fresh: FreshCopy) => Promise<Record<string, ResolvedTable>>;
  journal: PackRunJournal;
  sizes?: PreviewSizes | null;
  /** The stage text; null when the run has ended (it never outlives the run). */
  onStage: (stage: string | null) => void;
  onRootReady?: (root: SpaceDoc) => void;
  /** Called with Cancel when nothing has moved for `stallMs`; with null when it moves again or the run ends. */
  onStalled?: (cancel: (() => void) | null) => void;
  stallMs?: number;
  /** TEMPLATE-INSTALL-3: records the root page on the install (template_install_note, kind page), so Remove moves the pages to Trash. */
  notePage?: (installId: string, root: SpaceDoc) => Promise<void>;
}

export type UseTemplateResult = { ok: true; root: SpaceDoc } | { ok: false; message: string; stopped: boolean };

/**
 * One "Use template" run, start to end: the tables (a fresh copy) install while the pages are made, every step
 * streams into `onStage`, a stall offers Cancel, and EVERY way the run can end comes back as a result: the made
 * root, or the one sentence to show with Try again (a refusal in the store's words, a failed write, a dropped
 * connection, a stop). The run never hangs on a failure, and the stage text is cleared before it answers.
 * Try again is the same call again: the journal carries the copy's install id and the pages, so it resumes.
 */
export async function runUseTemplate(r: UseTemplateRun): Promise<UseTemplateResult> {
  const stop = new AbortController();
  const stallMs = r.stallMs ?? USE_TEMPLATE_STALL_MS;
  let ended = false;
  let tableStage = "Making tables…";
  let pageStage = "";
  let last = Date.now();
  let stalled = false;
  const text = () => [tableStage, pageStage].filter(Boolean).join(" · ") || "Finishing…";
  const moved = () => {
    if (ended) return;
    last = Date.now();
    if (stalled) {
      stalled = false;
      r.onStalled?.(null);
    }
    r.onStage(text());
  };
  const cancel = () => stop.abort(new TemplateUseStopped());
  const watch = setInterval(() => {
    if (ended || stalled || Date.now() - last < stallMs) return;
    stalled = true;
    r.onStage(`Still working · ${text()}`);
    r.onStalled?.(cancel);
  }, Math.max(50, Math.min(1000, Math.floor(stallMs / 4))));

  // The copy's install id lives with the pages in the journal: Try again continues the SAME copy.
  // ADVERSARIAL-6 F1: the copy's id is chosen HERE, before the root page or the first install call, so the root is
  // created carrying it (the same id the door then installs under; runTemplateDoor would otherwise mint it itself).
  let installId: string = r.journal.read()?.installId ?? r.journal.installId?.() ?? newTemplateInstallId();
  if (!r.journal.read()?.installId) r.journal.noteInstallId?.(installId);
  const journal: PackRunJournal = {
    read: () => {
      const run = r.journal.read();
      return run ? { ...run, installId: installId ?? run.installId ?? null } : null;
    },
    write: (run) => r.journal.write(run ? { ...run, installId: installId ?? run.installId ?? null } : null),
  };
  const ordered = packPagesInOrder(r.template.pack.pages);
  try {
    moved();
    const tables = r
      .install(
        (stage) => {
          tableStage = stage;
          moved();
        },
        stop.signal,
        {
          title: ordered[0]?.title ?? null,
          installId,
          onInstallId: (id) => {
            if (installId === id) return;
            installId = id;
            const run = r.journal.read();
            if (run) r.journal.write({ ...run, installId: id });
            else r.journal.noteInstallId?.(id);
          },
        },
      )
      .then((made) => {
        tableStage = "";
        moved();
        return made;
      });
    // Answered through makeTemplatePages; this keeps an early page failure from leaving it unhandled.
    tables.catch(() => undefined);
    const root = await makeTemplatePages(
      r.store,
      (title, id) => r.createRoot(title, id, installId),
      r.template,
      tables,
      (done) => {
        // ADVERSARIAL-6 F5: the counter counts PAGES (never writes), and never sits frozen beside the table step. The tree
        // makes the n-1 sub-pages (the root already exists); then, while the tables still install, only the table step's own
        // progress shows; once they are in, each page's content fills.
        const n = ordered.length;
        const made = n - 1;
        if (done < made) pageStage = `Pages ${done + 1}/${n}`;
        else if (done === made) pageStage = tableStage ? "" : `Filling pages 0/${n}`;
        else pageStage = `Filling pages ${done - made}/${n}`;
        moved();
      },
      journal,
      { sizes: r.sizes, onRootReady: r.onRootReady, signal: stop.signal, notePage: r.notePage },
    );
    return { ok: true, root };
  } catch (err) {
    const stopped = stop.signal.aborted && stop.signal.reason instanceof TemplateUseStopped;
    // Whatever failed, nothing more is asked of the store: an install still running is stopped (it resumes later).
    if (!stop.signal.aborted) stop.abort(err);
    return { ok: false, message: reasonOf(err), stopped };
  } finally {
    ended = true;
    clearInterval(watch);
    if (stalled) r.onStalled?.(null);
    r.onStage(null);
  }
}
