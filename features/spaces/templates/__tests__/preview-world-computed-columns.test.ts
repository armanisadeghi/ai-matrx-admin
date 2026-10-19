// PREVIEW-DATA-FIX (ADVERSARIAL-2 #1): THE LIVE TEMPLATE PREVIEW SHOWS THE PACK'S OWN NUMBERS.
//
// The public /templates/<slug> page and the in-app gallery draw every pack over `templatePreview(pack.spec)`
// (data/sources.ts `registerSampleWorld`). Law Firm Billing and Time read "A record you have not been given access
// to" in Entered by, Billed $0.00 for a client with a Paid $2,880 invoice, "—" in Invoices / Matters and a blank
// Outstanding, while the server outline (sample rows) was right. Over EVERY pack, read through the one client every
// records-ui screen uses: no link chip is withheld, a rollup with sample children is never all zero, no formula,
// rollup or lookup says it could not be worked out, and the back-link door answers.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { fieldKindFor } from "@ai-matrx/records";
import { createRecordsClient } from "@ai-matrx/records/core";
import { templatePreview } from "@ai-matrx/records/memory";
import type { TemplateSpec } from "@ai-matrx/records/templates";

type Field = { key: string; label?: string; parityType?: string; via?: string; pick?: string; of?: string; agg?: string; filter?: unknown; relationTarget?: string };
type Table = { token: string; fields: Field[]; rows: Array<{ key: string; values: Record<string, unknown> }> };
type Rel = { fromTable: string; fromField: string; toTable: string; inverseKey?: string };

const DIR = join(__dirname, "..", "packs");
const PACKS = readdirSync(DIR).filter((f) => f.endsWith(".pack.json")).sort();
const load = (file: string) => JSON.parse(readFileSync(join(DIR, file), "utf8")) as { spec: TemplateSpec & { tables: Table[]; relationships?: Rel[] } };

/** The sample children a rollup on `table` reads, by hand from the pack: the linking table's rows per parent key. */
function childrenOf(spec: { tables: Table[]; relationships?: Rel[] }, table: Table, field: Field): Map<string, Array<Record<string, unknown>>> | null {
  const via = String(field.via ?? "");
  const [tok, key] = via.includes(".") ? via.split(".") : [null, via];
  for (const other of spec.tables) {
    if (tok && other.token !== tok) continue;
    const rel = other.fields.find((f) => f.parityType === "relation" && f.relationTarget === table.token && (f.key === key || (spec.relationships ?? []).some((r) => r.fromTable === other.token && r.fromField === f.key && r.toTable === table.token && r.inverseKey === key)));
    if (!rel) continue;
    const out = new Map<string, Array<Record<string, unknown>>>();
    for (const row of other.rows) {
      const v = row.values[rel.key];
      for (const k of Array.isArray(v) ? v : v ? [v] : []) out.set(String(k), [...(out.get(String(k)) ?? []), row.values]);
    }
    return out;
  }
  return null;
}

describe.each(PACKS)("preview world of %s", (file) => {
  const pack = load(file);
  const preview = templatePreview(pack.spec, { today: "2026-10-18" });
  const client = createRecordsClient({ ...preview.config, onError: () => undefined });

  it("names every link, works out every computed column, and answers the back-link door", async () => {
    const problems: string[] = [];
    for (const t of preview.tables) {
      // A table the install plan adds (the foundation's team, say) has no pack declaration: only its reads are checked.
      const specTable: Table = pack.spec.tables.find((x) => x.token === t.token) ?? { token: t.token, fields: [], rows: [] };
      const [fields, page, cols] = await Promise.all([client.fields({ table_id: t.id }), client.listPage({ table_id: t.id, limit: 500 }), client.reverseColumns({ table_id: t.id })]);
      if (!fields.ok || !page.ok || !cols.ok) {
        problems.push(`${t.token}: read refused`);
        continue;
      }
      const rows = page.data.rows;
      for (const f of fields.data) {
        if (f.type === "relation" && fieldKindFor(f) !== "attachment") {
          const ids = [...new Set(rows.flatMap((r) => { const v = r.document[f.key]; return Array.isArray(v) ? v : typeof v === "string" ? [v] : []; }))] as string[];
          if (!ids.length) continue;
          const words = await client.relationWordsMany({ field_id: f.id, record_ids: ids as never });
          const withheld = words.ok ? ids.filter((id) => !words.data[id]) : ids;
          if (withheld.length) problems.push(`${t.token}.${f.key}: ${withheld.length}/${ids.length} link chips withheld`);
        }
      }
      for (const r of rows) {
        const errors = r.document["_errors"] as Record<string, string> | undefined;
        if (errors) for (const [k, why] of Object.entries(errors)) problems.push(`${t.token}.${k}: ${why}`);
      }
      for (const sf of specTable.fields.filter((x) => x.parityType === "rollup" && !x.filter)) {
        const kids = childrenOf(pack.spec, specTable, sf);
        if (!kids || kids.size === 0) continue;
        const pick = sf.of ?? sf.pick;
        const worthy = sf.agg === "count" || [...kids.values()].some((list) => list.some((v) => typeof v[pick ?? ""] === "number" && v[pick ?? ""] !== 0));
        if (!worthy) continue;
        if (!rows.some((r) => typeof r.document[sf.key] === "number" && r.document[sf.key] !== 0)) problems.push(`${t.token}.${sf.key}: every row reads 0 though ${kids.size} rows have children`);
      }
      for (const sf of specTable.fields.filter((x) => x.parityType === "formula")) {
        if (rows.length && rows.every((r) => r.document[sf.key] === null || r.document[sf.key] === undefined)) problems.push(`${t.token}.${sf.key}: formula empty on every row`);
      }
      if (cols.data.length && rows.length) {
        const back = await client.reverseLinksFields({ table_id: t.id, source_field_ids: cols.data.map((c) => c.source_field_id), record_ids: rows.slice(0, 50).map((r) => r.id) as never });
        if (!back.ok) problems.push(`${t.token}: back-link columns refused (${back.error.code})`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("Law Firm Billing and Time, by hand", () => {
  it("Hargreave Dental Group's Billed is its Paid $2,880 invoice and Outstanding is 0", async () => {
    const pack = load("law-firm-billing-and-time.pack.json");
    const preview = templatePreview(pack.spec, { today: "2026-10-18" });
    const client = createRecordsClient({ ...preview.config, onError: () => undefined });
    const clients = preview.tables.find((t) => t.token === "client")!;
    const page = await client.listPage({ table_id: clients.id, limit: 50 });
    expect(page.ok).toBe(true);
    const doc = page.ok ? page.data.rows.find((r) => r.document["client_name"] === "Hargreave Dental Group")!.document : {};
    expect(doc["billed"]).toBe(2880);
    expect(doc["payments"]).toBe(2880);
    expect(doc["outstanding"]).toBe(0);
  });
});
