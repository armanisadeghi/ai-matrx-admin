// ACCEPT-FIX-3: "Pier Street Rentals" (4 rows) + shares to test@test.com. Usage: node pier-seed.mjs [row|table|revoke <tableId> <rowId>]
import { createClient } from "@supabase/supabase-js";
import { store } from "./store.mjs";
import { env } from "./lib.mjs";
import { declareTable } from "@ai-matrx/records/core";
const ORG = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { sb, client } = await store();
const m = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: a } = await m.auth.signInWithPassword({ email: "test@test.com", password: env.AI_MEMBER_PASSWORD });
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const mode = process.argv[2] ?? "row";
const grant = (subject, level) => sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: subject, p_principal_kind: "person", p_principal_id: a.user.id, p_level: level });
if (mode === "revoke") {
  for (const s of process.argv.slice(3)) console.log("revoke", s, JSON.stringify((await sb.schema("custom").rpc("share_revoke", { p_organization_id: ORG, p_subject_id: s, p_principal_kind: "person", p_principal_id: a.user.id })).error));
  process.exit(0);
}
if (mode === "grant") { console.log(JSON.stringify((await grant(process.argv[3], "viewer")).error ?? "ok")); process.exit(0); }
const t = must(await declareTable(client, { name: "Pier Street Rentals", labelSingular: "Rental", labelPlural: "Rentals",
  fields: [{ key: "unit", label: "Unit", type: "text", sort: 10 }, { key: "tenant", label: "Tenant", type: "text", sort: 20 }, { key: "rent", label: "Rent", type: "number", sort: 30 }, { key: "notes", label: "Notes", type: "long_text", sort: 40 }] }), "table");
const ids = [];
for (const [unit, tenant, rent] of [["1A", "Rivera", 1800], ["1B", "Chen", 1750], ["2A", "Okafor", 2100], ["2B", "Novak", 2050]]) ids.push(must(await client.recordWrite({ table_id: t, data: { unit, tenant, rent, notes: "Lease renews in June" } }), "row"));
console.log("TABLE", t, "ROWS", JSON.stringify(ids));
const target = mode === "table" ? t : (ids[0].record_id ?? ids[0].id ?? ids[0]);
console.log("grant", target, JSON.stringify((await grant(target, "viewer")).error ?? "ok"));
