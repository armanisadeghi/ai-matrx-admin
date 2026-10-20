// WITHHELD-HONEST-2 live proof (exit 1 on any failure). Seeds a disposable table (archived at the end), admin makes Qty restricted,
// then as test@test.com asks the page door (the same call the grid makes):
//  1. an EXPLICIT Rule filter on Qty is refused by name (403 withheld:qty) - unchanged,
//  2. the same filter marked skip_withheld (what the grid sends for a SAVED VIEW's own filter) is answered: no error,
//     filter_ignored names qty, the other conditions still narrow, a view whose only condition is Qty lists the whole table,
//  3. admin (can read Qty) still gets the filter applied and no filter_ignored.
import { admin, member, say, must, seedTable } from "./at-fix-j-lib.mjs";
const a = await admin(); const m = await member();
let failed = 0; const check = (ok, what, extra = "") => { say(ok ? "PASS" : "FAIL", what, extra); if (!ok) failed++; };
const id = await seedTable(a.client, "wh2");
const ORG = process.env.WALK_ORG_ID ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
try {
  const fields = must(await a.client.fields({ table_id: id }), "fields");
  const qty = fields.find((f) => f.key === "qty"); const name = fields.find((f) => f.key === "name");
  must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "restricted" } }), "restrict");
  await new Promise((r) => setTimeout(r, 2500));
  const op = (o, ...args) => ({ op: o, args });
  const f = (x) => ({ field: x.id }); const c = (v) => ({ const: v });
  const qtyBig = op("gte", f(qty), c(9));
  const nameB = op("eq", f(name), c("Bravo"));
  const page = async (who, filter) => who.sb.schema("custom").rpc("read_records_page", { p_organization_id: ORG, p_table_id: id, p_filter: filter, p_limit: 50, p_offset: 0 });
  const names = (r) => (r.data?.rows ?? []).map((x) => x.document?.name ?? x.document?.fields?.name ?? "?").sort();
  // 1. explicit
  const explicit = await page(m, qtyBig);
  check(!!explicit.error && /cannot read the Qty column/.test(explicit.error.message ?? ""), "an explicit filter on a withheld column is still refused by name", explicit.error?.message ?? "no error");
  // 2. marked
  const marked = await page(m, { ...op("and", qtyBig), skip_withheld: true });
  check(!marked.error, "a saved view's filter on a withheld column does not error", marked.error?.message ?? "");
  check(JSON.stringify(marked.data?.filter_ignored) === '["qty"]', "the answer names the skipped column in filter_ignored", JSON.stringify(marked.data?.filter_ignored));
  check(Number(marked.data?.total) === 3, "with every condition skipped the viewer sees the rows they may see", String(marked.data?.total));
  const mixed = await page(m, { ...op("and", qtyBig, nameB), skip_withheld: true });
  check(!mixed.error && Number(mixed.data?.total) === 1 && JSON.stringify(mixed.data?.filter_ignored) === '["qty"]', "the other conditions of the view still narrow the page", `${mixed.error?.message ?? ""} total=${mixed.data?.total} ignored=${JSON.stringify(mixed.data?.filter_ignored)}`);
  const orGroup = await page(m, { ...op("or", qtyBig, nameB), skip_withheld: true });
  check(!orGroup.error && Number(orGroup.data?.total) === 1, "an ANY group keeps its visible conditions", `total=${orGroup.data?.total}`);
  const notQty = await page(m, { ...op("not", qtyBig), skip_withheld: true });
  check(!notQty.error && Number(notQty.data?.total) === 3, "a NOT over a skipped condition is skipped too", `${notQty.error?.message ?? ""} total=${notQty.data?.total}`);
  const keyset = await m.sb.schema("custom").rpc("read_records_keyset", { p_organization_id: ORG, p_table_id: id, p_filter: { ...op("and", qtyBig), skip_withheld: true }, p_limit: 50 });
  check(!keyset.error && JSON.stringify(keyset.data?.filter_ignored) === '["qty"]', "the keyset door answers the same", keyset.error?.message ?? JSON.stringify(keyset.data?.filter_ignored));
  const plain = await page(m, {});
  check(JSON.stringify(plain.data?.filter_ignored) === "[]", "a page with no filter names nothing", JSON.stringify(plain.data?.filter_ignored));
  // 3. admin
  const adm = await page(a, { ...op("and", qtyBig), skip_withheld: true });
  check(!adm.error && Number(adm.data?.total) === 1 && JSON.stringify(adm.data?.filter_ignored) === "[]", "someone who can read Qty has the filter applied and nothing skipped", `total=${adm.data?.total} ignored=${JSON.stringify(adm.data?.filter_ignored)}`);
} finally {
  const r = await a.client.tableArchive({ table_id: id }); say("archived table", id, r.ok ? "ok" : JSON.stringify(r.error).slice(0, 120));
}
console.log(failed ? `FAILED ${failed}` : "ALL PASS"); process.exit(failed ? 1 : 0);
