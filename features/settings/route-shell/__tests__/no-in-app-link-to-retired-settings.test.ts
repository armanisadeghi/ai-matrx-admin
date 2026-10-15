/**
 * The retired /settings/* addresses only redirect on a FULL page load; a client-side <Link> or
 * router.push to one does nothing. Every in-app link points at the real /user-settings page.
 * The scan reads every quote style: "double", 'single' and `template` literals.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RETIRED =
  /["'`]\/settings(\?tab=|\/(profile|voice|integrations|google-workspace|sandbox|sandbox-storage|organizations|feedback|extension|access-requests|preferences)\b)/;
const SKIP_PATH = /__tests__|\.test\.|legacySettingsRedirects|page-cleanup-rows|\/marketing\/|websites\/\[siteId\]/;
const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;
const ROOTS = ["app", "features", "components", "lib", "hooks", "utils", "providers"];

/** True when one source line names a retired settings address inside any kind of string literal. */
export function namesRetiredSettingsAddress(line: string): boolean {
  return !COMMENT_LINE.test(line) && RETIRED.test(line);
}

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(name)) yield p;
  }
}

describe("in-app links to retired settings addresses", () => {
  it("the matcher catches double quotes, single quotes and template literals (planted)", () => {
    expect(namesRetiredSettingsAddress(`router.push("/settings/google-workspace")`)).toBe(true);
    expect(namesRetiredSettingsAddress(`router.push('/settings/google-workspace')`)).toBe(true);
    expect(namesRetiredSettingsAddress("router.push(`/settings/voice`)")).toBe(true);
    expect(namesRetiredSettingsAddress("href={`/settings?tab=profile`}")).toBe(true);
    expect(namesRetiredSettingsAddress(`router.push("/user-settings/voice")`)).toBe(false);
    expect(namesRetiredSettingsAddress(`// "/settings/voice" is retired`)).toBe(false);
  });

  it("none of the app's source names one", () => {
    const hits: string[] = [];
    for (const root of ROOTS) {
      const dir = join(process.cwd(), root);
      try { statSync(dir); } catch { continue; }
      for (const file of walk(dir)) {
        if (SKIP_PATH.test(file)) continue;
        readFileSync(file, "utf8").split("\n").forEach((line, i) => {
          if (namesRetiredSettingsAddress(line)) hits.push(`${file}:${i + 1}:${line.trim()}`);
        });
      }
    }
    expect(hits).toEqual([]);
  });
});
