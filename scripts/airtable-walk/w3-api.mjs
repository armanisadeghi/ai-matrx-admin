import { store } from "./store.mjs"; import { T, env } from "./lib.mjs";
const { sb, client } = await store();
const { data: { session } } = await sb.auth.getSession();
const base = process.env.API ?? "https://server.app.matrxserver.com";
const H = { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", "X-Organization-Id": "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f" };
const call = async (m, p, body) => { const r = await fetch(base + p, { method: m, headers: H, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); return [r.status, t.slice(0, 260)]; };
console.log("list", ...(await call("GET", `/api/v1/tables/${T.events}/rows?limit=2`)));
const c = await call("POST", `/api/v1/tables/${T.events}/rows`, { values: { Event: "API walk row", Guests: 5, Status: "Inquiry" } });
console.log("create", ...c);
let id; try { id = JSON.parse(c[1].length ? await fetch(base + `/api/v1/tables/${T.events}/rows?limit=50`, { headers: H }).then((r) => r.text()) : "{}").rows?.find((r) => r.values.Event === "API walk row")?.id; } catch {}
console.log("found id", id);
if (id) {
  console.log("get", ...(await call("GET", `/api/v1/tables/${T.events}/rows/${id}`)));
  console.log("update", ...(await call("PATCH", `/api/v1/tables/${T.events}/rows/${id}`, { values: { Guests: 6 } })));
  console.log("delete", ...(await call("DELETE", `/api/v1/tables/${T.events}/rows/${id}`)));
}
console.log("tables", ...(await call("GET", `/api/v1/tables?limit=2`)));
console.log("comments", ...(await call("GET", `/api/v1/tables/${T.events}/comments`)));
const w = await client.tableWebhookDeclare({ table_id: T.events, target_url: "http://insecure.example/hook" });
console.log("webhook http refused:", w.ok ? "ACCEPTED?!" : w.error.message);
const w2 = await client.tableWebhookDeclare({ table_id: T.events, target_url: "https://server.app.matrxserver.com/at-walk3-sink", description: "walk3" });
console.log("webhook https:", w2.ok ? Object.keys(w2.data).join(",") + " secretShown=" + !!(w2.data.secret) : w2.error.message);
const l = await client.tableWebhooks({ table_id: T.events }); console.log("listed", l.ok && l.data.length, l.ok && JSON.stringify(l.data[0]).slice(0, 200), l.ok && "secret" in (l.data[0] ?? {}));
if (w2.ok) console.log("archive", JSON.stringify(await client.tableWebhookArchive({ webhook_id: w2.data.webhook_id ?? w2.data.id })));
