// features/spaces/templates/check.ts — `pnpm spaces:templates:check [file|dir ...]`
//
// Checks Space template packs with no database: the pack's shape, every page against the stored-page
// rules and the database's JSON schema, every token, and the tables through the records validator
// (lib/spaces-blocks/template-pack-check.ts). Exit 0 = every pack passes; 1 = findings; 2 = could not read.
// Also refuses two packs with one catalogue id or one title — measured against EVERY pack in the packs
// folder, not only the files named, so a lane checking its one file still sees the other lanes' packs
// (2026-10-17: two lanes wrote content-calendar.pack.json; the second overwrote the first).

import { relative } from "node:path";

import { checkPack } from "@/lib/spaces-blocks/template-pack-check";

import { agentSnapshot, PACKS_DIR, packFilesIn, readPack } from "./pack-files";

function main(): number {
  let files: string[];
  try {
    files = packFilesIn(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    return 2;
  }
  if (!files.length) {
    console.error("No *.pack.json files found.");
    return 2;
  }
  const agents = agentSnapshot();
  // Every other pack's id and title (the folder), so one file is judged against the whole library.
  const others = new Map<string, { id?: string; title?: string }>();
  for (const file of packFilesIn([PACKS_DIR])) {
    try {
      const p = readPack(file) as { catalogueId?: string; title?: string };
      others.set(relative(process.cwd(), file), { id: p.catalogueId, title: p.title?.trim().toLowerCase() });
    } catch {
      // An unreadable sibling is that file's own finding when it is checked.
    }
  }
  const ids = new Map<string, string>();
  let failed = 0;
  for (const file of files) {
    const name = relative(process.cwd(), file);
    let raw: unknown;
    try {
      raw = readPack(file);
    } catch (error) {
      console.log(`FAIL ${name}\n  (file): ${(error as Error).message}`);
      failed++;
      continue;
    }
    const findings = checkPack(raw, { agents });
    const id = (raw as { catalogueId?: string }).catalogueId;
    if (id && ids.has(id)) findings.push({ at: "catalogueId", says: `"${id}" is already used by ${ids.get(id)}; take the next free number.` });
    if (id) ids.set(id, name);
    const title = (raw as { title?: string }).title?.trim().toLowerCase();
    for (const [other, o] of others) {
      if (other === name) continue;
      if (id && o.id === id && !findings.some((f) => f.at === "catalogueId")) findings.push({ at: "catalogueId", says: `"${id}" is already used by ${other}; take the next free number.` });
      if (title && o.title === title) findings.push({ at: "title", says: `${other} already has this title; give this template a distinct name (and never write over another lane's file).` });
    }
    if (!findings.length) {
      console.log(`PASS ${name} (${id})`);
      continue;
    }
    failed++;
    console.log(`FAIL ${name} — ${findings.length} finding(s)`);
    for (const f of findings) console.log(`  ${f.at}: ${f.says}`);
  }
  console.log(`\n${files.length - failed} of ${files.length} pack(s) pass.`);
  return failed ? 1 : 0;
}

process.exit(main());
