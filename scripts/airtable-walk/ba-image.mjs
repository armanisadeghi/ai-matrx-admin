// BA- CD-AI-02: a Describe image column on a BA- table with one public picture, filled once as admin through the REST door.
import { presetInputs, presetInstruction } from "@ai-matrx/records";
import { admin, must, say, ORG } from "./ba-lib.mjs";
const API = "https://server.app.matrxserver.com/api/v1/tables";
const A = await admin();
const token = (await A.sb.auth.getSession()).data.session.access_token;
const call = async (method, path, body) => {
  const r = await fetch(API + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Organization-Id": ORG }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
};
let tid = process.env.TID;
if (!tid) {
  const made = await call("POST", "", { name: "BA- Pictures", columns: [{ name: "Name", type: "text" }, { name: "Photo", type: "file" }, { name: "Description", type: "long_text" }] });
  say("made", made.status, JSON.stringify(made.j).slice(0, 300));
  tid = made.j.table_id ?? made.j.id ?? made.j.table?.id;
  const row = await call("POST", `/${tid}/rows`, { values: { Name: "Sample photo", Photo: { url: process.env.IMG ?? "https://www.gstatic.com/webp/gallery/1.jpg", name: "sample.jpg" } } });
  say("row", row.status, JSON.stringify(row.j).slice(0, 400));
}
say("table", tid);
const fields = must(await A.client.fields({ table_id: tid }), "fields");
const photo = fields.find((f) => (f.label ?? f.name) === "Photo"); const desc = fields.find((f) => (f.label ?? f.name) === "Description");
say("fields", fields.map((f) => [f.key, f.label ?? f.name, f.type]));
const spec = { instruction: presetInstruction("describe_image", { reads: ["Photo"] }), review_interval_days: null, enabled: process.env.ON === "1", inputs: presetInputs("describe_image", [photo.key]) };
say("spec", spec);
say("declare", JSON.stringify(await A.client.enrichDeclare({ field_id: desc.id, spec })).slice(0, 300));
const run = await call("POST", `/${tid}/ai-columns/${desc.id}/run`, { rows: 1 });
say("run", run.status, JSON.stringify(run.j).slice(0, 1200));
const rows = await call("GET", `/${tid}/rows`);
say("rows", rows.status, JSON.stringify(rows.j).slice(0, 1200));
