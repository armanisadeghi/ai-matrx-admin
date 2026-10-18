/**
 * GUARD (users one-roof, plan attack F2): nothing rendered on /administration/users/<id> may read
 * the person from the address (`useSearchParams().get("user")`). On the record page there is no
 * `?user=`, so a slice that reads it silently shows the unfocused roster / dashboard. Embedded
 * slices take the id as a prop.
 *
 * Walks the static import graph from UserRecordPage.tsx through every file under features/admin/
 * and fails on any reached file that calls useSearchParams AND reads a `user` param.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../../../..");
const ENTRY = path.join(ROOT, "features/admin/users/record/UserRecordPage.tsx");
const FOLLOW_UNDER = path.join(ROOT, "features/admin") + path.sep;

const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
const READS_USER_PARAM = /\.get\(\s*["']user["']\s*\)/;

/** Code without comments (a doc comment naming `get("user")` is not a read). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

function resolve(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function offendersFrom(entry: string): string[] {
  const seen = new Set<string>();
  const offenders: string[] = [];
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const src = fs.readFileSync(file, "utf8");
    const code = stripComments(src);
    if (code.includes("useSearchParams") && READS_USER_PARAM.test(code)) offenders.push(path.relative(ROOT, file));
    for (const m of src.matchAll(IMPORT_RE)) {
      const target = resolve(file, m[1] ?? m[2]);
      if (target && target.startsWith(FOLLOW_UNDER) && !/\.test\.tsx?$/.test(target)) queue.push(target);
    }
  }
  return offenders.sort();
}

describe("user record page slices take the person as a prop", () => {
  it("no component reached from UserRecordPage reads ?user= from the address", () => {
    expect(offendersFrom(ENTRY)).toEqual([]);
  });

  it("the detector catches a file that reads ?user= (self-test)", () => {
    const tmp = fs.mkdtempSync(path.join(ROOT, "features/admin/users/record/__tests__/.guard-"));
    try {
      const bad = path.join(tmp, "Bad.tsx");
      fs.writeFileSync(bad, 'import { useSearchParams } from "next/navigation";\nexport const X = () => useSearchParams().get("user");\n');
      expect(offendersFrom(bad)).toHaveLength(1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
