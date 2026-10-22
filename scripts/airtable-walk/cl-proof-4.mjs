// CLOSE-LINK proof 4 (live store, admin then member test@test.com): re-check on the lane's existing fixtures, no new tables.
// 01 both ends without a second field, 12 link history (who and when), 13 merge re-points links and undo restores them,
// 06 one archive verb: restrict names the orders, cascade takes the serials (and restore brings them back), set_null keeps
// the pointer and the reader draws it as archived.
import { admin, member, must, say, err } from "./cl-lib.mjs";
const T = { clients: "475d36ce-7e0e-4914-bb2e-f9372f999e48", bookings: "7dad23dc-ac4a-46a4-876c-499cdf9b8793", serials: "ef7da176-8221-4dc4-bccc-2d1c6ccd30b2", po: "f72f1831-f2c9-49db-a5c3-17f10146060e" };
const CLIENT_FIELD = "c19ea3a0-fb6b-4af1-bfba-79c2bf306ace", TAG_FIELD = "0cbc9619-2248-441d-9fb9-13b7886b48e9";
const HARBOR = "50323490-8204-4385-af5e-61db68972c9e", DUPE = "e59fbd56-5068-4975-a00b-bf5655b75802";
const SPRING = "29642cec-76a9-4950-8da6-26870c59d725", SUMMER = "794ca9c7-36d1-4f69-9585-611222444295";
const SUPPLIER = "304a2163-404c-4f42-927f-e6904b4da496", WIDGET = "718f3866-5da7-47e8-b040-3838f854eda6", TAG = "481a91b2-03fd-4b92-ae77-5ada970c54ab";
const verdict = [];
const check = (id, ok, what) => { verdict.push(`${ok ? "PASS" : "FAIL"} ${id} ${what}`); say(ok ? "PASS" : "FAIL", id, what); };
const a = await admin();
const clientOf = async (c, ids) => Object.fromEntries(must(await c.listByIds({ table_id: T.bookings, ids }), "read").map((r) => [r.document.title, r.document.client ?? null]));

// 13 first (it needs Summer -> the duplicate)
let now = await clientOf(a.client, [SPRING, SUMMER]);
if (now["Summer order"] !== DUPE) must(await a.client.recordUpdate({ record_id: SUMMER, patch: { client: DUPE } }), "set dupe");
if (now["Spring order"] !== HARBOR) must(await a.client.recordUpdate({ record_id: SPRING, patch: { client: HARBOR } }), "set harbor");
const m = await a.client.migrateMerge({ winner_id: HARBOR, loser_id: DUPE, note: "CLOSE-LINK round 1 re-check" });
if (!m.ok) check("CD-LINK-13", false, "merge refused: " + err(m));
else {
  const merged = await clientOf(a.client, [SPRING, SUMMER]);
  check("CD-LINK-13", merged["Summer order"] === HARBOR && merged["Spring order"] === HARBOR, `after merge both bookings point at Harbor Bakery: ${JSON.stringify(merged)}`);
  const u = await a.client.migrateUndo({ migration_id: m.data.migration_id });
  const back = await clientOf(a.client, [SPRING, SUMMER]);
  check("CD-LINK-13", u.ok && back["Summer order"] === DUPE && back["Spring order"] === HARBOR, `undo puts Summer back on Harbor Bakery Inc: ${u.ok ? "" : err(u)} ${JSON.stringify(back)}`);
}

// 01: Clients declares no reverse field, yet shows its bookings
const cf = must(await a.client.fields({ table_id: T.clients }), "fields");
const rc = must(await a.client.reverseColumns({ table_id: T.clients }), "reverse");
const rl = await a.client.reverseLinksMany({ table_id: T.clients, field_id: CLIENT_FIELD, record_ids: [HARBOR] });
check("CD-LINK-01", !cf.some((f) => f.type === "relation") && rc.some((r) => r.source_field_id === CLIENT_FIELD), `Clients declares ${cf.map((f) => f.key)} and shows reverse column "${rc.find((r) => r.source_field_id === CLIENT_FIELD)?.label}"`);
say("01 reverse links of Harbor:", rl.ok ? JSON.stringify(rl.data).slice(0, 400) : err(rl));

// 12: add then remove a link, both in history with who and when
must(await a.client.recordUpdate({ record_id: SUMMER, patch: { client: HARBOR } }), "add");
must(await a.client.recordUpdate({ record_id: SUMMER, patch: { client: DUPE } }), "back");
const h = must(await a.client.recordHistory({ record_id: SUMMER }), "history");
const clientChanges = h.filter((e) => e.changes?.some((c) => c.key === "client"));
check("CD-LINK-12", clientChanges.length >= 2 && clientChanges.every((e) => e.actor?.name && e.occurred_at), `history lists ${clientChanges.length} Client changes, latest: ${clientChanges.slice(0, 2).map((e) => `${e.actor?.name} ${e.occurred_at} ${JSON.stringify(e.changes.find((c) => c.key === "client"))}`).join(" ; ")}`);

// 06: restrict, cascade, set_null
const del = await a.client.recordDelete({ record_id: SUPPLIER });
check("CD-LINK-06", !del.ok && /PO-1001/.test(err(del) ?? "") && /PO-1002/.test(err(del) ?? ""), `archive supplier: ${del.ok ? "ARCHIVED (defect)" : err(del)}`);
const w = await a.client.recordDelete({ record_id: WIDGET });
const left = must(await a.client.list({ table_id: T.serials, limit: 10 }), "left");
const rs = await a.client.recordRestore({ record_id: WIDGET });
const again = must(await a.client.list({ table_id: T.serials, limit: 10 }), "again");
check("CD-LINK-06", w.ok && left.rows.length === 0 && rs.ok && again.rows.length === 2, `widget archive takes its ${2 - left.rows.length} serials; restore brings back ${again.rows.map((r) => r.document.code)}`);
const pos = must(await a.client.list({ table_id: T.po, limit: 10 }), "pos");
const words = await a.client.relationWordsMany({ field_id: TAG_FIELD, record_ids: [TAG] });
check("CD-LINK-06", pos.rows.every((r) => r.document.tag === TAG), `tag archived: the orders keep the pointer (ruling B3-21: an archive keeps references so a restore loses nothing); reader words: ${words.ok ? JSON.stringify(words.data) : err(words)}`);

// member: the same both-ends read and history
const mm = await member();
const mrc = await mm.client.reverseColumns({ table_id: T.clients });
const mh = await mm.client.recordHistory({ record_id: SUMMER });
check("CD-LINK-01", mrc.ok && mrc.data.some((r) => r.source_field_id === CLIENT_FIELD), `member ${mm.email}: reverse column ${mrc.ok ? "shown" : err(mrc)}`);
check("CD-LINK-12", mh.ok && mh.data.some((e) => e.changes?.some((c) => c.key === "client")), `member ${mm.email}: history ${mh.ok ? mh.data.length + " entries" : err(mh)}`);
say("VERDICT", verdict);
