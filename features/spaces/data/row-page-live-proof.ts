// features/spaces/data/row-page-live-proof.ts — live proof of ROW PAGES (lane ROW-PAGE-VIEWS): a Clients table
// whose rows are pages holding views of Payments / Projects / Meetings / Quick Links narrowed to THIS client.
//
// Run: pnpm tsx --env-file=.env --env-file=.env.local features/spaces/data/row-page-live-proof.ts <admin-org-id> [--keep]
// Signs in as admin@admin.com and test@test.com (a non-member of that organization). Prints one PASS/FAIL line
// per claim. Without --keep it archives every table and page it made; with --keep it prints their ids (the
// in-app walk uses them) and `--archive <clients-table-id,...>` later is the walk's own cleanup.
// Plan: common-docs/systems/data/custom-data/projects/row-pages/PLAN.md.

import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, declareTable, supabaseDataSource } from "@ai-matrx/records/core";

import type { Database } from "@/types/database.types";
import type { SpaceBlock } from "@/lib/spaces-blocks/types";
import { SupabaseSpacesStore } from "../store-db/supabase-store";
import { ensureRowPage, type RowPageDb } from "../embed/row-page";
import { resolveThisRow, THIS_ROW } from "./this-row";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const orgId = process.argv[2];
const keep = process.argv.includes("--keep");
if (!url || !key || !orgId) throw new Error("Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and an organization id argument.");

