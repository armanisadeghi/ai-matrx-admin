// AT-VIEWS seed: admin@admin.com's disposable "Clinic Locations" (8 real addresses, Latitude/Longitude empty so the
// Map looks them up and saves them) and "Team Directory" (a 12-person reporting tree through a self-link). Archive after.
import { declareTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";

const { client, organizationId } = await store();
const must = (r, what) => { if (!r.ok) throw new Error(what + ": " + JSON.stringify(r.error)); return r.data; };

const all = process.env.RESUME ? must(await client.tableList(), "tables") : [];
const have = (name) => all.find((t) => t.name === name)?.id;
const clinics = (process.env.RESUME && have("Clinic Locations")) || must(await declareTable(client, {
  name: "Clinic Locations", labelSingular: "Clinic", labelPlural: "Clinics",
  fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "address", label: "Address", type: "text", sort: 20 },
    { key: "phone", label: "Phone", type: "text", sort: 30 },
    { key: "latitude", label: "Latitude", type: "number", sort: 40 },
    { key: "longitude", label: "Longitude", type: "number", sort: 50 },
  ],
}), "clinics");
const sites = [
  ["Irvine Spectrum", "71 Fortune Dr, Irvine, CA 92618"],
  ["Newport Beach", "1 Civic Center Dr, Newport Beach, CA 92660"],
  ["Santa Ana", "20 Civic Center Plaza, Santa Ana, CA 92701"],
  ["Anaheim", "200 S Anaheim Blvd, Anaheim, CA 92805"],
  ["Long Beach", "411 W Ocean Blvd, Long Beach, CA 90802"],
  ["Pasadena", "100 N Garfield Ave, Pasadena, CA 91101"],
  ["San Diego", "202 C St, San Diego, CA 92101"],
  ["Los Angeles", "200 N Spring St, Los Angeles, CA 90012"],
];
if (!process.env.RESUME) for (const [name, address] of sites) must(await client.recordWrite({ table_id: clinics, data: { name, address, phone: "(949) 555-01" + String(Math.floor(Math.random() * 90) + 10) } }), "clinic row");
if (!process.env.RESUME) must(await client.recordWrite({ table_id: clinics, data: { name: "Mobile unit (no address yet)", address: "" } }), "clinic row blank");

const team = (process.env.RESUME && have("Team Directory")) || must(await declareTable(client, {
  name: "Team Directory", labelSingular: "Person", labelPlural: "People",
  fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "title", label: "Title", type: "text", sort: 20 },
    { key: "department", label: "Department", type: "select", sort: 30, options: ["Executive", "Engineering", "Operations", "Clinical"] },
  ],
}), "team");
must(await client.fieldDeclare({ table_id: team, spec: { label: "Reports to", type: "relation", relation_target: team, sort: 40 } }), "reports to");
const people = [
  ["Maya Okafor", "Chief Executive", "Executive", null],
  ["Dev Raman", "VP Engineering", "Engineering", 0],
  ["Lena Fischer", "VP Operations", "Operations", 0],
  ["Tomas Alves", "Medical Director", "Clinical", 0],
  ["Priya Nair", "Engineering Manager", "Engineering", 1],
  ["Sam Whitfield", "Staff Engineer", "Engineering", 4],
  ["Jo Park", "Software Engineer", "Engineering", 4],
  ["Ines Duarte", "Software Engineer", "Engineering", 4],
  ["Grace Liu", "Clinic Operations Lead", "Operations", 2],
  ["Omar Haddad", "Scheduling Coordinator", "Operations", 8],
  ["Rhea Kapoor", "Lead Physical Therapist", "Clinical", 3],
  ["Ben Carter", "Physical Therapist", "Clinical", 10],
];
const ids = [];
for (const [name, title, department, boss] of people) ids.push(must(await client.recordWrite({ table_id: team, data: { name, title, department, ...(boss === null ? {} : { reports_to: ids[boss] }) } }), "person"));
console.log(JSON.stringify({ organizationId, clinics, team, personIds: ids }));
