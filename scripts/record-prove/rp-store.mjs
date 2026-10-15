// RECORD-PROVE: what the outsider's own session reads from the store. node rp-store.mjs '<json>'
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, supabaseDataSource } from "@ai-matrx/records/core";
import { fixtureSessionCookies, testTarget } from "../lib/persona.mjs";
const s = JSON.parse(process.argv[2]);
const ORG = process.env.ORG ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const ck = await fixtureSessionCookies(testTarget(), { id: s.outsider, email: s.email }, { host: "x" });
const session = JSON.parse(Buffer.from(ck.map((c) => c.value).join("").replace(/^base64-/, ""), "base64url").toString());
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${session.access_token}` } } });
const c = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: process.env.ORG_ARG ?? ORG, actor: { actor: "user", user_id: s.outsider, on_behalf_of: null } });
const show = (n, r) => console.log(n.padEnd(22), r.ok ? "OK " + JSON.stringify(r.data).slice(0, 110) : "REFUSED " + JSON.stringify(r.error).slice(0, 160));
for (const [n, id] of [["opens(referrals)", s.referrals], ["opens(ref row)", s.refRows[0]], ["opens(clients)", s.clients], ["opens(harbor)", s.harbor]]) { const r = await sb.schema("custom").rpc("where_id_opens", { p_id: id }); console.log(n.padEnd(22), JSON.stringify(r.error ?? r.data)); }
show("tableRead(ref)", await c.tableRead({ table_id: s.referrals }));
show("recordRead(ref row)", await c.recordRead({ record_id: s.refRows[0] }));
show("recordRead(other)", await c.recordRead({ record_id: s.refRows[1] }));
show("list(ref)", await c.list({ table_id: s.referrals, limit: 10 }));
show("tableRead(clients)", await c.tableRead({ table_id: s.clients }));
show("recordRead(harbor)", await c.recordRead({ record_id: s.harbor }));
show("list(payments,harbor)", await c.list({ table_id: s.payments, filter: { client: s.harbor }, limit: 10 }));
const o = await sb.schema("iam").from("organization_members").select("organization_id").eq("user_id", s.outsider); console.log("orgs", JSON.stringify(o.error ?? o.data));
