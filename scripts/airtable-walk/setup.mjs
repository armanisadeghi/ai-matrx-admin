// scripts/at-walk2-setup.mjs — LANE AT-WALK-2: admin@admin.com's disposable "Catering Clients" + "Catering Events"
// (every field type the declare door takes incl. attachment, relation, checkbox, currency, datetime). Archive after.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, declareTable, supabaseDataSource } from "@ai-matrx/records/core";

const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")]));
const ORG = process.env.ORG ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth, error } = await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
if (error) throw error;
const client = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: ORG, actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } });
const must = (r, what) => { if (!r.ok) throw new Error(what + ": " + JSON.stringify(r.error)); return r.data; };

const clients = must(await declareTable(client, {
  name: "Catering Clients", labelSingular: "Client", labelPlural: "Clients",
  fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "email", label: "Email", type: "email", sort: 20 },
    { key: "tier", label: "Tier", type: "select", sort: 30, options: ["Gold", "Silver", "Bronze"] },
    { key: "vip", label: "VIP", type: "checkbox", sort: 40 },
    { key: "since", label: "Client since", type: "datetime", kind: "date", sort: 50 },
    { key: "notes", label: "Notes", type: "long_text", sort: 60 },
    { key: "logo", label: "Logo", type: "attachment", multi: true, sort: 70 },
  ],
}), "clients");
const people = [
  ["Harbor Law Group", "events@harborlaw.example", "Gold", true, "2024-03-12", "Prefers vegetarian"],
  ["Pinecrest Realty", "office@pinecrest.example", "Silver", false, "2025-01-20", "Net-30 invoices"],
  ["Lakeside Montessori", "admin@lakeside.example", "Bronze", false, "2025-08-02", "Allergy-aware menus"],
  ["Northwind Dental", "hello@northwind.example", "Gold", true, "2023-11-05", "Quarterly lunches"],
  ["Orchard Hills Church", "office@orchard.example", "Silver", false, "2024-09-14", "Large groups"],
];
const ids = [];
for (const [name, email, tier, vip, since, notes] of people) ids.push(must(await client.recordWrite({ table_id: clients, data: { name, email, tier, vip, since, notes } }), "client row"));

const events = must(await declareTable(client, {
  name: "Catering Events", labelSingular: "Event", labelPlural: "Events",
  fields: [
    { key: "event", label: "Event", type: "text", sort: 10 },
    { key: "client", label: "Client", type: "relation", relationTarget: clients, sort: 20 },
    { key: "date", label: "Date", type: "datetime", kind: "date", sort: 30 },
    { key: "guests", label: "Guests", type: "number", sort: 40 },
    { key: "price", label: "Price", type: "currency", unit: "$", sort: 50 },
    { key: "status", label: "Status", type: "select", sort: 60, options: ["Inquiry", "Booked", "Served", "Paid"] },
    { key: "menu", label: "Menu", type: "long_text", sort: 70 },
    { key: "brochure", label: "Brochure", type: "attachment", multi: true, sort: 80 },
  ],
}), "events");
const evs = [
  ["Annual partners lunch", 0, "2026-11-04", 60, 2400, "Booked"],
  ["Open house buffet", 1, "2026-11-12", 120, 4100, "Inquiry"],
  ["Spring fundraiser", 4, "2026-11-20", 200, 7800, "Booked"],
  ["Staff appreciation", 3, "2026-10-30", 25, 650, "Served"],
  ["Parents night", 2, "2026-12-01", 80, 1900, "Inquiry"],
  ["Closing dinner", 0, "2026-10-22", 40, 3200, "Paid"],
  ["Quarterly lunch Q4", 3, "2026-12-10", 30, 780, "Booked"],
  ["Holiday gala", 4, "2026-12-18", 150, 9500, "Booked"],
];
for (const [event, c, date, guests, price, status] of evs) must(await client.recordWrite({ table_id: events, data: { event, client: ids[c], date, guests, price, status, menu: "Seasonal buffet" } }), "event row");
const view = must(await client.viewDeclare({ table_id: events, spec: { name: "All events", definition: { layout: "grid", sorts: [], is_default: false } } }), "view");
console.log(JSON.stringify({ clients, events, view, clientIds: ids }));
