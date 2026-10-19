import { readFileSync } from "node:fs";

import { createRecordsClient } from "@ai-matrx/records";
import { templatePreview } from "@ai-matrx/records/memory";
const pack = JSON.parse(readFileSync("/Users/armanisadeghi/code/matrx-frontend/features/spaces/templates/packs/law-firm-billing-and-time.pack.json", "utf8"));
it("law", async () => {
  const p = templatePreview(pack.spec, { today: "2026-10-18" });
  const c = createRecordsClient(p.config);
  for (const t of p.tables) {
    const page = await c.listPage({ table_id: t.id, limit: 3 });
    console.log("TABLE", t.token, page.ok ? JSON.stringify(page.data.rows[0]?.document).slice(0, 600) : JSON.stringify(page));
  }
  const entry = p.tables.find((t) => t.token === "entry")!;
  const fields = await c.fields({ table_id: entry.id });
  const matter = fields.ok ? fields.data.find((f) => f.key === "matter") : null;
  console.log("MATTERFIELD", JSON.stringify(matter).slice(0, 400));
  const page = await c.listPage({ table_id: entry.id, limit: 3 });
  const ids = page.ok ? page.data.rows.map((r) => String(r.document["matter"])) : [];
  console.log("IDS", ids);
  const w = await c.relationWordsMany({ field_id: matter!.id, record_ids: ids } as never);
  console.log("WORDS", JSON.stringify(w));
  const client = p.tables.find((t) => t.token === "client")!;
  const cf = await c.fields({ table_id: client.id });
  console.log("CLIENTFIELDS", JSON.stringify(cf.ok && cf.data.map((f) => [f.key, f.type, (f as any).parity_type, JSON.stringify((f as any).config)])));
});
