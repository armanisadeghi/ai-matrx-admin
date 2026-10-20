// AT-FIX-J item 2 probe: who a confidential column is hidden from. Creates a disposable table, marks Qty confidential,
// reads as admin and as the member, restores, archives.
import { admin, member, seedTable, say, must } from "./at-fix-j-lib.mjs";
const a = await admin(); const m = await member();
say("admin", a.email, "member", m.email);
const id = await seedTable(a.client); say("table", id);
try {
  const qty = (must(await a.client.fields({ table_id: id }), "fields")).find((f) => f.key === "qty");
  say("qty sensitivity default", qty.sensitivity);
  for (const sens of ["internal", "confidential", "restricted"]) {
    must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: sens } }), "set " + sens);
    for (const [who, c] of [["admin", a.client], ["member", m.client]]) {
      const fs = await c.fields({ table_id: id });
      const cols = fs.ok ? fs.data.map((f) => f.key) : JSON.stringify(fs.error).slice(0, 120);
      const page = await c.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: {}, view_id: null });
      const doc = page.ok ? page.data.rows[0]?.document : null;
      const lvl = await c.tableRights?.({ table_id: id }).catch?.(() => null);
      say(sens, who, "columns:", cols, "| first row keys:", doc ? Object.keys(doc).filter((k) => !k.startsWith("_")) : page.ok ? "none" : JSON.stringify(page.error).slice(0, 120), "| qty:", doc?.qty, "| hidden:", page.ok ? JSON.stringify(page.data.rows[0]?.hidden ?? null).slice(0, 160) : "");
    }
  }
} finally {
  try { await a.client.tableArchive({ table_id: id }).then((r) => say("archived", r.ok)); } catch (e) { say("archive failed", e.message); }
}
