// A SENTENCE A PERSON READS NEVER NAMES AN ACCESS LEVEL IN RAW WORDS (AT-SWEEP-3, 2026-10-19).
// The ladder's words wherever a person reads it are View, Comment, Edit and Full access (common-docs vocabulary;
// @ai-matrx/sharing src/core/levels.ts). RED on the prior bytes: ShareModal said "You need Admin on this ..." and "what the Admin
// level means (viewer < commenter < editor < admin)"; the note summary said "shared at viewer level". GREEN now.
// The package half of this guard lives in aidream apps/shared/records-ui (a-refusal-never-says-a-raw-access-level).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RAW_LEVEL =
  /(viewer|editor|commenter) level\b|needs the admin level|Admin level means|\b(need|needs|with|is) Admin on (it|this)\b|\b[Aa]n admin on this (table|record|base)\b|shared at viewer level|You are (Viewer|Editor|Admin) here/;

export function offendingLines(source: string): string[] {
  return source
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*"));
    })
    .filter((line) => RAW_LEVEL.test(line));
}

const ROOT = process.env.GUARD_ROOT ?? join(__dirname, "..", "..", "..");

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|manifest)\.tsx?$/.test(name)) out.push(p);
  }
}

describe("no frontend sentence names an access level in raw words", () => {
  it("features, components and utils say View, Comment, Edit and Full access", () => {
    const files: string[] = [];
    for (const d of ["features", "components", "utils"]) walk(join(ROOT, d), files);
    const bad: string[] = [];
    for (const f of files) for (const line of offendingLines(readFileSync(f, "utf8"))) bad.push(`${f.slice(ROOT.length + 1)}: ${line.trim().slice(0, 140)}`);
    expect(bad).toEqual([]);
  });

  it("the scan itself can fail: a planted raw-level sentence is caught, the canonical one is not", () => {
    expect(offendingLines('<p>You need Admin on this table</p>')).toHaveLength(1);
    expect(offendingLines("Deciding who else may is what the Admin level means")).toHaveLength(1);
    expect(offendingLines('lines.push("Read-only (shared at viewer level)")')).toHaveLength(1);
    expect(offendingLines("<p>You need Full access on this table</p>")).toEqual([]);
    expect(offendingLines("// the admin level in a comment is not a sentence")).toEqual([]);
  });
});
