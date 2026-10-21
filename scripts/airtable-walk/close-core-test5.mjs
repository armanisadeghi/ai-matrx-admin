// CLOSE-CORE CD-CORE-18 (acceptance test 5, "Two Chens") + CD-CORE-17 (alternates and Use this one), live store,
// as admin@admin.com. Two Practitioner records for the same Dr. Chen each get a Person parent extracted; each Person
// has its own notes (Notes rows linking to it, plus a comment). Merge the two Persons: both note sets reach the
// winner, the loser's id resolves to the winner, the differing phone is an alternate with its source; Use this one
// makes the alternate the value. Undo the merge: both Persons and their notes come back. Disposable, archived.
// Run: node scripts/airtable-walk/close-core-test5.mjs
import { declareTable } from "@ai-matrx/records/core";
import { chooseAlternate } from "@ai-matrx/records";
import { admin, must, say } from "./at-fix-j-lib.mjs";

const A = await admin();
const c = A.client;
const s = Math.random().toString(36).slice(2, 6);
const made = [];
const doc = async (id) => { const r = await c.recordAsOf({ record_id: id, recorded_at: new Date().toISOString() }); return r.ok ? r.data : { error: r.error.message }; };
try {
  const persons = must(await declareTable(c, { name: `CC Persons ${s}`, labelSingular: "Person", labelPlural: "Persons", fields: [
    { key: "name", label: "Name", type: "text", sort: 10 }, { key: "phone", label: "Phone", type: "text", sort: 20 },
  ] }), "persons"); made.push(persons);
  const pracs = must(await declareTable(c, { name: `CC Practitioners ${s}`, labelSingular: "Practitioner", labelPlural: "Practitioners", fields: [
    { key: "name", label: "Name", type: "text", sort: 10 }, { key: "phone", label: "Phone", type: "text", sort: 20 }, { key: "clinic", label: "Clinic", type: "text", sort: 30 },
  ] }), "practitioners"); made.push(pracs);
  const notes = must(await declareTable(c, { name: `CC Notes ${s}`, labelSingular: "Note", labelPlural: "Notes", fields: [
    { key: "name", label: "Note", type: "text", sort: 10 }, { key: "about", label: "About", type: "relation", relationTarget: persons, sort: 20 },
  ] }), "notes"); made.push(notes);

  const p1 = must(await c.recordWrite({ table_id: pracs, data: { name: "Dr. Mei Chen", phone: "949 555 0110", clinic: "Harbor PT" } }), "p1");
  const p2 = must(await c.recordWrite({ table_id: pracs, data: { name: "Dr. Mei Chen", phone: "949 555 0177", clinic: "Laguna Spine" } }), "p2");
  const e1 = must(await c.migrateExtractParent({ record_id: p1, parent_table_id: persons, moved_keys: ["name", "phone"] }), "extract 1");
  const e2 = must(await c.migrateExtractParent({ record_id: p2, parent_table_id: persons, moved_keys: ["name", "phone"] }), "extract 2");
  const [win, lose] = [e1.parent, e2.parent];
  say("extracted parents", { winner: win, loser: lose });
  const n1 = must(await c.recordWrite({ table_id: notes, data: { name: "Prefers morning calls", about: win } }), "note 1");
  const n2 = must(await c.recordWrite({ table_id: notes, data: { name: "Moved clinics in March", about: lose } }), "note 2");
  const cm = await c.commentWrite({ record_id: lose, body: "Same person as the Harbor PT Chen?" });
  say("comment on loser:", cm.ok ? "ok" : cm.error.message);

  const merged = must(await c.migrateMerge({ winner_id: win, loser_id: lose }), "merge");
  say("merged:", { relations_retargeted: merged.relations_retargeted, alternates_added: merged.alternates_added, resolves_to: merged.resolves_to });
  const notesAfter = must(await c.listByIds({ table_id: notes, ids: [n1, n2] }), "notes after");
  say("both notes point at the winner:", notesAfter.map((r) => r.document.about === win), notesAfter.map((r) => r.document.name));
  const loserRead = await c.recordRead({ record_id: lose });
  say("loser id reads as:", loserRead.ok ? { id: loserRead.data.record_id ?? loserRead.data.id, name: loserRead.data.document?.name, phone: loserRead.data.document?.phone } : loserRead.error.message);
  const thread = await c.commentThread({ record_id: lose });
  say("loser's comment still reachable:", thread.ok ? JSON.stringify(thread.data).includes("Harbor PT Chen") : thread.error.message);
  const winDoc = await doc(win);
  say("winner phone + alternates:", { phone: winDoc.phone, alternates: winDoc._values?.phone?.alternates });

  // CD-CORE-17: Use this one.
  const used = await chooseAlternate(c, { record_id: win, field_key: "phone", alternate_index: 0 });
  const winDoc2 = await doc(win);
  say("Use this one:", used.ok ? "saved" : used.error.message, { phone: winDoc2.phone, alternates: winDoc2._values?.phone?.alternates });

  // The live store is busy at times: an undo cancelled at the statement timeout changed nothing, so try again.
  let undone;
  for (let i = 0; i < 5; i++) { undone = await c.migrateUndo({ migration_id: merged.migration_id }); if (undone.ok || undone.error.code !== "timed_out") break; await new Promise((r) => setTimeout(r, 4000)); }
  say("undo merge:", undone.ok ? "ok" : undone.error.message);
  const both = must(await c.listByIds({ table_id: persons, ids: [win, lose] }), "both after undo");
  const notesBack = must(await c.listByIds({ table_id: notes, ids: [n1, n2] }), "notes after undo");
  say("after undo:", { persons: both.map((r) => r.id), note2_points_at_loser_again: notesBack.find((r) => r.id === n2)?.document.about === lose, note1_points_at_winner: notesBack.find((r) => r.id === n1)?.document.about === win });
} finally {
  for (const t of made) for (let i = 0; i < 5; i++) { const r = await c.tableArchive({ table_id: t }); if (r.ok || r.error.code !== "timed_out") { say("archived", t, r.ok ? "ok" : JSON.stringify(r.error)); break; } await new Promise((res) => setTimeout(res, 4000)); }
}
