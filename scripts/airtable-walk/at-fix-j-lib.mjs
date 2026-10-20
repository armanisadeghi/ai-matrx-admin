// AT-FIX-J shared: admin and member (test@test.com) record clients over the same organization, plus a disposable table.
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, declareTable, supabaseDataSource } from "@ai-matrx/records/core";
import { env } from "./lib.mjs";
export const ORG = process.env.WALK_ORG_ID ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
export const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))));
export const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
async function as(email, password) {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: auth, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { sb, email, userId: auth.user.id, client: createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: ORG, actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } }) };
}
export const admin = () => as(env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD);
export const member = () => as(env.AI_MEMBER_USERNAME, env.AI_MEMBER_PASSWORD);
export async function seedTable(client, suffix = Math.random().toString(36).slice(2, 6)) {
  const id = must(await declareTable(client, {
    name: `ATFJ main ${suffix}`, labelSingular: "Row", labelPlural: "Rows",
    fields: [
      { key: "name", label: "Name", type: "text", sort: 10 },
      { key: "qty", label: "Qty", type: "number", sort: 20 },
      { key: "tags", label: "Tags", type: "multi_select", sort: 30, options: ["Alpha", "Beta", "Gamma"] },
      { key: "joined", label: "Joined", type: "datetime", kind: "datetime", sort: 40 },
      { key: "start", label: "Start", type: "datetime", kind: "date", sort: 50 },
    ],
  }), "declare");
  const rows = [["Alpha", 3, ["Gamma"]], ["Bravo", 9, ["Alpha", "Beta"]], ["Charlie", 5, ["Beta"]]];
  try {
    for (const [name, qty, tags] of rows) must(await client.recordWrite({ table_id: id, data: { name, qty, tags, joined: "2026-11-03T00:30:00Z", start: "2026-11-02" } }), "row");
  } catch (e) {
    await client.tableArchive({ table_id: id }); // never leave a half-seeded table behind
    throw e;
  }
  return id;
}
