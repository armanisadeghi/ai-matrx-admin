/**
 * THE AGENT BUILD VIEW NEVER POLLS (Agent Studio rebuild, lane 3B).
 *
 * The build page, the progress card and the Factory list each re-read the spine on a 3 s, 3 s and
 * 5 s timer. A run is followed on its event feed and the list on `GET /runs/stream`, so a timer is a
 * wasted request that hides a missing push. This scan refuses `setInterval` and any read of
 * `.from("global_execution")` read in `features/agents/factory/**` (a realtime binding is not a read), except the history readers: `service.ts` (old
 * builds, read once by id or by page) and `overview.ts` (the doors table's counts).
 *
 * It must FAIL on the old code: the old files come out of git into a mktemp dir (never swapped on
 * disk) and are scanned by the same function.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..", "..");
const FACTORY = "features/agents/factory";
/** The last commit before lane 3B: the polling code lives here. */
const OLD_BASE = "224bf2e2cae76920d8d2257e442644f137b9718a";
const HISTORY_READERS = new Set(["service.ts", "overview.ts"]);

export function pollingViolations(files: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [path, text] of Object.entries(files)) {
    const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    if (/\bsetInterval\s*\(/.test(code)) out.push(`${path}: setInterval`);
    if (!HISTORY_READERS.has(path.split("/").pop() ?? "") && /\.from\(\s*["'`]global_execution["'`]/.test(code)) {
      out.push(`${path}: reads global_execution`);
    }
  }
  return out;
}

function walk(dir: string, base: string, into: Record<string, string>) {
  for (const name of readdirSync(dir)) {
    if (name === "__tests__") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, into);
    else if (/\.tsx?$/.test(name)) into[relative(base, full)] = readFileSync(full, "utf8");
  }
}

describe("the agent build view never polls", () => {
  it("has no setInterval and no global_execution read outside the history readers", () => {
    const files: Record<string, string> = {};
    walk(join(ROOT, FACTORY), join(ROOT, FACTORY), files);
    expect(Object.keys(files).length).toBeGreaterThan(5);
    expect(pollingViolations(files)).toEqual([]);
  });

  it("fails on the old code (the pre-3B files, taken out of git into a temp dir)", () => {
    const dir = mkdtempSync(join(tmpdir(), "factory-old-"));
    const paths = [
      `${FACTORY}/components/BuildProgress.tsx`,
      `${FACTORY}/components/FactoryBuildPage.tsx`,
      `${FACTORY}/components/FactoryBuildsPage.tsx`,
    ];
    const files: Record<string, string> = {};
    for (const p of paths) {
      const text = execFileSync("git", ["show", `${OLD_BASE}:${p}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 20_000_000 });
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), text);
      files[p.split("/").pop() as string] = readFileSync(join(dir, p), "utf8");
    }
    const found = pollingViolations(files);
    expect(found.filter((f) => f.endsWith("setInterval")).length).toBe(3);
  });
});
