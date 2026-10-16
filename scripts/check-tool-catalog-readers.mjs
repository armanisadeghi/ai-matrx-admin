#!/usr/bin/env node
// GUARD: no whole-table read of tool.definition may see catalog Tools.
// Catalog Tools (source_kind = 'catalog') are thousands of job rows run by one server
// executor. They are never preloaded: pickers, prompt blocks and admin lists find them
// only through the paged catalog search. So every `.schema("tool").from("definition")`
// chain is a POINT read (by id or name, single/maybeSingle, limit(1)), a WRITE, or names
// `source_kind` (the catalog filter). A statement carrying `// catalog-reader-ok: <why>`
// is a reviewed exception. Contract: common-docs/projects/third-party-services/CONTRACT.md §4.
// Twin of aidream/scripts/check_tool_catalog_readers.py.
// Usage: node scripts/check-tool-catalog-readers.mjs [--self-test]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TOOL_DEF = /\.schema\(\s*["']tool["']\s*\)\s*\.from\(\s*["']definition["']\s*\)/g;
const POINT = /\.(?:eq|in)\(\s*["'](?:id|name|tool_id|managed_by_server_id)["']|\.single\(\)|\.maybeSingle\(\)|\.limit\(\s*1\s*\)/;
const WRITE = /\.(?:insert|update|upsert|delete)\(/;
const PRAGMA = "catalog-reader-ok:";
// Guard scripts carry planted fixtures (strings), never live reads.
const SKIP = /(^|\/)(node_modules|\.next|__tests__|generated)(\/|$)|\.(test|spec)\.|types\/database\.types\.ts$|^scripts\/check-/;

function statementAround(src, start) {
  const lineStart = src.lastIndexOf("\n", start) + 1;
  const blank = src.lastIndexOf("\n\n", start);
  let back = Math.max(lineStart - 400, blank >= 0 ? blank + 2 : 0);
  const head = src.slice(back, start);
  for (const marker of ["const ", "let ", "await ", "return ", "= "]) {
    const idx = head.lastIndexOf(marker);
    if (idx >= 0) {
      back += idx;
      break;
    }
  }
  const ends = [src.indexOf(";", start), src.indexOf("\n\n", start)].filter((e) => e >= 0);
  const end = ends.length ? Math.min(...ends) : src.length;
  return { text: src.slice(back, end), line: src.slice(0, start).split("\n").length };
}

export function scanSource(src) {
  const hits = [];
  for (const m of src.matchAll(TOOL_DEF)) {
    const { text, line } = statementAround(src, m.index);
    if (text.includes(PRAGMA) || text.includes("source_kind") || POINT.test(text) || WRITE.test(text)) continue;
    hits.push(line);
  }
  return hits;
}

function selfTest() {
  const bad = `const { data } = await supabase\n  .schema("tool")\n  .from("definition")\n  .select("*")\n  .eq("is_active", true);\n`;
  const ok = `const { data } = await supabase.schema("tool").from("definition").select("*").eq("is_active", true).neq("source_kind", "catalog");\nconst one = await supabase.schema("tool").from("definition").select("*").eq("id", id).maybeSingle();\nawait supabase.schema("tool").from("definition").update({ a: 1 }).eq("id", id);\n`;
  const results = [
    ["whole-table read is caught", scanSource(bad).length === 1],
    ["filtered, point and write reads pass", scanSource(ok).length === 0],
  ];
  for (const [name, pass] of results) console.log(`  ${pass ? "ok  " : "FAIL"} ${name}`);
  if (results.some(([, pass]) => !pass)) {
    console.error("self-test FAILED");
    process.exit(1);
  }
  console.log("self-test passed: a planted whole-table read is caught, filtered/point/write reads pass");
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "*.ts", "*.tsx"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\n")
    .filter((f) => f && !SKIP.test(f));
  const violations = [];
  for (const file of files) {
    let src;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (!src.includes("definition")) continue;
    for (const line of scanSource(src)) violations.push(`${file}:${line}`);
  }
  if (violations.length) {
    console.error("Whole-table tool.definition reads must filter catalog Tools (source_kind <> 'catalog'):");
    for (const v of violations) console.error(`  ${v}`);
    console.error(
      "\nFix: add .neq('source_kind', 'catalog'), or for a reviewed exception add '// catalog-reader-ok: <why>'." +
        "\nContract: common-docs/projects/third-party-services/CONTRACT.md §4.",
    );
    process.exit(1);
  }
  console.log("check-tool-catalog-readers: every whole-table tool.definition read filters catalog Tools");
}

main();
