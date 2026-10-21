// CLOSE-CORE: archive disposable tables this lane made, by id, retrying while the live store is busy.
// Run: node scripts/airtable-walk/close-core-archive.mjs <table-id>...
import { admin, say } from "./at-fix-j-lib.mjs";
const c = (await admin()).client;
for (const id of process.argv.slice(2)) for (let i = 0; i < 6; i++) {
  const r = await c.tableArchive({ table_id: id, chunk: 5, includeTable: true });
  if (r.ok && r.data?.done !== false) { say("archived", id); break; }
  if (!r.ok && !["timed_out", "unreachable"].includes(r.error.code)) { say("archive refused", id, r.error.message); break; }
  await new Promise((res) => setTimeout(res, 5000));
}
