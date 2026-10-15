// RECORD-FIXES seed: admin's disposable "Clinic Referrals" (person + stamps + file), one row shared to test@test.com.
import { createClient } from "@supabase/supabase-js";
import { store } from "./store.mjs";
import { env } from "./lib.mjs";
import { declareTable } from "@ai-matrx/records/core";
const ORG = process.env.ORG ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const level = process.argv[2] ?? "viewer";
const { sb, client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const t = must(await declareTable(client, {
  name: "Clinic Referrals", labelSingular: "Referral", labelPlural: "Referrals",
  fields: [
    { key: "patient", label: "Patient", type: "text", sort: 10 },
    { key: "referred_by", label: "Referred by", type: "member", sort: 20 },
    { key: "made_by", label: "Created by", type: "created_by", sort: 30 },
    { key: "edited_by", label: "Last edited by", type: "modified_by", sort: 40 },
    { key: "scan", label: "Scan", type: "attachment", multi: true, sort: 50 },
  ],
}), "table");
const rows = [];
for (const patient of ["Maya Ortiz", "Dev Patel", "Lena Fischer"]) rows.push(must(await client.recordWrite({ table_id: t, data: { patient } }), "row"));
const m = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: a } = await m.auth.signInWithPassword({ email: "test@test.com", password: env.AI_MEMBER_PASSWORD });
const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: rows[0], p_principal_kind: "user", p_principal_id: a.user.id, p_level: level });
console.log(JSON.stringify({ table: t, rows, share: g.error ?? "ok", memberUser: a.user.id }));
