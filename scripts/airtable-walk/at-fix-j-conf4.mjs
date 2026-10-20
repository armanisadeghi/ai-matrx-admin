import { admin, member, say, must } from "./at-fix-j-lib.mjs";
import { execFileSync } from "node:child_process";
const id = process.env.TABLE;
const a = await admin(); const m = await member();
const qty = must(await a.client.fields({ table_id: id }), "fields").find((f) => f.key === "qty");
const sql = (q) => execFileSync("uv", ["run", "python", process.env.HOME + "/lane-resume/h3q.py"], { cwd: process.env.HOME + "/code/aidream", input: q, encoding: "utf8" }).trim();
const ORGID = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", U = "4060701e-706a-4c76-b3ca-0bbc69fa5a14";
must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "confidential" } }), "set");
try {
  say("visible_field_ids viewer:", sql(`select string_agg(field_key,',') from iam.visible_field_ids('${U}','${ORGID}','${id}','viewer','read')`));
  say("visible_field_ids editor:", sql(`select string_agg(field_key,',') from iam.visible_field_ids('${U}','${ORGID}','${id}','editor','read')`));
  say("read_mask_for viewer:", sql(`select custom.read_mask_for('${U}','${ORGID}','${id}','viewer','read') -> 'visible'`));
  say("effective_level (door call shape):", sql(`select custom.effective_level('${U}','${ORGID}','${id}')`));
  say("kept mask rows:", sql(`select level, kept_at, versions from custom.read_mask_kept where reader_id='${U}' and table_id='${id}'`));
  say("access versions:", sql(`select custom._access_versions('${ORGID}')`));
  const page = await m.client.listPage({ table_id: id, limit: 5, offset: 0, sort: [], search: null, filter: {}, view_id: null });
  say("member now reads qty:", page.data.rows.map((r) => r.document.qty));
} finally { must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "internal" } }), "restore"); }
