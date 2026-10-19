// AT-WALK-F area 8: a saved calendar view with a date field on ATWF main, mint a private calendar link, fetch the .ics. argv[2]=table id
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client, sb, organizationId } = await store();
const T = process.argv[2];
const v = await client.viewDeclare({ table_id: T, spec: { name: "ATWF due calendar", definition: { table_id: T, layout: "calendar", date_field: "due", sorts: [] } } });
console.log("view", JSON.stringify(v).slice(0, 300));
const viewId = typeof v.data === "string" ? v.data : (v.data?.view_id ?? v.data?.id);
const mk = await sb.schema("users").rpc("calendar_feed_create", { p_organization_id: organizationId, p_table_id: T, p_view_id: viewId, p_title: "ATWF due dates", p_time_zone: "America/Los_Angeles" });
console.log("feed", JSON.stringify(mk.error ?? mk.data).slice(0, 300));
const tok = mk.data?.token; if (!tok) process.exit(1);
const url = `${process.env.ORIGIN ?? "http://s96c6068c.localhost:3001"}/api/calendar-feed/${tok}.ics`;
const r = await fetch(url); console.log("GET", r.status, r.headers.get("content-type")); console.log(await r.text());
console.log("FEEDID", mk.data?.id);
