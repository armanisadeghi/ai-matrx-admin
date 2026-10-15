// AT-DBFIX 3 live: Venue Bookings via the store, then REST PATCH / upsert / comments as admin.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRecordsClient, declareTable, supabaseDataSource } from "@ai-matrx/records/core";
import { store } from "/Users/armanisadeghi/code/matrx-frontend/scripts/airtable-walk/store.mjs";
const STATE = new URL("./state.json", import.meta.url);
const st = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const { sb, client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
if (!st.bookings) {
  const partners = must(await declareTable(client, { name: "Venue Partners", labelSingular: "Partner", labelPlural: "Partners",
    fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "service", label: "Service", type: "text", sort: 20 }] }), "partners");
  const bookings = must(await declareTable(client, { name: "Venue Bookings", labelSingular: "Booking", labelPlural: "Bookings",
    fields: [{ key: "event", label: "Event", type: "text", sort: 10 }, { key: "partner", label: "Partner", type: "relation", relationTarget: partners, sort: 20 },
      { key: "guests", label: "Guests", type: "number", sort: 30 }, { key: "status", label: "Status", type: "select", sort: 40, options: ["Inquiry", "Booked", "Paid"] }] }), "bookings");
  st.partners = partners; st.bookings = bookings; writeFileSync(STATE, JSON.stringify(st));
}
const { data: { session } } = await sb.auth.getSession();
const base = process.env.API ?? "https://server.app.matrxserver.com";
const H = { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", "X-Organization-Id": "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f" };
const call = async (m, p, body) => { const r = await fetch(base + p, { method: m, headers: H, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return [r.status, j]; };
const B = `/api/v1/tables/${st.bookings}`;
const show = (n, [s, j]) => console.log(n, s, JSON.stringify(j).slice(0, 330));
const c = await call("POST", `${B}/rows`, { values: { Event: "Chen wedding", Guests: 80, Status: "Booked" } });
show("create", c); const id = c[1].row?.id ?? c[1].id; console.log("id", id);
show("PATCH values", await call("PATCH", `${B}/rows/${id}`, { values: { Guests: 84 } }));
show("PATCH stale", await call("PATCH", `${B}/rows/${id}`, { values: { Guests: 90 }, expected_version: 1 }));
show("get", await call("GET", `${B}/rows/${id}`));
show("upsert", await call("POST", `${B}/rows/upsert`, { key_column: "Event", rows: [{ Event: "Chen wedding", Guests: 86 }, { Event: "Orbit Labs offsite", Guests: 40, Status: "Inquiry" }] }));
show("upsert again", await call("POST", `${B}/rows/upsert`, { key_column: "Event", rows: [{ Event: "Chen wedding", Guests: 86 }] }));
if (process.env.COMMENTS) {
  show("comment add", await call("POST", `${B}/rows/${id}/comments`, { body: "Deposit received 10/14" }));
  show("comment list", await call("GET", `${B}/rows/${id}/comments`));
}
console.log("openapi has comments path:", JSON.stringify((await call("GET", "/api/openapi.json"))[1]).includes("/rows/{row_id}/comments"));