async function signedIn(email: string, password: string) {
  const db = createClient<Database>(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  const records = createRecordsClient({ dataSource: supabaseDataSource(db as never), actor: { actor: "user", user_id: data.user.id }, organizationId: orgId });
  return { db, userId: data.user.id, records };
}

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
const content = (db: unknown) => (db as { schema: (s: string) => Rpc }).schema("content");
const custom = (db: unknown) => (db as { schema: (s: string) => Rpc }).schema("custom");

const view = (tableId: string, title: string, viewName: string): SpaceBlock =>
  ({
    id: crypto.randomUUID(),
    type: "database",
    text: [],
    props: { source: { kind: "table", tableId }, inline: true, title, linked: true, views: [{ id: `view-${title.toLowerCase().replace(/\W+/g, "-")}`, name: viewName, layout: "grid", filters: { client: THIS_ROW } }] },
    children: [],
  }) as unknown as SpaceBlock;

async function main() {
  const admin = await signedIn(process.env.AI_ADMIN_USERNAME!, process.env.AI_ADMIN_PASSWORD!);
  // `--archive <table-id,...> [--pages <space-id,...>]`: the walk's own cleanup of what --keep left.
  const archiveAt = process.argv.indexOf("--archive");
  if (archiveAt > 0) {
    const pagesAt = process.argv.indexOf("--pages");
    const done = new SupabaseSpacesStore(admin.db, orgId);
    for (const id of pagesAt > 0 ? process.argv[pagesAt + 1].split(",") : []) await done.archive(id);
    for (const id of process.argv[archiveAt + 1].split(",")) {
      const r = await admin.records.tableArchive({ table_id: id } as never);
      check(`archived table ${id}`, r.ok, r.ok ? "" : r.error.message);
    }
    process.exit(failures ? 1 : 0);
  }
  const member = await signedIn("test@test.com", process.env.SPACES_PROOF_SECOND_PASSWORD ?? process.env.AI_ADMIN_PASSWORD!);
  const store = new SupabaseSpacesStore(admin.db, orgId);
  const stamp = Date.now().toString(36);
  const tables: string[] = [];
  const pages: string[] = [];
  const shared: Array<{ type: string; id: string }> = [];
  const NAME = { key: "name", label: "Name", type: "text", sort: 10 } as const;

  const table = async (name: string, fields: Array<Record<string, unknown>>) => {
    const made = await declareTable(admin.records, { name, slug: `${name.toLowerCase().replace(/\W+/g, "_")}_${stamp}`, titleField: "name", fields: [NAME, ...fields] as never });
    if (!made.ok) throw new Error(`${name}: ${made.error.message}`);
    tables.push(made.data);
    return made.data;
  };
  const row = async (tableId: string, data: Record<string, unknown>) => {
    const made = await admin.records.recordWrite({ table_id: tableId, data: data as never });
    if (!made.ok) throw new Error(made.error.message);
    return made.data;
  };

  try {
    // The agency: Clients, and four tables linked to a client.
    const clients = await table("Clients", [{ key: "notes", label: "Notes", type: "rich_text", sort: 20 }]);
    const rel = (sort: number) => ({ key: "client", label: "Client", type: "relation", relationTarget: clients, multi: true, sort });
    const payments = await table("Payments", [{ key: "amount", label: "Amount", type: "number", sort: 20 }, rel(30)]);
    const projects = await table("Projects", [{ key: "status", label: "Status", type: "text", sort: 20 }, rel(30)]);
    const meetings = await table("Meetings", [{ key: "when", label: "When", type: "datetime", kind: "date", sort: 20 }, rel(30)]);
    const links = await table("Quick Links", [{ key: "url", label: "URL", type: "url", sort: 20 }, rel(30)]);
    const harborNotes = "Prefers **email** over calls.\n\n- Front desk: Maya Ortiz\n- Invoices go to billing@harbordental.example";
    const harbor = await row(clients, { name: "Harbor Dental", notes: harborNotes });
    const northline = await row(clients, { name: "Northline Fitness" });
    const saltwater = await row(clients, { name: "Saltwater Cafe" });
    const harborPay = [await row(payments, { name: "September retainer", amount: 2400, client: [harbor] }), await row(payments, { name: "Website refresh deposit", amount: 1800, client: [harbor] })];
    await row(payments, { name: "October retainer", amount: 1500, client: [northline] });
    await row(payments, { name: "Menu photo shoot", amount: 650, client: [saltwater] });
    await row(payments, { name: "Shared workshop", amount: 900, client: [northline, saltwater] });
    await row(projects, { name: "New patient landing page", status: "In progress", client: [harbor] });
    await row(projects, { name: "Spring membership campaign", status: "Planning", client: [northline] });
    await row(meetings, { name: "Quarterly review", when: "2026-10-20", client: [harbor] });
    await row(meetings, { name: "Kickoff call", when: "2026-10-16", client: [northline] });
    await row(links, { name: "Harbor brand folder", url: "https://drive.example.com/harbor", client: [harbor] });
    check("the agency is made: 5 tables, 3 clients, linked rows", true);

    // 1. THE STORE: a relation filter is "contains" (one-to-many and many-to-many).
    const ids = async (filter: Record<string, unknown>) => {
      const r = await admin.records.list({ table_id: payments, filter: filter as never });
      if (!r.ok) throw new Error(r.error.message);
      return r.data.rows.map((x) => x.id).sort();
    };
    const harborIds = await ids({ client: harbor });
    check("Payments filtered to Harbor Dental = exactly its 2 payments", JSON.stringify(harborIds) === JSON.stringify([...harborPay].sort()), `${harborIds.length} rows`);
    check("a payment linked to two clients shows under each (many-to-many)", (await ids({ client: saltwater })).length === 2 && (await ids({ client: northline })).length === 2);

    // 2. THE TEMPLATE: the client template places four views bound to "This page's row".
    const body = { v: 1, blocks: [view(payments, "Payments", "Payments made"), view(projects, "Projects", "All projects"), view(meetings, "Meetings", "Upcoming"), view(links, "Quick Links", "Links")] };
    const declared = await custom(admin.db).rpc("row_template_declare", { p_organization_id: orgId, p_table_id: clients, p_spec: { name: "Client page", body, default: true } });
    check("the client template is saved as the table's default", !declared.error, declared.error?.message ?? "");
    const def = await custom(admin.db).rpc("row_template_default", { p_organization_id: orgId, p_table_id: clients });
    check("the table's default template is the client template", Array.isArray(def.data) && (def.data as Array<{ name: string }>)[0]?.name === "Client page", def.error?.message ?? "");

    // 3. A ROW'S PAGE: notes migrate without loss; the four views land bound to this row.
    const ensured = await ensureRowPage(admin.db as unknown as RowPageDb, { organizationId: orgId, tableId: clients, recordId: harbor, title: "Harbor Dental", notes: harborNotes });
    pages.push(ensured.spaceId);
    const page = await store.get(ensured.spaceId);
    const text = JSON.stringify(page?.blocks ?? []);
    check("Harbor Dental's page is made", ensured.created && !!page);
    check("every word of the notes is in the page", ["Prefers ", "email", "Front desk: Maya Ortiz", "billing@harbordental.example"].every((w) => text.includes(w)));
    const after = await admin.records.list({ table_id: clients, filter: { name: "Harbor Dental" } as never });
    check("the Notes column itself is untouched", after.ok && after.data.rows[0]?.document?.notes === harborNotes);
    const dbs = (page?.blocks ?? []).filter((b) => b.type === "database");
    check("the page holds the template's four views, each bound to this page's row", dbs.length === 4 && dbs.every((b) => JSON.stringify(b.props).includes(THIS_ROW)), `${dbs.length} views`);
    const again = await ensureRowPage(admin.db as unknown as RowPageDb, { organizationId: orgId, tableId: clients, recordId: harbor, title: "Harbor Dental", notes: "OVERWRITE?" });
    check("opening again returns the same page, untouched", again.spaceId === ensured.spaceId && !again.created && JSON.stringify((await store.get(ensured.spaceId))?.blocks) === JSON.stringify(page?.blocks));

    // 4. "This page's row": resolved from the page (and a page under it), never from a plain page.
    const owner = async (db: unknown, spaceId: string) => {
      const r = await content(db).rpc("space_owning_row", { p_space_id: spaceId });
      return (r.data as Array<{ record_id: string }> | null)?.[0]?.record_id ?? null;
    };
    check("Harbor's page belongs to Harbor Dental", (await owner(admin.db, ensured.spaceId)) === harbor);
    const sub = await store.create({ parentId: ensured.spaceId, title: "Meeting notes", blocks: [] as never });
    pages.push(sub.id);
    check("a page inside Harbor's page inherits Harbor Dental", (await owner(admin.db, sub.id)) === harbor);
    const plain = await store.create({ parentId: null, title: `Agency notes ${stamp}`, blocks: [] as never });
    pages.push(plain.id);
    check("a plain page belongs to no row (its views show nothing)", (await owner(admin.db, plain.id)) === null && resolveThisRow({ client: THIS_ROW }, null).state === "no-row");
    const resolved = resolveThisRow({ client: THIS_ROW }, harbor);
    check("the view on Harbor's page asks for Harbor's payments only", resolved.state === "resolved" && JSON.stringify(await ids(resolved.filters)) === JSON.stringify([...harborPay].sort()));
    const list = await content(admin.db).rpc("space_list", { p_include_archived: false });
    const listed = new Set(((list.data as Array<{ id: string }>) ?? []).map((r) => r.id));
    check("row pages stay out of the Spaces sidebar; a plain page is in it", !listed.has(ensured.spaceId) && !listed.has(sub.id) && listed.has(plain.id), list.error?.message ?? "");

    // 5. ACCESS: a member sees only the child rows they may read.
    const share = async (type: string, id: string) => {
      const { error } = await admin.db.rpc("share_resource_with_user", { p_resource_type: type, p_resource_id: id, p_target_user_id: member.userId, p_permission_level: "viewer" });
      if (error) throw new Error(`share ${type}: ${error.message}`);
      shared.push({ type, id });
    };
    await share("record", harbor);
    await share("record", harborPay[0]);
    check("the member opens Harbor's page through the row", (await owner(member.db, ensured.spaceId)) === harbor);
    const theirs = await member.records.list({ table_id: payments, filter: { client: harbor } as never });
    const seen = theirs.ok ? theirs.data.rows.map((r) => r.id) : [];
    // A REFUSED READ IS A FAILURE, never a pass: the member holds a share on that row, so the store must answer with it.
    check("the member's view of Harbor's payments holds only the one shared with them", theirs.ok && seen.length === 1 && seen[0] === harborPay[0], theirs.ok ? `${seen.length} rows` : `refused: ${theirs.error.message}`);
    const startTheirs = await content(member.db).rpc("row_page_ensure", { p_organization_id: orgId, p_record_id: northline, p_title: "x", p_snapshot: { v: 1, blocks: [] } });
    check("a member who may not edit a row cannot start its page", !!startTheirs.error, startTheirs.error?.message ?? "started");

    if (keep) console.log(`\nKEPT  clients=${clients} payments=${payments} projects=${projects} meetings=${meetings} links=${links} harbor=${harbor} northline=${northline} saltwater=${saltwater} harborPage=${ensured.spaceId}`);
  } finally {
    for (const s of shared) await admin.db.rpc("revoke_resource_access", { p_resource_type: s.type, p_resource_id: s.id, p_target_user_id: member.userId });
    if (!keep) {
      for (const id of pages) await store.archive(id).catch(() => undefined);
      for (const id of tables) await admin.records.tableArchive({ table_id: id } as never).catch(() => undefined);
    }
  }
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
  process.exit(failures ? 1 : 0);
}

main().catch((e: unknown) => {
  console.error("FAIL  proof stopped:", e instanceof Error ? e.message : JSON.stringify(e));
  process.exit(1);
});
