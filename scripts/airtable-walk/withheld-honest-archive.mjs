// WITHHELD-HONEST: archive the disposable tables this lane made (TABLES=id,id).
import { admin, say } from "./at-fix-j-lib.mjs";
const a = await admin();
for (const id of (process.env.TABLES ?? "").split(",").filter(Boolean)) { const r = await a.client.tableArchive({ table_id: id }); say("archive", id, r.ok ? "ok" : JSON.stringify(r.error).slice(0, 200)); }
