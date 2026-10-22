/**
 * An address rewrite (UUID segment -> slug/key segment) never reloads the page.
 *
 * `router.replace` is a navigation: the server components under the layout render again and,
 * between the two renders, the page shows nothing. On 2026-10-22 (lane CLOSE-PAY, CD-PAY-01)
 * /organizations/<uuid>/settings/payments painted its Stripe badge at 1.6 s, went blank at
 * 2.5 s when the address became /organizations/ashford-labs/…, and painted it again at 3.0 s.
 * The page is the same page; only the address changes, so the rewrite is
 * `window.history.replaceState` (Next.js syncs usePathname with it, and nothing re-renders).
 *
 * The class: every component that rewrites its own address through a canonicalize*Path helper.
 * Found by search, so a third canonicalizer is held to the same rule without being listed here.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "../../../..");
const SKIP = new Set(["node_modules", ".next", ".wt", "__tests__", "tmp"]);

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if (name.endsWith(".tsx") && !name.includes(".test.")) out.push(path);
  }
}

function addressRewriters(): string[] {
  const files: string[] = [];
  for (const top of ["features", "app", "components"]) walk(join(ROOT, top), files);
  return files.filter((f) => /\bcanonicalize[A-Za-z]*Path\(/.test(readFileSync(f, "utf8")));
}

describe("an address rewrite never reloads the page", () => {
  const rewriters = addressRewriters();

  it("finds the address rewriters (the search itself works)", () => {
    const names = rewriters.map((f) => relative(ROOT, f));
    expect(names).toEqual(
      expect.arrayContaining([
        "features/scopes/components/pages/ScopeAddressCanonicalizer.tsx",
        "features/marketing/components/brand/CanonicalSegment.tsx",
      ]),
    );
  });

  it("rewrites with history.replaceState, never a router navigation", () => {
    const offenders = rewriters
      .filter((f) => {
        const src = readFileSync(f, "utf8").replace(/^\s*(\/\/|\*).*$/gm, "");
        return /\brouter\.(replace|push)\(/.test(src) || !/window\.history\.replaceState\(/.test(src);
      })
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
