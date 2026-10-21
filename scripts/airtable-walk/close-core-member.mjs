// CLOSE-CORE member proofs on the live store, as test@test.com (a member of admin's Workspace, owner of their own):
//   CD-CORE-01 the store is on: the member makes a table in admin's Workspace with no switch.
//   CD-CORE-20 the member makes a personal table in their own organization; in admin's Workspace (Edit) the member
//              cannot add a field to admin's table.
//   CD-CORE-22 a system example table opens for the member and an edit is refused with a sentence.
// Every table made here is archived. Run: node scripts/airtable-walk/close-core-member.mjs
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, declareTable, supabaseDataSource } from "@ai-matrx/records/core";
import { env } from "./lib.mjs";
import { admin, say } from "./at-fix-j-lib.mjs";
const WORKSPACE = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f"; // admin's Workspace (member is a member)
const OWN = "8cb71c8b-5b49-4563-a5fe-d77ff600f8ee"; // test@test.com's own organization
const SYSTEM = "39c38960-d30c-4840-b0c1-c9960de95582";
const EXAMPLE = "437ad3e2-0b61-4cc2-938c-db22fc5c5220"; // "Example: Product Catalog", system organization
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth, error } = await sb.auth.signInWithPassword({ email: env.AI_MEMBER_USERNAME, password: env.AI_MEMBER_PASSWORD });
if (error) throw error;
const at = (org) => createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: org, actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } });
const tries = async (fn) => { let r; for (let i = 0; i < 5; i++) { r = await fn(); if (r.ok || !["timed_out", "unreachable"].includes(r.error?.code)) return r; await new Promise((res) => setTimeout(res, 4000)); } return r; };
const word = (r) => (r.ok ? "ok" : `refused: ${r.error.message}`);
const made = []; // [client, table]
const A = (await admin()).client;
try {
  const inWorkspace = at(WORKSPACE), own = at(OWN), sys = at(SYSTEM);
  // CD-CORE-01
  const t1 = await tries(() => declareTable(inWorkspace, { name: `CC member table ${Date.now().toString(36).slice(-4)}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }));
  say("CD-CORE-01 member makes a table in admin's Workspace:", word(t1));
  if (t1.ok) { made.push([inWorkspace, t1.data]); const row = await tries(() => inWorkspace.recordWrite({ table_id: t1.data, data: { name: "First row" } })); say("  and a row in it:", word(row)); }
  // CD-CORE-20 personal table
  const t2 = await tries(() => declareTable(own, { name: `CC my own list ${Date.now().toString(36).slice(-4)}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }));
  say("CD-CORE-20 member makes a personal table in their own organization:", word(t2));
  if (t2.ok) made.push([own, t2.data]);
  // CD-CORE-20 no add-field on admin's table at Edit
  const adminTable = await tries(() => declareTable(A, { name: `CC admin table ${Date.now().toString(36).slice(-4)}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }));
  if (adminTable.ok) {
    made.push([A, adminTable.data]);
    const f = await tries(() => inWorkspace.fieldDeclare({ table_id: adminTable.data, spec: { key: "my_extra", label: "My extra", type: "text" } }));
    say("  member adds a field to admin's table:", word(f));
    // At Edit (a share at editor), still no adding a field: per-user fields never go on an organization's table.
    const { sb: asb } = await import("./store.mjs").then((m) => m.store());
    const g = await asb.schema("custom").rpc("share_grant", { p_organization_id: WORKSPACE, p_subject_id: adminTable.data, p_principal_kind: "user", p_principal_id: auth.user.id, p_level: "editor" });
    say("  admin shares the table with the member at Edit:", g.error ? g.error.message : "ok");
    const f2 = await tries(() => inWorkspace.fieldDeclare({ table_id: adminTable.data, spec: { key: "my_extra", label: "My extra", type: "text" } }));
    say("  member at Edit adds a field:", word(f2));
    const w2 = await tries(() => inWorkspace.recordWrite({ table_id: adminTable.data, data: { name: "Member row" } }));
    say("  member at Edit adds a row (content is theirs to add):", word(w2));
  }
  // CD-CORE-22 system example table
  const rows = await tries(() => sys.listPage({ table_id: EXAMPLE, limit: 3 }));
  const first = rows.ok ? (rows.data.rows ?? rows.data)[0] : null;
  say("CD-CORE-22 member opens a system example table:", rows.ok ? `${(rows.data.rows ?? rows.data).length} rows, first: ${JSON.stringify(first?.document ?? {}).slice(0, 80)}` : rows.error.message);
  if (first) {
    const key = Object.keys(first.document ?? {}).find((k) => !k.startsWith("_"));
    const w = await tries(() => sys.recordUpdate({ record_id: first.id, patch: { [key]: "edited by a member" } }));
    say("  member edits a cell:", word(w));
  }
} finally {
  for (const [cl, t] of made) { const r = await tries(() => cl.tableArchive({ table_id: t, chunk: 5, includeTable: true })); say("archived", t, word(r)); }
}
