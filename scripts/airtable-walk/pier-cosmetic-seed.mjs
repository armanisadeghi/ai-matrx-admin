// ACCEPT-FIX-3: long text with leading blank + a "Similar" list of objects (structured table), for the record page.
import { store } from "./store.mjs";
import { declareTable } from "@ai-matrx/records/core";
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const t = must(await declareTable(client, { name: "Pier Street Cosmetics C", labelSingular: "Company", labelPlural: "Companies",
  fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "about", label: "Unformatted About", type: "long_text", sort: 20 }, { key: "similar", label: "Similar", type: "text", sort: 30 }] }), "table");
const similar = [1, 2, 3, 4].map((i) => ({ title: `Recycling Partner Number ${i} International`, subtitle: "Environmental services, recycling and reuse of electronics", link: `https://www.linkedin.com/company/recycling-partner-number-${i}-international-holdings`, location: "Seattle, Washington", industry: "Environmental Services", followers: 1200 * i }));
const row = must(await client.recordWrite({ table_id: t, data: { name: "Pier Recyclers", about: "\n\n            We recycle electronics for local businesses.\n\nSecond paragraph keeps its breaks.", similar: JSON.stringify(similar) } }), "row");
console.log("TABLE", t, "ROW", JSON.stringify(row));
