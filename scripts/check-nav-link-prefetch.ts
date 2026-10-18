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

/** Directories whose every .tsx is navigation chrome or a module's sign-in/landing links. */
const SCOPE_DIRS = [
  "features/shell/",
  "features/marketing/components/shell/",
  "features/auth/components/module-landing/",
  "features/settings/route-menu/",
];

/**
 * Module sub-nav and layout files outside those directories: the sidebar menus a Large Route loads
 * (`*SidebarMenu`, `*RouteMenu`, `*SubNav`, `*ModuleNav`, `*SectionNav`), every `(core)`/`(admin)`
 * route layout, and the Header/Nav/Menu components a route keeps in its own `_components`.
 * Their links render once per sub-page, so a bare Link there prefetches the whole module on load
 * (`/images`: 43 RSC fetches on an empty page; `/user-settings`: ~30).
 */
export function inScope(file: string): boolean {
  if (file.includes("__tests__") || /\.(test|spec)\.tsx$/.test(file) || !file.endsWith(".tsx")) return false;
  if (SCOPE_DIRS.some((d) => file.startsWith(d))) return true;
  if (/(SidebarMenu|RouteMenu|SubNav|ModuleNav|SectionNav)\.tsx$/.test(file)) return true;
  if (/^app\/\((core|admin)\)\/(.+\/)?layout\.tsx$/.test(file)) return true;
  return /^app\/\((core|admin)\)\/.+\/_components\/[^/]*(Header|Nav|Menu)[^/]*\.tsx$/.test(file);
}

/** Opening tags of <Link>/<AppLink> that carry no `prefetch` prop. */
export function findBareLinks(src: string, opts: { forced?: boolean } = {}): number[] {
  const hits: number[] = [];
  // Blank out comments (keep newlines) so prose mentioning <Link> is not a hit.
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (c, p1) => p1 + " ".repeat(c.length - p1.length));
  const re = /<(Link|AppLink|NavLink)(?=[\s/>])/g;
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
    // forced: `prefetch` / `prefetch={true}` turns the viewport prefetch ON for every link in a nav list.
    const forced = /\sprefetch(\s|$|\/|=\{\s*true\s*\}|="true")/.test(tag);
    const bare = !/\sprefetch(=|\s|$|\/)/.test(tag);
    // NavLink already defaults to prefetch off, so only a forced prefetch on it is a hit.
    if (opts.forced ? forced : bare && m[1] !== "NavLink") {
      hits.push(src.slice(0, m.index).split("\n").length);
    }
  }
  return hits;
}

function selfTest(): number {
  const bad = `<Link\n  href={x}\n  className="a"\n>hi</Link>`;
  const good = `<Link href={x} prefetch={false}>hi</Link><NavLink href="/a">x</NavLink>`;
  const scoped = [
    "features/image-manager/components/ImagesSidebarMenu.tsx",
    "features/settings/route-menu/SettingsRouteMenu.tsx",
    "features/auth/components/module-landing/ModuleSignInGate.tsx",
    "app/(core)/images/layout.tsx",
    "app/(core)/images/_components/ImagesListHeader.tsx",
  ].every(inScope);
  const unscoped = !inScope("features/notes/components/NoteCard.tsx") && !inScope("features/shell/x.test.tsx");
  const forcedBad = `<Link href={x} prefetch className="a">hi</Link><NavLink prefetch={true} href="/a">x</NavLink>`;
  const forcedOk = findBareLinks(forcedBad, { forced: true }).length === 2 && findBareLinks(good, { forced: true }).length === 0;
  const ok = forcedOk && findBareLinks(bad).length === 1 && findBareLinks(good).length === 0 && scoped && unscoped;
  console.log(ok ? "self-test ok" : "self-test FAILED");
  return ok ? 0 : 1;
}

function main(): number {
  if (process.argv.includes("--self-test")) return selfTest();
  const files = execFileSync("git", ["ls-files", "*.tsx"], { encoding: "utf8", maxBuffer: 1 << 28 })
    .split("\n")
    .filter((f) => f && inScope(f));
  let bad = 0;
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const line of findBareLinks(src)) {
      console.error(`${f}:${line} link without prefetch control (use NavLink)`);
      bad++;
    }
    for (const line of findBareLinks(src, { forced: true })) {
      console.error(`${f}:${line} link forces viewport prefetch in navigation chrome (drop the prefetch prop)`);
      bad++;
    }
  }
  console.log(bad ? `${bad} violation(s)` : "nav links ok");
  return bad ? 1 : 0;
}

if (process.argv[1]?.endsWith("check-nav-link-prefetch.ts")) exitAfterDrain(main());
