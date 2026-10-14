/**
 * GUARD - every <pre> and every inline <code> naming `__kind` in the kind
 * registry admin, the shapes studio and the emit template is a DELIBERATE
 * source view and carries data-kind-source="explicit"; otherwise the leak
 * sentinel files it as a red error on the page (brand_basics, 2026-10-14).
 */
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["features/content-ir/admin", "features/content-ir/studio", "features/content-ir/render-paths"];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : files(p);
    return /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

export function unmarkedSourceViews(source: string): string[] {
  const src = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const bad: string[] = [];
  for (const m of src.matchAll(/<pre\b[^>]*>/g)) if (!m[0].includes("data-kind-source")) bad.push(m[0]);
  for (const m of src.matchAll(/<code(?:\s[^>]*)?>(?:(?!<\/code>)[\s\S])*__kind(?:(?!<\/code>)[\s\S])*<\/code>/g)) {
    if (!/^<code\b[^>]*data-kind-source/.test(m[0])) bad.push(m[0].slice(0, 80));
  }
  return bad;
}

describe("admin and studio source views carry data-kind-source", () => {
  it("the checker sees an unmarked pre and code", () => {
    expect(unmarkedSourceViews("<pre className=\"x\">{j}</pre>")).toHaveLength(1);
    expect(unmarkedSourceViews('<code className="x">"__kind"</code>')).toHaveLength(1);
    expect(unmarkedSourceViews('<code data-kind-source="explicit" className="x">"__kind"</code>')).toHaveLength(0);
  });
  it.each(ROOTS.flatMap(files))("%s", (file) => {
    expect(unmarkedSourceViews(fs.readFileSync(file, "utf8"))).toEqual([]);
  });
});
