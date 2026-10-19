// scripts/spaces-template-search-queries.ts — `pnpm tsx scripts/spaces-template-search-queries.ts [query ...]`
// Runs the gallery's one template search (lib/spaces-blocks/template-search.ts) over every committed pack's card
// face and prints the count and first answers per query: the 15 ADVERSARIAL-1 queries and the 10 ADVERSARIAL-2 ones.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { packCardFace, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";
import { searchTemplates } from "@/lib/spaces-blocks/template-search";

export const GALLERY_QUERIES = [
  "to do list", "todo", "kanban", "board", "calendar", "crm", "budget", "habit", "meeting notes", "invoice",
  "recipes", "wiki", "roadmap", "journal", "client portal",
  "plumber", "accountant", "dentist", "lawyer", "realtor", "bakery", "restaurant", "salon", "gym", "law firm",
];

const dir = join(process.cwd(), "features/spaces/templates/packs");
const faces = readdirSync(dir)
  .filter((f) => f.endsWith(".pack.json"))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as SpaceTemplatePack)
  .filter((p) => p.pages?.length)
  .map(packCardFace);

const queries = process.argv.slice(2).length ? process.argv.slice(2) : GALLERY_QUERIES;
console.log(`| Query | Count of ${faces.length} | First answers |\n|---|---|---|`);
for (const q of queries) {
  const found = searchTemplates(faces, q, (f) => f);
  console.log(`| ${q} | ${found.length} | ${found.slice(0, 5).map((f) => f.title).join(" · ")} |`);
}
