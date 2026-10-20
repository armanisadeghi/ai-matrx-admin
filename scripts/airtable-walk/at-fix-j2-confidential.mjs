// AT-FIX-J2 item 5: a column set to "Administrators only" (sensitivity=restricted): can a MEMBER (test@test.com) get its values through
// the store's read, a filter/sort on it, a chart (aggregate), the REST v1 read and aggregate, or the AI Dream "tables" MCP tool?
// Usage: TABLE=<id> node at-fix-j2-confidential.mjs [restricted|internal]   (admin sets the word, then everything is read as the member)
import { admin, member, say, must } from "./at-fix-j-lib.mjs";
const SERVER = process.env.SERVER ?? "https://server.app.matrxserver.com";
const id = process.env.TABLE;
const word = process.argv[2] ?? "restricted";
const a = await admin(); const m = await member();
const qty = must(await a.client.fields({ table_id: id }), "fields").find((f) => f.key === "qty");
must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: word } }), "set sensitivity");
say("qty sensitivity set to", word);
await new Promise((r) => setTimeout(r, 2500));
const token = (await m.sb.auth.getSession()).data.session.access_token;
const results = {};
const note = (k, v) => { results[k] = v; say(k, v); };
// 1. the store's page read
const page = await m.client.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: {}, view_id: null });
note("store.listPage qty values", page.ok ? page.data.rows.map((r) => r.document?.qty ?? null) : page.error);
// 2. sort + filter on the hidden column (inference leak)
const sorted = await m.client.listPage({ table_id: id, limit: 10, offset: 0, sort: [{ field: "qty", direction: "desc" }], search: null, filter: {}, view_id: null });
note("store sort by qty desc (names order)", sorted.ok ? sorted.data.rows.map((r) => r.document?.name) : sorted.error);
const filt = await m.client.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: { qty: { gte: 9 } }, view_id: null });
note("store filter qty>=9 (names)", filt.ok ? filt.data.rows.map((r) => r.document?.name) : filt.error);
// 3. chart = aggregate
const sum = await m.client.recordAggregate({ table_id: id, measures: [{ op: "sum", key: "qty" }] });
note("chart: sum(qty)", sum.ok ? JSON.stringify(sum.data) : JSON.stringify(sum.error));
const grouped = await m.client.recordAggregate({ table_id: id, groupBy: ["qty"], measures: [{ op: "count" }] });
note("chart: count grouped by qty", grouped.ok ? JSON.stringify(grouped.data) : JSON.stringify(grouped.error));
const byName = await m.client.recordAggregate({ table_id: id, groupBy: ["name"], measures: [{ op: "count" }] });
note("chart: count grouped by name (a column she may read)", byName.ok ? JSON.stringify(byName.data).slice(0, 300) : JSON.stringify(byName.error));
// 4. REST v1
const get = async (path, init) => { const r = await fetch(SERVER + path, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) } }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t.slice(0, 300); } return { status: r.status, body: j }; };
const cols = await get(`/v1/tables/${id}/columns`);
note("REST columns", cols.status + " " + JSON.stringify(cols.body).slice(0, 400));
const rows = await get(`/v1/tables/${id}/rows?limit=10`);
note("REST rows", rows.status + " " + JSON.stringify(rows.body).slice(0, 700));
const rest = await get(`/v1/tables/${id}/rows?limit=10&sort=-Qty`);
note("REST rows sorted -Qty", rest.status + " " + JSON.stringify(rest.body?.rows?.map?.((r) => r.Name ?? r.name) ?? rest.body).slice(0, 300));
const restAgg = await get(`/v1/tables/${id}/aggregate`, { method: "POST", body: JSON.stringify({ measure: "sum", column: "Qty" }) });
note("REST aggregate sum(Qty)", restAgg.status + " " + JSON.stringify(restAgg.body).slice(0, 400));
// 5. MCP tables tool (stateless streamable HTTP, member's own sign-in)
const mcp = async (name, args) => {
  const r = await fetch(SERVER + "/matrx-mcp", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }) });
  const t = await r.text(); const line = t.split("\n").find((l) => l.startsWith("data:")); return r.status + " " + (line ? line.slice(5) : t).slice(0, 900);
};
note("MCP tables list_rows", await mcp("tables", { action: "list_rows", table: id, limit: 10, organization_id: process.env.WALK_ORG_ID ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f" }));
note("MCP tables get_row (Bravo-less: first row)", await mcp("tables", { action: "list_rows", table: id, limit: 1, sort: ["Name"], organization_id: process.env.WALK_ORG_ID ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f" }));
note("MCP tables aggregate sum Qty", await mcp("tables", { action: "aggregate", table: id, measure: "sum", column: "Qty", organization_id: process.env.WALK_ORG_ID ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f" }));
note("MCP tables list_rows where Qty>=9", await mcp("tables", { action: "list_rows", table: id, where: { Qty: { gte: 9 } }, organization_id: process.env.WALK_ORG_ID ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f" }));
console.log("RESULTS_JSON " + JSON.stringify(results).slice(0, 6000));
