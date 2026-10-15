import { store } from "./store.mjs";
import { declareTable } from "@ai-matrx/records/core";
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const t = must(await declareTable(client, {
  name: "Bakery Wholesale Accounts", labelSingular: "Account", labelPlural: "Accounts",
  fields: [
    { key: "account", label: "Account", type: "text", sort: 10 },
    { key: "contact", label: "Contact", type: "email", sort: 20 },
    { key: "status", label: "Status", type: "select", sort: 30, options: ["Active", "Paused", "Prospect"] },
    { key: "weekly_loaves", label: "Weekly loaves", type: "number", sort: 40, description: "Standing order, loaves per week" },
    { key: "notes", label: "Notes", type: "long_text", sort: 50 },
    { key: "photos", label: "Storefront photos", type: "attachment", multi: true, sort: 60 },
  ],
}), "table");
const rows = [["Corner Cafe", "ana@cornercafe.example", "Active", 120], ["Pier 9 Diner", "joe@pier9.example", "Active", 80], ["Green Leaf Grocer", "mia@greenleaf.example", "Paused", 200], ["Hotel Alder", "chef@alder.example", "Active", 300], ["Sunrise Deli", "sam@sunrise.example", "Prospect", 60], ["Market Hall", "lee@markethall.example", "Active", 150]];
for (const [account, contact, status, weekly_loaves] of rows) must(await client.recordWrite({ table_id: t, data: { account, contact, status, weekly_loaves, notes: "Delivers before 6am" } }), "row");
console.log("TABLE", t);
