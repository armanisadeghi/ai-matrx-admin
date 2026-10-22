// CLOSE-LINK: read or restore the parent of the walk's "Summer order" (fixture created by this lane). ARG: show | restore <parentId|null>
import { admin, say } from "./cl-lib.mjs";
const SUMMER = "794ca9c7-36d1-4f69-9585-611222444295";
const a = await admin();
const [cmd, p] = process.argv.slice(2);
if (cmd === "restore") say("restore", await a.client.recordReparent({ record_id: SUMMER, parent_id: p === "null" ? null : p }));
const r = await a.client.recordGet?.({ record_id: SUMMER }).catch((e) => ({ e: String(e) }));
say("summer", JSON.stringify(r?.data ?? r).slice(0, 600));
process.exit(0);
