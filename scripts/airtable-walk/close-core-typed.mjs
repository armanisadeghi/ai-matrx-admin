// CLOSE-CORE CD-CORE-23: a typed system table is declared in code (no SQL, no migration file), made on first use
// for the organization, and a row round-trips with the declaration's own types. Live store, admin@admin.com.
// The organization's copy is archived at the end (deliberately, through the typed-table door).
// Run: node scripts/airtable-walk/close-core-typed.mjs
import { archiveTypedTableDeliberately, defineTypedTable, ensureTypedTable, f, listAppRows, upsertAppRow, checkTypedTable } from "@ai-matrx/records/typed-table";
import { admin, say } from "./at-fix-j-lib.mjs";
const c = (await admin()).client;
const tag = Date.now().toString(36).slice(-5);
const visits = defineTypedTable({
  name: `CC site visits ${tag}`,
  slug: `cc_site_visits_${tag}`,
  scope: "organization",
  kept_for: "acceptance",
  owner: "lane:CLOSE-CORE",
  declared_in: "matrx-frontend:scripts/airtable-walk/close-core-typed.mjs",
  key: "visit_ref",
  fields: {
    visit_ref: f.text({ label: "Visit", unique: true, required: true }),
    site: f.text({ label: "Site" }),
    crew: f.number({ label: "Crew size" }),
    on: f.date({ label: "On" }),
  },
});
const tries = async (fn) => { let r; for (let i = 0; i < 5; i++) { r = await fn(); if (r.ok || !["timed_out", "unreachable"].includes(r.error?.code)) return r; await new Promise((res) => setTimeout(res, 4000)); } return r; };
const made = await tries(() => ensureTypedTable(c, visits));
say("ensure (first use makes the organization's copy):", made.ok ? made.data : made.error.message);
let tableId = made.ok ? (made.data.table ?? made.data.table_id ?? null) : null;
try {
  const id = await tries(() => upsertAppRow(c, visits, { visit_ref: "V-1042", site: "Cedar Ridge clinic", crew: 3, on: "2026-11-04" }));
  say("upsert:", id.ok ? id.data : id.error.message);
  const rows = await tries(() => listAppRows(c, visits));
  const row = rows.ok ? rows.data.rows.find((r) => r.visit_ref === "V-1042") : null;
  say("read back:", row ? { visit_ref: row.visit_ref, site: row.site, crew: row.crew, crew_is_number: typeof row.crew === "number", on: row.on } : rows.ok ? rows.data : rows.error.message);
  const chk = await tries(() => checkTypedTable(c, visits));
  say("check against the declaration:", chk.ok ? chk.data.status ?? chk.data : chk.error.message);
  if (!tableId && chk.ok) tableId = chk.data.table_id ?? null;
} finally {
  if (tableId) { const r = await tries(() => archiveTypedTableDeliberately(c, { tableId, typedSlug: visits.slug, reason: "CLOSE-CORE acceptance proof, disposable" })); say("archived", tableId, r.ok ? "ok" : r.error.message); }
}
