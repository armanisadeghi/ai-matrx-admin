// features/spaces/data/row-templates.ts — what a database block's blue "New ▾" offers, and what a press makes.
//
// Notion's database "New": the chevron lists the table's row templates (the default marked) plus "Empty page";
// picking one makes a row with that template's preset values and opens its page with that template's body.
// Plain "New" starts from the table's default template when it has one; "Empty page" makes a bare row with an
// empty page (so the default does not land on it later when the row is first opened).
//
// Doors (all custom.*, viewer on the table to read, editor/admin to declare): `row_templates` (names + preset
// values, dates resolved now), `row_template_bodies` (page bodies by template id), `row_template_default` (which
// one is the default) and `row_template_declare` ({template_id, default: true} = "Set as default"). The row's
// page goes through the ONE row-page path (embed/row-page.ts `ensureRowPage`), never a second one.

import { ensureRowPage, readTemplateBody, type RowPageBody, type RowPageDb } from "../embed/row-page";

export interface RowTemplateChoice {
  id: string;
  name: string;
  values: Record<string, unknown>;
  body: RowPageBody | null;
  isDefault: boolean;
}

/** What a press starts from: a template, the table default ("default"), or nothing ("empty"). */
export type NewRowPick = { kind: "default" } | { kind: "empty" } | { kind: "template"; id: string };

const objectOr = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** The table's row templates as the New menu lists them (store order: by name), the default marked. */
export async function readRowTemplates(db: RowPageDb, organizationId: string, tableId: string): Promise<RowTemplateChoice[]> {
  const args = { p_organization_id: organizationId, p_table_id: tableId };
  const custom = db.schema("custom");
  const [list, bodies, def] = await Promise.all([
    custom.rpc<Array<{ template_id: string; name: string; values: unknown }>>("row_templates", args),
    custom.rpc<Array<{ template_id: string; body: unknown }>>("row_template_bodies", args),
    custom.rpc<Array<{ template_id: string }>>("row_template_default", args),
  ]);
  const failed = list.error ?? bodies.error ?? def.error;
  if (failed) throw new Error(`The table's templates could not be read: ${failed.message}`);
  const bodyOf = new Map((bodies.data ?? []).map((b) => [b.template_id, readTemplateBody(b.body)]));
  const defaultId = def.data?.[0]?.template_id ?? null;
  return (list.data ?? []).map((t) => ({ id: t.template_id, name: t.name, values: objectOr(t.values), body: bodyOf.get(t.template_id) ?? null, isDefault: t.template_id === defaultId }));
}

/** The template a press starts from (null = a bare row with an empty page). */
export function templateFor(pick: NewRowPick, templates: readonly RowTemplateChoice[]): RowTemplateChoice | null {
  if (pick.kind === "empty") return null;
  if (pick.kind === "default") return templates.find((t) => t.isDefault) ?? null;
  return templates.find((t) => t.id === pick.id) ?? null;
}

/** The new row's values: the template's presets, then the view's own (a "This page's row" link wins). */
export function newRowData(template: RowTemplateChoice | null, viewValues: Record<string, unknown>): Record<string, unknown> {
  return { ...(template?.values ?? {}), ...viewValues };
}

/**
 * Makes the row and its page, then answers the row id (the caller opens it). The page is made BEFORE the row
 * opens, so the record page finds it and never starts a second one from the default template.
 */
export async function startNewRow(
  db: RowPageDb,
  args: {
    organizationId: string;
    tableId: string;
    template: RowTemplateChoice | null;
    viewValues: Record<string, unknown>;
    /** The store write of the new row (records client `recordWrite`): answers the new row id. */
    writeRow: (data: Record<string, unknown>) => Promise<{ ok: true; id: string } | { ok: false; message: string }>;
    /** Told the row's page id once it exists (primes "This page's row" for its views). */
    onPage?: (spaceId: string, recordId: string) => void;
  },
): Promise<{ ok: true; recordId: string; pageError?: string } | { ok: false; message: string }> {
  const written = await args.writeRow(newRowData(args.template, args.viewValues));
  if (!written.ok) return written;
  // The row exists whatever happens to its page: a page that cannot start is said, and the row still opens.
  try {
    await startTemplatePage(db, { ...args, recordId: written.id });
  } catch (err) {
    return { ok: true, recordId: written.id, pageError: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true, recordId: written.id };
}

/**
 * The new row's page from the picked template's body (null = empty). Also used after the whole-record form
 * made the row (a required column refused the bare write), so a pick lands the same way on both paths.
 */
export async function startTemplatePage(
  db: RowPageDb,
  args: { organizationId: string; tableId: string; recordId: string; template: RowTemplateChoice | null; onPage?: (spaceId: string, recordId: string) => void },
): Promise<string> {
  const { spaceId } = await ensureRowPage(db, {
    organizationId: args.organizationId,
    tableId: args.tableId,
    recordId: args.recordId,
    title: "",
    notes: null,
    template: args.template?.body ?? null,
  });
  args.onPage?.(spaceId, args.recordId);
  return spaceId;
}

/** "Set as default": this template becomes the one every new row's page starts from. */
export async function setDefaultRowTemplate(db: RowPageDb, organizationId: string, tableId: string, templateId: string): Promise<void> {
  const { error } = await db.schema("custom").rpc<string>("row_template_declare", { p_organization_id: organizationId, p_table_id: tableId, p_spec: { template_id: templateId, default: true } });
  if (error) throw new Error(error.message);
}
