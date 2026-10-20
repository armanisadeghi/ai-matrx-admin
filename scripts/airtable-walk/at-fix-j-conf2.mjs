// AT-FIX-J item 2 TEST (live): for every sensitivity word the "Who can see and edit" People list says the member sees the column
// exactly when the member's own read of a row carries it. Exits 1 on any disagreement. RED before migration 20261020030000_atfixj_a_*.
import { admin, member, say, must } from "./at-fix-j-lib.mjs";
const id = process.env.TABLE;
const a = await admin(); const m = await member();
const qty = must(await a.client.fields({ table_id: id }), "fields").find((f) => f.key === "qty");
say("qty now", qty.sensitivity);
for (const sens of ["internal", "confidential", "restricted", "internal"]) {
  must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: sens } }), "set");
  const view = await a.sb.schema("custom").rpc("field_access_setup", { p_field_id: qty.id });
  const people = view.data?.people?.map((p) => `${p.email}:${p.level}:sees=${p.sees}`);
  await new Promise((r) => setTimeout(r, 1500));
  const page = await m.client.listPage({ table_id: id, limit: 5, offset: 0, sort: [], search: null, filter: {}, view_id: null });
  const panelSees = view.data?.people?.find((p) => p.email === m.email)?.sees;
  const memberSees = page.ok && page.data.rows[0]?.document?.qty !== undefined && page.data.rows[0]?.document?.qty !== null;
  if (panelSees !== memberSees) { say("DISAGREE", sens, { panelSees, memberSees }); process.exitCode = 1; }
  say(sens, "| panel people:", people, "| member reads qty:", page.ok ? page.data.rows[0]?.document?.qty : page.error?.message);
}
