// AT-FIX-J2 cleanup: archive the disposable tables this lane made (its own, by id) and print the state.
import { admin, say } from "./at-fix-j-lib.mjs";
const a = await admin();
for (const id of (process.env.TABLES ?? "").split(",").filter(Boolean)) {
  const r = await a.client.tableArchive({ table_id: id });
  say("archive", id, r.ok ? "ok" : JSON.stringify(r.error));
}
