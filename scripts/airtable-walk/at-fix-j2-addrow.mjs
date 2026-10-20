import { admin, say, must } from "./at-fix-j-lib.mjs";
const a = await admin();
const r = must(await a.client.recordWrite({ table_id: process.env.TABLE, data: { item: "Webcam (digest test)" } }), "row");
say("added", JSON.stringify(r).slice(0, 100));
