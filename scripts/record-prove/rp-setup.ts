// RECORD-PROVE setup: a persona outsider + admin's Clinic Referrals / Clients (+ row page, Payments view), shares at viewer.
// Run: pnpm tsx --env-file=.env --env-file=.env.local scripts/record-prove/rp-setup.ts <admin-org-id>
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, declareTable, supabaseDataSource } from "@ai-matrx/records/core";
import { createFixtureUser, testTarget } from "../lib/persona.mjs";
import { SupabaseSpacesStore } from "../../features/spaces/store-db/supabase-store";
import { ensureRowPage } from "../../features/spaces/embed/row-page";
import { THIS_ROW } from "../../features/spaces/data/this-row";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const orgId = process.argv[2];
async function main() {
const db: any = createClient(url, key, { auth: { persistSession: false } });
const { data: au, error } = await db.auth.signInWithPassword({ email: process.env.AI_ADMIN_USERNAME!, password: process.env.AI_ADMIN_PASSWORD! });
if (error) throw error;
const records = createRecordsClient({ dataSource: supabaseDataSource(db), actor: { actor: "user", user_id: au.user.id }, organizationId: orgId });
const must = (r: any, w: string) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const stamp = Date.now().toString(36);

const user = await createFixtureUser(testTarget(), { suite: "record-prove", purpose: "outsider shared one referral row and one client row at viewer" });
console.log("outsider", user.id, user.fullName);

const NAME = { key: "name", label: "Name", type: "text", sort: 10 };
const mk = async (name: string, fields: any[], extra: any = {}) => must(await declareTable(records, { name, slug: `${name.toLowerCase().replace(/\W+/g, "_")}_${stamp}`, titleField: "name", fields: [NAME, ...fields], ...extra } as never), name);
const row = async (t: string, data: any) => must(await records.recordWrite({ table_id: t, data }), "row");

const referrals = await mk("Clinic Referrals", [
  { key: "referred_by", label: "Referred by", type: "member", sort: 20 },
  { key: "scan", label: "Scan", type: "attachment", multi: true, sort: 50 },
], { labelSingular: "Referral", labelPlural: "Referrals" });
const refRows = [];
for (const n of ["Maya Ortiz", "Dev Patel", "Lena Fischer"]) refRows.push(await row(referrals, { name: n }));

const clients = await mk("Clients", [{ key: "notes", label: "Notes", type: "rich_text", sort: 20 }]);
const payments = await mk("Payments", [{ key: "amount", label: "Amount", type: "number", sort: 20 }, { key: "client", label: "Client", type: "relation", relationTarget: clients, multi: true, sort: 30 }]);
const harbor = await row(clients, { name: "Harbor Dental" });
const northline = await row(clients, { name: "Northline Fitness" });
const pays = [await row(payments, { name: "September retainer", amount: 2400, client: [harbor] }), await row(payments, { name: "Website refresh deposit", amount: 1800, client: [harbor] }), await row(payments, { name: "October retainer", amount: 1500, client: [northline] })];
const body = { v: 1, blocks: [{ id: crypto.randomUUID(), type: "database", text: [], props: { source: { kind: "table", tableId: payments }, inline: true, title: "Payments", linked: true, views: [{ id: "view-payments", name: "Payments made", layout: "grid", filters: { client: THIS_ROW } }] }, children: [] }] };
const dec = await db.schema("custom").rpc("row_template_declare", { p_organization_id: orgId, p_table_id: clients, p_spec: { name: "Client page", body, default: true } });
if (dec.error) throw new Error(dec.error.message);
const ensured = await ensureRowPage(db, { organizationId: orgId, tableId: clients, recordId: harbor, title: "Harbor Dental", notes: "" });

const share = async (id: string) => { const r = await db.schema("custom").rpc("share_grant", { p_organization_id: orgId, p_subject_id: id, p_principal_kind: "user", p_principal_id: user.id, p_level: "viewer" }); if (r.error) throw new Error("share: " + r.error.message); };
await share(refRows[0]);
await share(harbor);
await share(pays[0]);
console.log(JSON.stringify({ outsider: user.id, email: user.email, referrals, refRows, clients, payments, harbor, northline, pays, page: ensured.spaceId }));
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : JSON.stringify(e)); process.exit(1); });
