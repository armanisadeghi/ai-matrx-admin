/**
 * check-nav-link-prefetch — guard for THE VIEWPORT PREFETCH STORM.
 *
 * Next's <Link> prefetches its route's RSC the moment it enters the viewport
 * (production only). A shell/sidebar/sub-nav renders dozens of links on every
 * page, so one page load fired dozens of `GET RSC /…` (many twice).
 * `prefetch={false}` keeps hover/focus/touch prefetch but drops the viewport one.
 *
 * Rule: in the nav surfaces below, render links through `NavLink`
 * (components/navigation/NavLink.tsx), or pass an explicit `prefetch=` prop.
 * A bare `<Link>` / `<AppLink>` with no `prefetch` prop fails.
 *
 * Exits non-zero on a violation. `--self-test` proves the detector fails on the
 * original defect and passes on the fix.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { exitAfterDrain } from "./lib/exit-after-drain";

const SCOPES = ["features/shell/", "features/marketing/components/shell/"];

/** Opening tags of <Link>/<AppLink> that carry no `prefetch` prop. */
export function findBareLinks(src: string): number[] {
  const hits: number[] = [];
  // Blank out comments (keep newlines) so prose mentioning <Link> is not a hit.
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (c, p1) => p1 + " ".repeat(c.length - p1.length));
  const re = /<(Link|AppLink)(?=[\s/>])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    let depth = 0;
    let quote = "";
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) { if (c === quote) quote = ""; continue; }
      if (depth > 0 && (c === '"' || c === "'" || c === "`")) { quote = c; continue; }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (depth === 0 && c === ">") break;
    }
    const tag = src.slice(m.index, i);
    if (!/\sprefetch(=|\s|$|\/)/.test(tag)) {
      hits.push(src.slice(0, m.index).split("\n").length);
    }
  }
  return hits;
}

function selfTest(): number {
  const bad = `<Link\n  href={x}\n  className="a"\n>hi</Link>`;
  const good = `<Link href={x} prefetch={false}>hi</Link><NavLink href="/a">x</NavLink>`;
  const ok = findBareLinks(bad).length === 1 && findBareLinks(good).length === 0;
  console.log(ok ? "self-test ok" : "self-test FAILED");
  return ok ? 0 : 1;
}

function main(): number {
  if (process.argv.includes("--self-test")) return selfTest();
  const files = execFileSync("git", ["ls-files", ...SCOPES.map((s) => `${s}*.tsx`)], {
    encoding: "utf8",
  })
    .split("\n")
    .filter((f) => f && !f.includes("__tests__") && !f.endsWith(".test.tsx"));
  let bad = 0;
  for (const f of files) {
    for (const line of findBareLinks(readFileSync(f, "utf8"))) {
      console.error(`${f}:${line} link without prefetch control (use NavLink)`);
      bad++;
    }
  }
  console.log(bad ? `${bad} violation(s)` : "nav links ok");
  return bad ? 1 : 0;
}

exitAfterDrain(main());
