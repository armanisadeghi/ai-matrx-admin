import { readFileSync } from "fs";
import { fromRow, type SavedRow } from "../validate/fromSaved";
import { foldQueue, sectionOf } from "../validate/fold";
import { buildQueue, type BrandFact } from "../validate/queue";
import type { EvidenceItem } from "../evidence";
it("dump", () => {
  const rows = JSON.parse(readFileSync(process.env.ROWS as string, "utf8")) as SavedRow[];
  const items: EvidenceItem[] = []; const facts: BrandFact[] = [];
  for (const r of rows) { const o = fromRow(r); if (o && "fact" in o) facts.push(o.fact); else if (o) items.push(o.item); }
  const raw = buildQueue({ items, facts, decisions: {}, webChoices: {}, answered: new Set(), later: [], kinds: [], ctx: { ourHosts: [], ourAccounts: [], name: null } });
  const q = foldQueue({ queue: raw, known: { names: ["Rooter Hero Plumbing & Air"], hosts: ["https://www.rooterhero.com/"], urls: ["https://www.rooterhero.com/"], values: [] }, later: [] });
  console.log(`${rows.length} rows -> ${raw.length} raw -> ${q.length} cards\n` + q.map((c, i) => `${i + 1}. [${sectionOf(c)}] ${c.kind} | ${c.label} | ${c.value.slice(0, 70)} | ${c.title?.slice(0, 30) ?? ""} | +${c.twins.length} ${c.members ? "members:" + c.members.map((m) => m.value.slice(0, 25)).join("; ") : ""} img:${c.imageUrl ? "y" : "n"}`).join("\n"));
});
