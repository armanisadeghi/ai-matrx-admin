// LANE AT-PROVE: Florist Customers + Florist Orders (8 rows), views A and B. Archive after.
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, declareTable, supabaseDataSource } from "@ai-matrx/records/core";
import { env } from "./lib.mjs";
const ORG = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth, error } = await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
if (error) throw error;
const client = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: ORG, actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } });
const must = (r, what) => { if (!r.ok) throw new Error(what + ": " + JSON.stringify(r.error)); return r.data; };
const customers = must(await declareTable(client, { name: "Florist Customers", labelSingular: "Customer", labelPlural: "Customers", fields: [
  { key: "name", label: "Name", type: "text", sort: 10 }, { key: "email", label: "Email", type: "email", sort: 20 }, { key: "tier", label: "Tier", type: "select", options: ["Retail", "Wedding", "Corporate"], sort: 30 } ] }), "customers");
const cnames = [["Rose & Co Events", "hello@roseco.example", "Wedding"], ["Maple Street Cafe", "orders@maple.example", "Corporate"], ["Ana Delgado", "ana@example.com", "Retail"], ["Bayview Hotel", "front@bayview.example", "Corporate"]];
const cids = [];
for (const [name, email, tier] of cnames) cids.push(must(await client.recordWrite({ table_id: customers, data: { name, email, tier } }), "cust row"));
const orders = must(await declareTable(client, { name: "Florist Orders", labelSingular: "Order", labelPlural: "Orders", fields: [
  { key: "order_no", label: "Order number", type: "text", sort: 10 },
  { key: "customer", label: "Customer", type: "relation", relationTarget: customers, sort: 20 },
  { key: "delivery", label: "Delivery date", type: "datetime", kind: "date", sort: 30 },
  { key: "total", label: "Total", type: "currency", unit: "$", sort: 40 },
  { key: "status", label: "Status", type: "select", options: ["New", "Arranging", "Delivered"], sort: 50 },
  { key: "occasion", label: "Occasion", type: "text", sort: 60 },
  { key: "photos", label: "Photos", type: "attachment", multi: true, sort: 70 },
  { key: "notes", label: "Notes", type: "long_text", sort: 80 } ] }), "orders");
const rows = [["FO-1001",0,"2026-11-02",420,"New","Wedding"],["FO-1002",1,"2026-11-03",95.5,"Arranging","Weekly"],["FO-1003",2,"2026-11-05",60,"Delivered","Birthday"],["FO-1004",3,"2026-11-06",310,"New","Lobby"],["FO-1005",0,"2026-11-09",1250.5,"Arranging","Wedding"],["FO-1006",1,"2026-11-10",95.5,"New","Weekly"],["FO-1007",2,"2026-11-12",45,"Delivered","Sympathy"],["FO-1008",3,"2026-11-14",310,"Arranging","Lobby"]];
const oids = [];
for (const [order_no,c,delivery,total,status,occasion] of rows) oids.push(must(await client.recordWrite({ table_id: orders, data: { order_no, customer: cids[c], delivery, total, status, occasion, notes: "Handle with care" } }), "order row"));
const viewA = must(await client.viewDeclare({ table_id: orders, spec: { name: "View A", definition: { layout: "grid" } } }), "viewA");
const viewB = must(await client.viewDeclare({ table_id: orders, spec: { name: "View B", filters: { status: "Arranging" }, definition: { layout: "grid", sorts: [{ field: "total", dir: "desc" }], group_field: "occasion", presentation: { hiddenFields: ["notes"], rowHeight: 64 } } } }), "viewB");
console.log(JSON.stringify({ customers, orders, viewA, viewB, cids, oids }));
