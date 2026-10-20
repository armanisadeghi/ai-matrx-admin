// WITHHELD-HONEST live proof (exit 1 on any failure). TABLE=<disposable table id>. Admin makes Qty restricted, then as test@test.com:
//  1. a Rule filter on Qty is REFUSED by name through the store (REST v1 + the tables tool answer 403 with the store's sentence),
//  3. a view saved with {system: true} is in no view list, and an ordinary one is. Views made here are archived through the view archive door.
// The sort refusal (REST) needs the server release carrying aidream 'refuse_ignored_sort'; SERVER=http://127.0.0.1:<port> proves it before that.
import { admin, member, say, must } from "./at-fix-j-lib.mjs";
const SERVER = process.env.SERVER ?? "https://server.app.matrx.com".replace("matrx.com", "matrxserver.com");
const ORG = process.env.WALK_ORG_ID ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const id = process.env.TABLE;
const a = await admin(); const m = await member();
let failed = 0; const check = (ok, what, extra = "") => { say(ok ? "PASS" : "FAIL", what, extra); if (!ok) failed++; };
const qty = must(await a.client.fields({ table_id: id }), "fields").find((f) => f.key === "qty");
must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "restricted" } }), "restrict");
await new Promise((r) => setTimeout(r, 2500));
const token = (await m.sb.auth.getSession()).data.session.access_token;
const call = async (path, init) => { const r = await fetch(SERVER + path, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream", ...(init?.headers ?? {}) } }); const t = await r.text(); try { return { status: r.status, body: JSON.parse(t) }; } catch { return { status: r.status, body: t }; } };
// 1. filter
const where = encodeURIComponent(JSON.stringify({ Qty: { gte: 9 } }));
const rest = await call(`/v1/tables/${id}/rows?where=${where}`);
check(rest.status === 403 && /cannot read the Qty column/.test(rest.body?.message ?? ""), "REST where on a withheld column is refused by name", `${rest.status} ${rest.body?.message ?? ""}`);
check(!/Bravo|"9"|: 9/.test(JSON.stringify(rest.body)), "the refusal names no hidden value");
const tool = await call("/matrx-mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "tables", arguments: { action: "list_rows", table: id, where: { Qty: { gte: 9 } }, organization_id: ORG } } }) });
const text = typeof tool.body === "string" ? tool.body : JSON.stringify(tool.body);
check(/cannot read the Qty column/.test(text) && /"ok\\?":\s*false|\\"ok\\": false/.test(text.replace(/\\"/g, '"').replace(/"ok": false/, '"ok":false') ) || /cannot read the Qty column/.test(text), "the tables tool refuses the same way");
// 2. sort (REST): refused once the server carries refuse_ignored_sort
const sorted = await call(`/v1/tables/${id}/rows?sort=-Qty`);
check(sorted.status === 403 && /cannot be sorted/.test(sorted.body?.message ?? ""), "REST sort by a withheld column is refused by name", `${sorted.status} ${sorted.body?.message ?? ""}`);
// 3. system view
const made = [];
try {
  const sys = must(await a.client.viewDeclare({ table_id: id, spec: { name: "WH digest view", filters: {}, definition: { system: true } } }), "system view"); made.push(sys);
  const plain = must(await a.client.viewDeclare({ table_id: id, spec: { name: "WH plain view", filters: {} } }), "plain view"); made.push(plain);
  const listed = must(await m.client.views({ table_id: id }), "views as member").map((v) => v.view_id ?? v.id);
  const adminListed = must(await a.client.views({ table_id: id }), "views as admin").map((v) => v.view_id ?? v.id);
  check(!listed.includes(sys) && !adminListed.includes(sys), "a system-owned view is in nobody's view list");
  check(adminListed.includes(plain), "an ordinary view is still listed");
} finally {
  for (const v of made) { const r = await a.client.viewArchive({ view_id: v }); say("archived view", v, r.ok ? "ok" : JSON.stringify(r.error).slice(0, 120)); }
  await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: qty.sensitivity ?? "normal" } });
}
console.log(failed ? `FAILED ${failed}` : "ALL PASS"); process.exit(failed ? 1 : 0);
