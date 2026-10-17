// features/spaces/templates/check.ts — `pnpm spaces:templates:check [file|dir ...]`
//
// Checks Space template packs with no database: the pack's shape, every page against the stored-page
// rules and the database's JSON schema, every token, and the tables through the records validator
// (lib/spaces-blocks/template-pack-check.ts). Exit 0 = every pack passes; 1 = findings; 2 = could not read.
// Also refuses two packs with one catalogue id.

import { relative } from "node:path";

import { checkPack } from "@/lib/spaces-blocks/template-pack-check";

import { agentSnapshot, packFilesIn, readPack } from "./pack-files";

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
