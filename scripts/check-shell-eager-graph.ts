#!/usr/bin/env npx tsx
/**
 * check-shell-eager-graph.ts — WHAT EVERY SIGNED-IN ROUTE DOWNLOADS BEFORE IT HYDRATES.
 *
 * Turbopack gives each layout ONE merged client chunk group: every client reference the layout's
 * SERVER graph reaches, plus the static client graph under each of them. Every <script async> in
 * the head of every (core) route comes from that group. On 2026-10-08 it was ~276 chunks /
 * 25.4 MB decoded on /notes, including a 2.2 MB Babel compiler (@babel/standalone via
 * @ai-matrx/code-runtime) that no shell surface uses until a person opens a code block or a
 * stored component.
 *
 * The model this guard computes (verified against the live deploy's chunk lists, lane AE):
 *   1. SERVER walk from the shell layouts: static AND `import()` edges, resolved with the
 *      react-server conditions. A module whose first statement is "use client" is a CLIENT
 *      REFERENCE: it is recorded and not descended. An `import()` in a SERVER module of a client
 *      module is still a client reference — Turbopack has no async boundary on the server side
 *      (route-menu-registry.ts's menus all ship eagerly for this reason).
 *   2. CLIENT walk from every client reference: static edges only (`import()` / next/dynamic /
 *      React.lazy / lazyOverlay are real async chunks on the client), resolved with the browser
 *      conditions and next.config.js's turbopack.resolveAlias (the chat registration profile
 *      alias is where Babel came in).
 * Imports are read from esbuild's TRANSFORMED output, so type-only and unused imports are erased
 * exactly as SWC erases them.
 *
 * Three eager sets are walked (SCOPES): `core` (every signed-in route), `public` (marketing,
 * legal, share pages — a signed-out guest's first load) and `root` (app/layout.tsx alone: what
 * even /login downloads). A HEAVY module in ANY of them fails, unless its entry is ADVISORY —
 * reported by name on every run, not yet blocking (see `advisory` on the entry).
 *
 * Usage:
 *   pnpm check:shell-eager-graph              # fail if a blocking HEAVY module is in any eager set
 *   pnpm check:shell-eager-graph --why <substr> [--scope core|public|root]  # the import chain to a module
 *   pnpm check:shell-eager-graph --report [--scope …]  # biggest packages in the eager set(s)
 *   pnpm check:shell-eager-graph --self-test  # proves the guard goes red on a planted edge
 */
import { readFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { builtinModules } from "node:module";
import { join, resolve, dirname, extname } from "node:path";
import { tmpdir } from "node:os";
import * as esbuild from "esbuild";

const ROOT = resolve(__dirname, "..");

/** The shell: every (core) route renders these two layouts. */
const SHELL_ENTRIES = ["app/layout.tsx", "app/(core)/layout.tsx"];

/**
 * Every eager set this guard holds to the HEAVY list. `root` is the floor every route pays
 * (/login included); `public` is a signed-out guest's (privacy policy, share pages); `core` is the
 * signed-in shell. Each is walked on its own because a module can be eager in one and not another.
 */
export const SCOPES: Readonly<Record<string, readonly string[]>> = {
  core: SHELL_ENTRIES,
  public: ["app/layout.tsx", "app/(public)/layout.tsx"],
  root: ["app/layout.tsx"],
};

/**
 * HEAVY: loaded only when a person uses the feature, never by the shell. A match is a module path
 * substring (node_modules paths are matched after the last `node_modules/`).
 */
export type HeavyEntry = {
  match: RegExp;
  why: string;
  /**
   * Set ⇒ REPORTED on every run (named, with its chain) but not failing. Only for a module a
   * campaign is still closing gateway by gateway, where blocking would turn main red before the
   * last gateway lands. Remove it the day the module leaves every eager set — then it blocks.
   */
  advisory?: string;
};

/** The 2026-10-13 "every page drags ~18 MB" campaign: these leave first load only when EVERY gateway closes. */
const GATEWAY_CAMPAIGN =
  "advisory until the 2026-10-13 first-load campaign closes its last gateway (records-ui / recharts / data-table are reached by ~10 independent gateways from app/layout.tsx, app/Providers.tsx and the (core) AppShell)";

export const HEAVY: ReadonlyArray<HeavyEntry> = [
  { match: /^@babel\/standalone\//, why: "Babel compiler (2.2 MB) — code blocks, stored components, Applets" },
  { match: /^@ai-matrx\/code-runtime\/dist\/(index|frame|transform)\.js$/, why: "code-runtime compiler entries (carry Babel)" },
  { match: /^@ai-matrx\/applets\/dist\/frame\.js$/, why: "Applet frame (carries the compiler)" },
  { match: /^monaco-editor\//, why: "Monaco editor" },
  { match: /^@monaco-editor\//, why: "Monaco editor loader" },
  { match: /^mermaid\//, why: "Mermaid diagrams" },
  { match: /^three\//, why: "three.js" },
  { match: /^xlsx\//, why: "SheetJS" },
  { match: /^pdfjs-dist\//, why: "PDF.js" },
  { match: /^katex\//, why: "KaTeX (~680 KB) — markdown math, loaded with @ai-matrx/print/markdown on first use" },
  // BUNDLE-3: the first load carries only the generated surface INDEX; manifest bodies load lazily.
  { match: /^features\/surfaces\/manifests\/(registry|.*\.manifest)\.tsx?$/, why: "surface manifest bodies (~600 KB gzip) — the shell reads the generated index; bodies load per surface" },
  { match: /^@ai-matrx\/chat\/dist\/surfaces\/manifests\/(?!_baseline).*\.manifest\.js$/, why: "package surface manifest bodies — loaded with the app registry, never by the shell" },
  { match: /^@ai-matrx\/records-ui\/dist\/index\.js$/, why: "records-ui root (the whole records grid/forms cluster) — import a pure subpath, or load it at the point of use", advisory: GATEWAY_CAMPAIGN },
  { match: /^recharts\//, why: "recharts — charts load with the surface that draws them", advisory: GATEWAY_CAMPAIGN },
  { match: /^@ai-matrx\/design-system\/dist\/data-table\/index\.js$/, why: "design-system data-table index (MatrxDataTable and every grid feature)", advisory: GATEWAY_CAMPAIGN },
];

/** next.config.js turbopack.resolveAlias, for the production (non-demos) profile. Kept in sync
 *  by `assertAliasesMatchConfig` — a changed alias in next.config.js fails this guard by name. */
const ALIASES: Record<string, string> = {
  "@/providers/chatUiRegistrationProfile":
    process.env.MATRX_PROFILE === "demos" ? "@/providers/chatUiRegistrationBase" : "@/providers/chatUiRegistration",
  "@ai-matrx/kit/text": "@/lib/compat/kit-text",
  "@ai-matrx/kit/json-extract": "@ai-matrx/content-ir/json-extract",
  jspdf: "jspdf/dist/jspdf.es.min.js",
};

function assertAliasesMatchConfig(): void {
  const cfg = readFileSync(join(ROOT, "next.config.js"), "utf8");
  const needles = [
    `: "./providers/chatUiRegistration.ts"`,
    `"@ai-matrx/kit/text": "./lib/compat/kit-text.ts"`,
    `"@ai-matrx/kit/json-extract": "@ai-matrx/content-ir/json-extract"`,
    `jspdf: "jspdf/dist/jspdf.es.min.js"`,
  ];
  const missing = needles.filter((n) => !cfg.includes(n));
  if (missing.length) {
    console.error(
      `check:shell-eager-graph: next.config.js turbopack.resolveAlias changed — update ALIASES in this script.\n  missing: ${missing.join("\n  missing: ")}`,
    );
    process.exit(2);
  }
}

const CODE = /\.(m?[jt]sx?|cjs)$/;
const USE_CLIENT = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/;
const STATIC_RE = /(?:^|\n)(?:import|export)\b([^"';]*?)\bfrom\s*["']([^"'\n]+)["']|(?:^|\n)import\s*["']([^"'\n]+)["']/g;
const DYNAMIC_RE = /\bimport\(\s*["']([^"'\n]+)["']\s*\)/g;
const REQUIRE_RE = /\brequire\(\s*["']([^"'\n]+)["']\s*\)/g;
const BUILTINS = new Set(builtinModules);

type Kind = "static" | "dynamic";
type Spec = { spec: string; kind: Kind };

const specCache = new Map<string, Spec[]>();

/**
 * At most this many esbuild transforms in flight. Unbounded, the walk queued every frontier
 * file's transform at once and the esbuild service grew past 7 GB on the core set — it was
 * OOM-killed ("The service was stopped") on a 16 GB machine shared with a build (2026-10-13).
 */
const TRANSFORM_SLOTS = 4;
function slots(size: number) {
  let busy = 0;
  const queue: Array<() => void> = [];
  return async <T,>(work: () => Promise<T>): Promise<T> => {
    if (busy >= size) await new Promise<void>((r) => queue.push(r));
    busy++;
    try {
      return await work();
    } finally {
      busy--;
      queue.shift()?.();
    }
  };
}
const withTransformSlot = slots(TRANSFORM_SLOTS);
/** Same reason for resolves: a whole frontier's specifiers were in flight at once. */
const withResolveSlot = slots(64);
async function importsOf(file: string): Promise<{ specs: Spec[]; client: boolean }> {
  let src: string;
  try {
    src = readFileSync(file, "utf8");
  } catch {
    return { specs: [], client: false };
  }
  const client = USE_CLIENT.test(src);
  const hit = specCache.get(file);
  if (hit) return { specs: hit, client };
  const ext = extname(file);
  const loader: esbuild.Loader =
    ext === ".ts" || ext === ".mts" || ext === ".cts" ? "ts" : ext === ".tsx" ? "tsx" : "jsx";
  let code = src;
  try {
    code = (await withTransformSlot(() => esbuild.transform(src, { loader, format: "esm", jsx: "automatic", target: "esnext" }))).code;
  } catch {
    // Unparseable as JSX (rare package build): scan the raw text.
  }
  const specs: Spec[] = [];
  for (const m of code.matchAll(STATIC_RE)) specs.push({ spec: (m[2] ?? m[3])!, kind: "static" });
  for (const m of code.matchAll(REQUIRE_RE)) specs.push({ spec: m[1]!, kind: "static" });
  for (const m of code.matchAll(DYNAMIC_RE)) specs.push({ spec: m[1]!, kind: "dynamic" });
  specCache.set(file, specs);
  return { specs, client };
}

/** A long-lived esbuild resolver (exact package `exports`/conditions + tsconfig paths). */
async function makeResolver(side: "server" | "client") {
  let api: esbuild.PluginBuild | null = null;
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  let ready!: () => void;
  const isReady = new Promise<void>((r) => (ready = r));
  const build = esbuild.build({
    stdin: { contents: 'import "__keepalive__"', resolveDir: ROOT },
    bundle: true,
    write: false,
    logLevel: "silent",
    tsconfig: join(ROOT, "tsconfig.json"),
    platform: side === "server" ? "node" : "browser",
    conditions: side === "server" ? ["react-server", "node", "import", "default"] : ["browser", "import", "default"],
    mainFields: side === "server" ? ["module", "main"] : ["browser", "module", "main"],
    plugins: [
      {
        name: "keepalive",
        setup(b) {
          api = b;
          b.onResolve({ filter: /^__keepalive__$/ }, () => ({ path: "k", namespace: "keepalive" }));
          b.onLoad({ filter: /.*/, namespace: "keepalive" }, async () => {
            ready();
            await held;
            return { contents: "" };
          });
        },
      },
    ],
  });
  await isReady;
  const cache = new Map<string, string | null>();
  return {
    async resolve(spec: string, importer: string, kind: Kind): Promise<string | null> {
      const aliased = ALIASES[spec] ?? spec;
      if (aliased.startsWith("node:") || BUILTINS.has(aliased.split("/")[0]!)) return null;
      const dir = dirname(importer);
      const key = `${dir}\0${aliased}`;
      if (cache.has(key)) return cache.get(key)!;
      const r = await withResolveSlot(() =>
        api!.resolve(aliased, {
          kind: kind === "dynamic" ? "dynamic-import" : "import-statement",
          importer,
          resolveDir: dir,
        }),
      );
      const out = r.errors.length || r.external || !CODE.test(r.path) ? null : r.path;
      cache.set(key, out);
      return out;
    },
    async close() {
      release();
      await build.catch(() => undefined);
    },
  };
}

type Graph = { parent: Map<string, string | null>; clientRefs: Set<string>; importers: Map<string, Set<string>> };

export async function eagerClientSet(entries: string[] = SHELL_ENTRIES): Promise<Graph> {
  const server = await makeResolver("server");
  const client = await makeResolver("client");
  try {
    const parent = new Map<string, string | null>();
    const clientRefs = new Set<string>();
    const importers = new Map<string, Set<string>>();
    const link = (from: string, to: string) => {
      let set = importers.get(to);
      if (!set) importers.set(to, (set = new Set()));
      set.add(from);
    };
    // 1. server walk
    const seenServer = new Set<string>();
    let frontier = entries.map((e) => join(ROOT, e));
    for (const f of frontier) seenServer.add(f);
    const serverParent = new Map<string, string | null>(frontier.map((f) => [f, null]));
    while (frontier.length) {
      const next: string[] = [];
      await Promise.all(
        frontier.map(async (file) => {
          const { specs } = await importsOf(file);
          const targets = await Promise.all(specs.map(({ spec, kind }) => server.resolve(spec, file, kind)));
          for (const to of targets) {
            if (to) link(file, to);
            if (!to || seenServer.has(to)) continue;
            seenServer.add(to);
            serverParent.set(to, file);
            const { client: isClient } = await importsOf(to);
            if (isClient) clientRefs.add(to);
            else next.push(to);
          }
        }),
      );
      frontier = next;
    }
    // 2. client walk (static edges only)
    for (const ref of clientRefs) {
      let p: string | null = ref;
      // carry the server chain for --why
      const chain: string[] = [];
      while (p) {
        chain.push(p);
        p = serverParent.get(p) ?? null;
      }
      for (let i = chain.length - 1; i >= 0; i--) if (!parent.has(chain[i]!)) parent.set(chain[i]!, chain[i + 1] ?? null);
    }
    frontier = [...clientRefs];
    while (frontier.length) {
      const next: string[] = [];
      await Promise.all(
        frontier.map(async (file) => {
          const { specs } = await importsOf(file);
          const targets = await Promise.all(
            specs.filter((s) => s.kind === "static").map(({ spec, kind }) => client.resolve(spec, file, kind)),
          );
          for (const to of targets) {
            if (to) link(file, to);
            if (!to || parent.has(to)) continue;
            parent.set(to, file);
            next.push(to);
          }
        }),
      );
      frontier = next;
    }
    // server-only modules are not shipped: drop them from the shipped set, keep them as chain links
    return { parent, clientRefs, importers };
  } finally {
    await server.close();
    await client.close();
  }
}

const rel = (p: string) => p.replace(ROOT + "/", "");
const pkgPath = (p: string) => {
  const i = p.lastIndexOf("node_modules/");
  return i >= 0 ? p.slice(i + "node_modules/".length) : rel(p);
};
const pkgName = (p: string) => {
  const i = p.lastIndexOf("node_modules/");
  if (i < 0) return "(app)";
  const parts = p.slice(i + 13).split("/");
  return parts[0]!.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0]!;
};
function chainTo(g: Graph, file: string): string[] {
  const out: string[] = [];
  let p: string | null = file;
  while (p) {
    out.push(pkgPath(p));
    p = g.parent.get(p) ?? null;
  }
  return out.reverse();
}

export type HeavyHit = { file: string; why: string; advisory?: string };

export function heavyHits(g: Graph): HeavyHit[] {
  const hits: HeavyHit[] = [];
  for (const f of g.parent.keys()) {
    const p = pkgPath(f);
    for (const h of HEAVY)
      if (h.match.test(p)) hits.push({ file: f, why: h.why, ...(h.advisory ? { advisory: h.advisory } : {}) });
  }
  return hits;
}

const blocking = (hits: HeavyHit[]) => hits.filter((h) => !h.advisory);

async function selfTest(): Promise<void> {
  // A planted client module that statically imports the Babel compiler, reached from a planted
  // SERVER module through an `import()` (the route-menu-registry shape) — must go RED. The same
  // edge from a CLIENT module's `import()` is a real async chunk — must stay GREEN.
  // Planted files must live INSIDE the repo (bare-package resolution walks up to node_modules) but
  // never where git tracks them: `.cache/` is gitignored, so an interrupted run leaves no junk on main.
  mkdirSync(join(ROOT, ".cache"), { recursive: true });
  const dir = mkdtempSync(join(ROOT, ".cache", "eager-selftest-"));
  try {
    writeFileSync(join(dir, "heavy.tsx"), `"use client";\nimport { compileSource } from "@ai-matrx/code-runtime";\nexport default function H(){ return String(compileSource); }\n`);
    writeFileSync(join(dir, "server-registry.ts"), `export const load = () => import("./heavy");\n`);
    writeFileSync(join(dir, "client-lazy.tsx"), `"use client";\nexport const load = () => import("./heavy");\nexport default function C(){ return null; }\n`);
    writeFileSync(join(dir, "red.tsx"), `import "./server-registry";\nexport default function L(){ return null; }\n`);
    writeFileSync(join(dir, "green.tsx"), `import C from "./client-lazy";\nexport default function L(){ return <C/>; }\n`);
    // An ADVISORY entry is seen and reported, but does not block.
    writeFileSync(join(dir, "chart.tsx"), `"use client";\nimport { LineChart } from "recharts";\nexport default function Ch(){ return String(LineChart); }\n`);
    writeFileSync(join(dir, "advisory.tsx"), `import Ch from "./chart";\nexport default function L(){ return <Ch/>; }\n`);
    const red = heavyHits(await eagerClientSet([rel(join(dir, "red.tsx"))]));
    const green = heavyHits(await eagerClientSet([rel(join(dir, "green.tsx"))]));
    const advisory = heavyHits(await eagerClientSet([rel(join(dir, "advisory.tsx"))]));
    const ok =
      blocking(red).some((h) => /babel/.test(h.file)) &&
      green.length === 0 &&
      advisory.some((h) => /recharts/.test(h.file)) &&
      blocking(advisory).length === 0;
    console.log(`self-test: planted server import() → ${blocking(red).length} blocking hit(s) (want >0); client import() → ${green.length} (want 0); planted recharts → ${advisory.length} advisory / ${blocking(advisory).length} blocking (want >0 / 0)`);
    if (!ok) {
      console.error("self-test FAILED — the guard cannot see the class it exists for");
      process.exit(1);
    }
    console.log("self-test passed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function sizeOf(g: Graph): { bytes: number; byPkg: Map<string, number> } {
  let bytes = 0;
  const byPkg = new Map<string, number>();
  for (const f of g.parent.keys()) {
    let s = 0;
    try {
      s = readFileSync(f).length;
    } catch {}
    bytes += s;
    byPkg.set(pkgName(f), (byPkg.get(pkgName(f)) ?? 0) + s);
  }
  return { bytes, byPkg };
}

async function main(): Promise<void> {
  // The esbuild service is a Go process started on first use: cap its heap (it inherits env).
  process.env.GOMEMLIMIT ??= "1GiB";
  const args = process.argv.slice(2);
  assertAliasesMatchConfig();
  if (args.includes("--self-test")) return selfTest();
  const scopeIdx = args.indexOf("--scope");
  const only = scopeIdx >= 0 ? args[scopeIdx + 1] : undefined;
  if (only !== undefined && !SCOPES[only]) {
    console.error(`--scope must be one of: ${Object.keys(SCOPES).join(", ")}`);
    process.exit(2);
  }
  const whyIdx = args.indexOf("--why");
  // --why reads one set; default to the signed-in shell, as before.
  const scopes = only ? [only] : whyIdx >= 0 ? ["core"] : Object.keys(SCOPES);
  let failed = 0;
  for (const scope of scopes) {
    const t0 = Date.now();
    const g = await eagerClientSet([...SCOPES[scope]!]);
    const { bytes, byPkg } = sizeOf(g);
    console.log(
      `\n[${scope}] eager set: ${g.clientRefs.size} client references, ${g.parent.size} modules, ${(bytes / 1e6).toFixed(1)} MB source (${((Date.now() - t0) / 1000).toFixed(0)}s)`,
    );
    if (whyIdx >= 0) {
      const needle = args[whyIdx + 1] ?? "";
      const target = [...g.parent.keys()].find((f) => pkgPath(f).includes(needle));
      if (!target) console.log(`"${needle}" is not in the [${scope}] eager set`);
      else {
        console.log(chainTo(g, target).join("\n  -> "));
        const eagerImporters = [...(g.importers.get(target) ?? [])].filter((f) => g.parent.has(f));
        console.log(`\nevery eager importer of ${pkgPath(target)}:\n  ${eagerImporters.map(pkgPath).join("\n  ")}`);
      }
      continue;
    }
    if (args.includes("--report")) {
      for (const [n, sz] of [...byPkg].sort((a, b) => b[1] - a[1]).slice(0, 40))
        console.log(`${(sz / 1e3).toFixed(0).padStart(8)} KB  ${n}`);
    }
    const hits = heavyHits(g);
    const hard = blocking(hits);
    const soft = hits.filter((h) => h.advisory);
    // One line per advisory module (the chain to its first eager importer), never a wall.
    const seenWhy = new Set<string>();
    const reasons = new Set<string>();
    for (const h of soft) {
      if (seenWhy.has(h.why)) continue;
      seenWhy.add(h.why);
      reasons.add(h.advisory!);
      console.warn(`  ADVISORY [${scope}] ${h.why}\n    ${chainTo(g, h.file).join("\n    -> ")}`);
    }
    for (const r of reasons) console.warn(`  (not blocking: ${r})`);
    if (hard.length) {
      failed += hard.length;
      console.error(`\nFAIL [${scope}]: ${hard.length} heavy module(s) load on EVERY route in this set:`);
      for (const h of hard) console.error(`\n  ${h.why}\n    ${chainTo(g, h.file).join("\n    -> ")}`);
    } else {
      console.log(`OK [${scope}]: no blocking heavy module in the eager client set${soft.length ? ` (${seenWhy.size} advisory reported above)` : ""}`);
    }
  }
  if (failed) {
    console.error(
      "\nMove the edge behind a client-side import() at the point of use (code-splitting skill, rule 3: one edge, at the edge).",
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
