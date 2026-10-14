/**
 * Chromium shows an <iframe>'s `title` as a native tooltip anchored to the
 * frame's bounds (not the cursor) whenever the pointer is over its content.
 * A frame's accessible name goes in `aria-label`. This guard fails if any
 * source file puts `title=` on an <iframe> element.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ROOTS = ["features", "components", "app", "lib"];
const SKIP = /node_modules|__tests__|\.test\.|\.spec\.|\.next/;

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.test(p)) continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name)) out.push(p);
  }
}

describe("iframes carry aria-label, never title", () => {
  it("no <iframe ... title=...> in app source", () => {
    const files: string[] = [];
    for (const r of ROOTS) walk(join(process.cwd(), r), files);
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (!src.includes("<iframe")) continue;
      for (const m of src.matchAll(/<iframe\b[^>]*?(?<![-\w])title=/gs)) {
        // stay within the same tag: reject if a `>` closes it first (arrow fns excepted)
        const tag = m[0].replace(/=>/g, "");
        if (tag.includes(">", 1)) continue;
        offenders.push(`${f}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
