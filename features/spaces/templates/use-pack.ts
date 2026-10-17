// features/spaces/templates/use-pack.ts — the Spaces template library in the browser: list the catalogue,
// read one template, and "Use template".
//
// ONE CATALOGUE: a Space template is a platform `custom.template` row (published by
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
import { toast } from "@/lib/toast";
import { createClient } from "@/utils/supabase/client";

import type { SpaceDoc, SpaceId, SpacesStore } from "../contract";
import { runHostSteps, upgradeCountsText } from "../data/agency-install";
import { registerSampleWorld } from "../data/sources";
import { saveOnCurrent } from "../store/sample";

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

/** Every Space template the person can use; `installedIn` marks the ones that organization already has. */
export async function listSpaceTemplates(installedIn: string | null): Promise<SpaceTemplateCard[]> {
  const { data, error } = await door().rpc("space_templates", { p_filter: installedIn ? { installed_in: installedIn } : {} });
  if (error) throw new Error(`We couldn't list the templates: ${error.message}`);
  return (data?.cards ?? []) as SpaceTemplateCard[];
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
      if (!card?.pack?.pages?.length) throw new Error("This template has no pages.");
      return card;
    })();
    p.catch(() => full.delete(id));
    full.set(id, p);
  }
  return p;
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
  let n = 0;
  return packPagesInOrder(t.pack.pages).map((p) => ({
    key: p.key,
    title: p.title,
    doc: { title: p.title, icon: p.icon ?? null, cover: p.cover ?? null, settings: packPageSettings(p), blocks: resolvePackBlocks(p.blocks, { tables, pages, newId: () => `preview-${p.key}-${++n}` }) },
  }));
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
  const done = await runTemplateDoor(supabaseDataSource(client), "template_install", organizationId, t.id, { maxCalls: 400 });
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
  const tables = await withInstalledKeys(tablesFrom(answer, t.spec), t.spec, organizationId);
  onStage?.("Adding the assistant…");
  await runHostSteps(answer, organizationId, dispatch, "The template's assistant");
  return tables;
}

/**
 * Makes the template's pages in `organizationId`: the root at the top level (through `createRoot`), every
 * sub-page under its parent in order, then each page's content with the tokens swapped for the made
 * tables and pages (each write lands on the page's current version). Answers the root.
 */
export async function makeTemplatePages(
  store: SpacesStore,
  createRoot: (title: string) => Promise<SpaceDoc>,
  t: SpaceTemplateFull,
  tables: Record<string, ResolvedTable>,
  onProgress?: (done: number, total: number) => void,
): Promise<SpaceDoc> {
  const ordered = packPagesInOrder(t.pack.pages);
  const ids: Record<string, SpaceId> = {};
  const lastChild = new Map<string, SpaceId>();
  const root = await createRoot(ordered[0].title);
  ids[ordered[0].key] = root.id;
  onProgress?.(1, ordered.length);
  for (const [i, p] of ordered.slice(1).entries()) {
    const parent = ids[p.parent ?? ordered[0].key];
    const made = await store.create({ parentId: parent, title: p.title, afterId: lastChild.get(parent) });
    ids[p.key] = made.id;
    lastChild.set(parent, made.id);
    onProgress?.(i + 2, ordered.length);
  }
  const newId = () => crypto.randomUUID();
  const write = (p: (typeof ordered)[number]) =>
    saveOnCurrent(store, ids[p.key], (cur) => ({
      ...cur,
      title: p.title,
      icon: p.icon ?? null,
      cover: p.cover ?? null,
      settings: packPageSettings(p),
      ...(p.properties ? { properties: p.properties } : {}),
      blocks: resolvePackBlocks(p.blocks, { tables, pages: ids, newId }),
    }));
  // Sub-pages first, six at a time; the root last, so an early open of the root shows the finished page.
  const kids = ordered.slice(1);
  for (let i = 0; i < kids.length; i += 6) await Promise.all(kids.slice(i, i + 6).map(write));
  return write(ordered[0]);
}
