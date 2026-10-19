// PUBLIC-LAYOUT-PERF (2026-10-19): a page on the light public list (features/public-shell/publicTier.ts
// LIGHT_PREFIXES) renders with NO Redux store and no app Providers. /pricing and /contact were put on
// the list while their page code read Redux (EducationPricing, ProTextarea) and returned 500 in
// production. This walks every light page's STATIC import graph and fails if it reaches react-redux,
// the app store hooks or a Providers-only context. Dynamic import() edges are not followed (they load
// on demand), and the documented on-demand islands (files that call useFullPublicTierWhen /
// requestFull, which gate their store reads behind the full tier) are boundaries, not walked.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { isLightPublicPath } from "@/features/public-shell/publicTier";

const ROOT = join(__dirname, "..", "..");
const PUBLIC_DIR = join(ROOT, "app", "(public)");
const EXTS = [".tsx", ".ts", ".jsx", ".js"];

/** Module specifiers a store-less page must never reach. */
const BANNED_SPECIFIER =
  /^(react-redux|@ai-matrx\/canvas\/react|@\/lib\/redux\/hooks|@\/lib\/redux\/store|@\/providers\/|@\/app\/Providers|@tanstack\/react-query)$|(^|\/)(StoreProvider|CanvasHostProvider|app\/Providers)$/;
/** Store / Providers-context use in a file's own code (comments stripped). */
const BANNED_CALL = /\b(useAppSelector|useAppDispatch|useAppStore|useSelector|useDispatch|useStore|useQueryClient|useQuery)\s*[(<]/;
/** A store-OPTIONAL probe: reading ReactReduxContext tolerates "no store" (useSignedIn does). Not a store read. */
const STORE_OPTIONAL_IMPORT = /import\s*\{\s*ReactReduxContext\s*\}\s*from\s*["']react-redux["']/;
/**
 * Edges the walker would flag that are real but only render for a signed-in visitor, and a signed-in
 * visitor always gets the FULL tier (publicTier.ts). Each needs its reason; a stale entry fails below.
 */
const SIGNED_IN_ONLY_EDGES: Array<{ from: string; to: string; why: string }> = [
  {
    from: "features/comparison/public/SharedComparison.tsx",
    to: "features/comparison/public/SharedActions.tsx",
    why: "RefreshButton renders only when canRefresh = signedIn (server-known) && items; signed-in is full tier",
  },
];
const edgeAllowed = (from: string, to: string) =>
  SIGNED_IN_ONLY_EDGES.some((e) => e.from === relative(ROOT, from) && e.to === relative(ROOT, to));

/** The documented on-demand islands: they ask for the full tier before touching the store. */
const ISLAND = /\b(useFullPublicTierWhen|requestFull)\b/;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** Specifiers of static value imports / re-exports (type-only imports are erased; import() is not matched). */
export function staticEdges(source: string): string[] {
  const src = stripComments(source);
  const out: string[] = [];
  for (const m of src.matchAll(/^\s*(?:import|export)\s+(type\s+)?[^;'"]*?\s*from\s*["']([^"']+)["']/gms)) if (!m[1]) out.push(m[2]!);
  for (const m of src.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) out.push(m[1]!);
  return out;
}

function resolveFile(base: string): string | null {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const e of EXTS) if (existsSync(base + e)) return base + e;
  for (const e of EXTS) if (existsSync(join(base, "index" + e))) return join(base, "index" + e);
  return null;
}

function resolveSpecifier(spec: string, from: string): string | null {
  if (spec.startsWith(".")) return resolveFile(join(dirname(from), spec));
  if (spec.startsWith("@/") || spec.startsWith("@host/")) return resolveFile(join(ROOT, spec.replace(/^@(host)?\//, "")));
  if (spec.startsWith("@components/")) return resolveFile(join(ROOT, "components", spec.slice("@components/".length)));
  return null; // node_modules package: not our code
}

/** Returns "<file>: <reason>" findings reachable statically from `entry`, with the import chain. */
export function findStoreReads(entry: string): string[] {
  const findings: string[] = [];
  const seen = new Set<string>();
  const walk = (file: string, chain: string[]) => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    const here = [...chain, relative(ROOT, file)];
    const code = stripComments(source);
    if (file !== entry && ISLAND.test(code)) return; // on-demand island boundary
    const call = code.match(BANNED_CALL);
    if (call) findings.push(`${here.join(" -> ")} calls ${call[1]}`);
    for (const spec of staticEdges(source)) {
      if (spec === "react-redux" && STORE_OPTIONAL_IMPORT.test(code)) continue;
      if (BANNED_SPECIFIER.test(spec)) {
        findings.push(`${here.join(" -> ")} imports ${spec}`);
        continue;
      }
      const next = resolveSpecifier(spec, file);
      if (next && !edgeAllowed(file, next)) walk(next, here);
    }
  };
  walk(entry, []);
  return findings;
}

/** app/(public)/a/[b]/page.tsx -> /a/x (route groups dropped, dynamic segments filled). */
function pagePath(file: string): string {
  const segs = relative(PUBLIC_DIR, dirname(file)).split(sep).filter(Boolean);
  return "/" + segs.map((s) => (s.startsWith("[") ? "x" : s)).join("/");
}

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? pages(join(dir, d.name)) : d.name === "page.tsx" ? [join(dir, d.name)] : [],
  );
}

const lightPages = pages(PUBLIC_DIR)
  .map((file) => ({ file, path: pagePath(file) }))
  .filter(({ path }) => isLightPublicPath(path));

describe("light public pages never read the Redux store or app Providers at render", () => {
  it("enumerates the light pages (the list is not silently empty)", () => {
    expect(lightPages.length).toBeGreaterThanOrEqual(10);
  });

  it.each(lightPages.map((p) => [p.path, p.file] as const))("%s", (_path, file) => {
    expect(findStoreReads(file)).toEqual([]);
  });

  it.each(SIGNED_IN_ONLY_EDGES)("allowed edge $from -> $to still exists and is still needed", ({ from, to }) => {
    expect(staticEdges(readFileSync(join(ROOT, from), "utf8")).some((s) => resolveSpecifier(s, join(ROOT, from)) === join(ROOT, to))).toBe(true);
    expect(findStoreReads(join(ROOT, to))).not.toEqual([]);
  });

  it("the walker sees a planted store read (proof the check can fail)", () => {
    // /pricing is the production incident: EducationPricing reads the account tier from Redux.
    expect(findStoreReads(join(PUBLIC_DIR, "pricing", "page.tsx")).length).toBeGreaterThan(0);
    expect(staticEdges(`import { useSelector } from "react-redux";\nimport type { X } from "react-redux";`)).toEqual(["react-redux"]);
    expect(BANNED_SPECIFIER.test("@/lib/redux/hooks")).toBe(true);
  });
});
