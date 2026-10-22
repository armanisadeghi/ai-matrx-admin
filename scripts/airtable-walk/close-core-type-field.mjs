// CLOSE-CORE CD-CORE-15 (acceptance test 8, "Type field"), through the records client a person's screen uses,
// on the live store as admin@admin.com: Shape has a Kind; a Circle shows Radius, a Rectangle shows Width and
// Height, a Square refuses Width ≠ Height; switching a Circle to a Rectangle keeps its id, asks for Width and
// Height, and keeps the old Radius in History with the reason. Disposable table archived at the end.
// Run: node scripts/airtable-walk/close-core-type-field.mjs
import { declareTable } from "@ai-matrx/records/core";
import { updateOnTheWinningVersion, readTableVersionNow } from "@ai-matrx/records/versions";
import { admin, say } from "./at-fix-j-lib.mjs";
const c = (await admin()).client;
const tries = async (fn) => { let r; for (let i = 0; i < 5; i++) { r = await fn(); if (r.ok || !["timed_out", "unreachable"].includes(r.error?.code)) return r; await new Promise((res) => setTimeout(res, 4000)); } return r; };
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + r.error.message); return r.data; };
let fails = 0;
const check = (ok, what, detail) => { if (!ok) fails++; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };
const raw = async (id) => { const r = await c.recordAsOf({ record_id: id, recorded_at: new Date().toISOString() }); return r.ok ? r.data : { error: r.error.message }; };
const shape = must(await tries(() => declareTable(c, { name: `CC shapes ${Math.random().toString(36).slice(2, 6)}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "kind", label: "Kind", type: "select", options: ["Circle", "Rectangle", "Square"], sort: 20 },
] })), "shape");
try {
  const v = await readTableVersionNow(c, shape);
  check((await tries(() => updateOnTheWinningVersion(c, shape, { type_field: "kind" }, v, "always"))).ok, "Kind is the table's type field");
  must(await tries(() => c.fieldDeclare({ table_id: shape, spec: { key: "radius", label: "Radius", type: "number", required: true, sort: 30, applies_to_types: ["circle"] } })), "radius");
  const width = must(await tries(() => c.fieldDeclare({ table_id: shape, spec: { key: "width", label: "Width", type: "number", required: true, sort: 40, applies_to_types: ["rectangle", "square"] } })), "width");
  must(await tries(() => c.fieldDeclare({ table_id: shape, spec: { key: "height", label: "Height", type: "number", required: true, sort: 50, applies_to_types: ["rectangle", "square"] } })), "height");
  must(await tries(() => c.fieldUpdate({ field_id: width, patch: { rules: [{ kind: "equals_field", value: "height", applies_to_types: ["square"] }] } })), "square rule");
  const keys = async (t) => must(await tries(() => c.fields({ table_id: shape, recordType: t })), "fields " + t).map((f) => f.key).sort();
  const circleKeys = await keys("circle"), rectKeys = await keys("rectangle"), noType = must(await tries(() => c.fields({ table_id: shape })), "fields").map((f) => f.key).sort();
  check(JSON.stringify(circleKeys) === JSON.stringify(["kind", "name", "radius"]), "a Circle shows Name, Kind and Radius", circleKeys);
  check(JSON.stringify(rectKeys) === JSON.stringify(["height", "kind", "name", "width"]), "a Rectangle shows Name, Kind, Width and Height", rectKeys);
  check(JSON.stringify(noType) === JSON.stringify(["kind", "name"]), "asked with no type: only the columns every record has", noType);
  const every = must(await tries(() => c.fields({ table_id: shape, recordType: "*" })), "fields *").map((f) => f.key).sort();
  check(JSON.stringify(every) === JSON.stringify(["height", "kind", "name", "radius", "width"]), "asked for every type ('*', the table's own screens): all five columns", every);
  const noRadius = await tries(() => c.recordWrite({ table_id: shape, data: { name: "C0", kind: "circle" } }));
  check(!noRadius.ok && /Radius is required/.test(noRadius.error.message), "a Circle with no Radius is refused by name", noRadius.ok ? "saved" : noRadius.error.message);
  const circle = must(await tries(() => c.recordWrite({ table_id: shape, data: { name: "C1", kind: "circle", radius: 12 } })), "circle");
  check(true, "a Circle with Radius 12 saves", circle);
  const sq = await tries(() => c.recordWrite({ table_id: shape, data: { name: "S2", kind: "square", width: 10, height: 11 } }));
  check(!sq.ok, "a Square with Width 10 and Height 11 is refused", sq.ok ? "saved" : sq.error.message);
  const sqOk = await tries(() => c.recordWrite({ table_id: shape, data: { name: "S1", kind: "square", width: 10, height: 10 } }));
  check(sqOk.ok, "a Square with equal sides saves", sqOk.ok ? "" : sqOk.error.message);
  const half = await tries(() => c.recordUpdate({ record_id: circle, patch: { kind: "rectangle", height: 9 } }));
  check(!half.ok && /Width is required/.test(half.error.message), "the Circle turned Rectangle is asked for its Width", half.ok ? "saved" : half.error.message);
  const full = await tries(() => c.recordUpdate({ record_id: circle, patch: { kind: "rectangle", width: 4, height: 9 } }));
  check(full.ok, "with Width and Height it becomes a Rectangle", full.ok ? "" : full.error.message);
  const d = await raw(circle);
  check(d.kind === "rectangle" && d.width === 4 && d.radius === undefined, "same id, Rectangle now, no Radius on it", { kind: d.kind, width: d.width, radius: d.radius ?? null });
  check((d._retired ?? []).some((x) => x.key === "radius" && String(x.value) === "12" && x.reason), "the old Radius 12 is in History with the reason", (d._retired ?? []).map((x) => ({ key: x.key, value: x.value, reason: x.reason })));
} catch (e) { fails++; say("ERROR", e.message); }
finally {
  for (let i = 0; i < 6; i++) { const r = await c.tableArchive({ table_id: shape, chunk: 5, includeTable: true }); if (r.ok && r.data?.done !== false) { say("archived", shape); break; } await new Promise((res) => setTimeout(res, 4000)); }
  say(fails ? `${fails} FAILED` : "ALL PASS");
}
