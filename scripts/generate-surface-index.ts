/**
 * THE SURFACE INDEX GENERATOR + GUARD (BUNDLE-3).
 *
 * The browser's first load carries only the surface INDEX (`@ai-matrx/chat`
 * `SurfaceIndexEntry`: delivery fields of every surface); each manifest's BODY
 * (descriptions, groups, write targets, client tools, roles) loads lazily.
 * This script writes the compact index from the full registry, and checks it.
 *
 *   pnpm generate:surface-index        # write features/surfaces/manifests/generated/surface-index.generated.ts
 *   pnpm check:surface-index           # fail on any field-level drift, a broken budget, or a stale file
 *   pnpm check:surface-index --self-test   # prove the check goes RED on a one-value edit, then GREEN
 *
 * The check resolves the GENERATED index exactly as the browser does
 * (`createIndexedSurfaceSource`) and compares every indexed field of every
 * surface against the full registry's projection (`toSurfaceIndexEntry`) —
 * resolved values (inherited + baselines, provenance, groupKey), raw authored
 * value names, client-tool names, ancestry and children. Importing the full
 * registry also runs its registry-level assertions (reserved names, executor)
 * at build time.
 *
 * Step 2 (one body file per surface): it also writes the BODY LOADER MAP
 * (`generated/surface-body-loaders.generated.ts`: surfaceName → its own
 * manifest file plus its parent chain's, as dynamic imports; export names
 * read from registry.ts's imports) and checks that EVERY loader's body,
 * resolved through `resolveSurfaceChain`, equals the full registry's
 * resolved and raw manifest. The self-test cuts one parent out of one chain
 * and must go RED.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import {
  createIndexedSurfaceSource,
  encodeSurfaceIndex,
  toSurfaceIndexEntry,
  type EncodedSurface,
} from "@ai-matrx/chat/surfaces/runtime/registry";
import { BASELINE_VALUES } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import type { SurfaceManifest } from "@ai-matrx/chat/surfaces/types";
import { MAX_INHERITANCE_DEPTH, resolveSurfaceChain } from "@/features/surfaces/manifests/surface-declaration-registry";
import {
  RAW_MANIFESTS,
  getAllManifests,
  getManifest,
  getRawManifest,
  getSurfaceAncestry,
  getSurfaceChildren,
} from "@/features/surfaces/manifests/registry";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const OUT = join(ROOT, "features/surfaces/manifests/generated/surface-index.generated.ts");
const LOADERS_OUT = join(ROOT, "features/surfaces/manifests/generated/surface-body-loaders.generated.ts");
const REGISTRY_FILE = join(ROOT, "features/surfaces/manifests/registry.ts");

/** Where one authored manifest lives: registry.ts's import specifier + export name. */
type ManifestSource = { spec: string; exportName: string };
type ChainLoader = (surfaceName: string) => Promise<readonly SurfaceManifest[]>;

function importSpec(spec: string): string {
  return spec.startsWith("./") ? `@/features/surfaces/manifests/${spec.slice(2)}` : spec;
}

/** surfaceName → the file + export registry.ts imports it from (every RAW manifest, or RED). */
async function manifestSources(): Promise<Map<string, ManifestSource>> {
  const text = readFileSync(REGISTRY_FILE, "utf8");
  const wanted = new Set(RAW_MANIFESTS.map((m) => m.surfaceName));
  const out = new Map<string, ManifestSource>();
  for (const [, names, spec] of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"([^"]+)";/g)) {
    if (!/\.manifest$/.test(spec)) continue;
    const mod = (await import(importSpec(spec))) as Record<string, unknown>;
    for (const part of names.split(",")) {
      const exportName = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0];
      const value = exportName ? (mod[exportName] as { surfaceName?: unknown } | undefined) : undefined;
      const name = typeof value?.surfaceName === "string" ? value.surfaceName : null;
      if (name && wanted.has(name) && !out.has(name)) out.set(name, { spec, exportName });
    }
  }
  const missing = [...wanted].filter((n) => !out.has(n));
  if (missing.length) {
    throw new Error(`no import in registry.ts names these manifests (author each in its own *.manifest.ts and import it): ${missing.join(", ")}`);
  }
  return out;
}

function chainOf(surfaceName: string): string[] {
  return [...getSurfaceAncestry(surfaceName), surfaceName];
}

// THE FRAGMENTATION LAW (code-splitting skill, rule 3), measured 2026-10-16: one `import()` per
// surface (263 lazy edges) cost the production build +8.9 GB peak memory (49.2 -> 40.3 GB) and
// ~540 server chunks against one shared edge. The bodies are split into BODY_BUCKETS lazily
// loaded groups instead: a page still fetches only its own small group, and the build pays for
// BODY_BUCKETS edges, never one per surface. Raise the count only with a measured reason.
const BODY_BUCKETS = 16;
const BUCKET_DIR = join(ROOT, "features/surfaces/manifests/generated/surface-body-buckets");

function bucketOf(spec: string): number {
  let h = 2166136261;
  for (const ch of spec) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h % BODY_BUCKETS;
}
const bucketFile = (b: number) => `bucket-${String(b).padStart(2, "0")}.generated.ts`;
const bucketFn = (b: number) => `bucket${String(b).padStart(2, "0")}`;

type RenderedLoaders = { loaders: string; buckets: Map<string, string> };

function renderLoaders(sources: ReadonlyMap<string, ManifestSource>): RenderedLoaders {
  // Every distinct (file, export) gets one stable alias inside its bucket.
  const aliasOf = new Map<string, { bucket: number; alias: string }>();
  const bucketLines = new Map<number, string[]>();
  const fromBucketDir = (spec: string) => (spec.startsWith("./") ? `../../${spec.slice(2)}` : spec);
  for (const m of RAW_MANIFESTS) {
    const src = sources.get(m.surfaceName)!;
    const key = `${src.spec}#${src.exportName}`;
    if (aliasOf.has(key)) continue;
    const bucket = bucketOf(src.spec);
    const alias = `s${aliasOf.size}`;
    aliasOf.set(key, { bucket, alias });
    const lines = bucketLines.get(bucket) ?? [];
    lines.push(`export { ${src.exportName} as ${alias} } from ${JSON.stringify(fromBucketDir(src.spec))};`);
    bucketLines.set(bucket, lines);
  }
  const header =
    "// GENERATED by scripts/generate-surface-index.ts — never edit by hand.\n" +
    "// One of the lazily loaded surface-body groups (BODY_BUCKETS); pnpm check:surface-index proves them.\n";
  const buckets = new Map<string, string>();
  for (const [b, lines] of [...bucketLines].sort((a, z) => a[0] - z[0])) buckets.set(bucketFile(b), header + lines.join("\n") + "\n");

  const used = [...bucketLines.keys()].sort((a, z) => a - z);
  const loaderFns = used
    .map((b) => `const ${bucketFn(b)} = () => import("./surface-body-buckets/${bucketFile(b).replace(/\.ts$/, "")}");`)
    .join("\n");
  const lines = RAW_MANIFESTS.map((m) => {
    const parts = chainOf(m.surfaceName).map((n) => {
      const src = sources.get(n)!;
      const { bucket, alias } = aliasOf.get(`${src.spec}#${src.exportName}`)!;
      return `${bucketFn(bucket)}().then((m) => m.${alias})`;
    });
    return `  ${JSON.stringify(m.surfaceName)}: () => Promise.all([${parts.join(", ")}]),`;
  });
  const loaders =
    "// GENERATED by scripts/generate-surface-index.ts — never edit by hand.\n" +
    `// Each surface's body = its own manifest plus its parent chain's (ROOT FIRST), loaded from ${BODY_BUCKETS}\n` +
    "// lazily loaded groups — never one import() per surface (THE FRAGMENTATION LAW).\n" +
    "// pnpm generate:surface-index rewrites it; pnpm check:surface-index proves every body.\n" +
    'import type { SurfaceManifest } from "@ai-matrx/chat/surfaces/types";\n\n' +
    loaderFns +
    "\n\nexport const SURFACE_BODY_LOADERS: Readonly<Record<string, () => Promise<readonly SurfaceManifest[]>>> = {\n" +
    lines.join("\n") +
    "\n};\n";
  return { loaders, buckets };
}

/** Chains loaded straight from the sources map (the write path and the self-test). */
function loaderFromSources(sources: ReadonlyMap<string, ManifestSource>, chain = chainOf): ChainLoader {
  return async (surfaceName) =>
    Promise.all(
      chain(surfaceName).map(async (n) => {
        const src = sources.get(n)!;
        const mod = (await import(importSpec(src.spec))) as Record<string, SurfaceManifest>;
        return mod[src.exportName];
      }),
    );
}

/** Every loader's resolved body equals the full registry's (resolved and raw). */
export async function compareBodies(load: ChainLoader): Promise<string[]> {
  const problems: string[] = [];
  for (const full of getAllManifests()) {
    const name = full.surfaceName;
    let record;
    try {
      record = resolveSurfaceChain(await load(name));
    } catch (error) {
      problems.push(`${name}: body loader failed — ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (!record) {
      problems.push(`${name}: body loader resolved nothing`);
      continue;
    }
    if (stable(record.body) !== stable(full)) problems.push(`${name}: loaded body ≠ registry's resolved manifest`);
    if (stable(record.raw) !== stable(getRawManifest(name))) problems.push(`${name}: loaded raw ≠ registry's authored manifest`);
  }
  return problems;
}
/**
 * The first-load budget for the index module, gzip bytes. Raised 50 -> 64 KiB on 2026-10-22: surface
 * declarations W2 added ~80 page surfaces (308 -> ~390), which put the index at ~57 KiB gzip.
 * Shrinking the encoding is the next step if it nears this line again.
 */
const INDEX_BUDGET_GZIP = 64 * 1024;

function render(encoded: readonly EncodedSurface[]): string {
  return (
    "// GENERATED by scripts/generate-surface-index.ts — never edit by hand.\n" +
    "// pnpm generate:surface-index rewrites it; pnpm check:surface-index guards it.\n" +
    'import type { EncodedSurface } from "@ai-matrx/chat/surfaces/runtime/registry";\n\n' +
    // One surface per line: workers editing different manifests at once each
    // commit only their own line (a single-line file could not be split).
    "export const SURFACE_INDEX: readonly EncodedSurface[] = [\n" +
    encoded.map((entry) => JSON.stringify(entry)).join(",\n") +
    "\n];\n"
  );
}

function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

/** Field-by-field differences between the resolved generated index and the registry. */
export function compareIndex(encoded: readonly EncodedSurface[]): string[] {
  const source = createIndexedSurfaceSource({
    encoded,
    baselineValues: Object.values(BASELINE_VALUES),
    maxInheritanceDepth: MAX_INHERITANCE_DEPTH,
    loadBody: () => undefined,
  });
  const problems: string[] = [];
  const expected = getAllManifests();
  const got = source.getAllIndexEntries();
  if (stable(got.map((e) => e.surfaceName)) !== stable(expected.map((m) => m.surfaceName))) {
    problems.push("surface list or order differs");
  }
  for (const full of expected) {
    const name = full.surfaceName;
    const want = toSurfaceIndexEntry(full, getRawManifest(name)) as unknown as Record<string, unknown>;
    const have = source.getIndexEntry(name) as unknown as Record<string, unknown> | undefined;
    if (!have) {
      problems.push(`${name}: missing from the index`);
      continue;
    }
    for (const key of new Set([...Object.keys(want), ...Object.keys(have)])) {
      if (key === "values") continue;
      if (stable(want[key]) !== stable(have[key])) {
        problems.push(`${name}.${key}: index ${stable(have[key])} ≠ registry ${stable(want[key])}`);
      }
    }
    const wv = want.values as Record<string, unknown>[];
    const hv = have.values as Record<string, unknown>[];
    if (wv.length !== hv.length) problems.push(`${name}.values: ${hv.length} ≠ ${wv.length}`);
    wv.forEach((v, i) => {
      for (const key of new Set([...Object.keys(v), ...Object.keys(hv[i] ?? {})])) {
        if (stable(v[key]) !== stable(hv[i]?.[key])) {
          problems.push(
            `${name}.values[${i}:${String(v.name)}].${key}: index ${stable(hv[i]?.[key])} ≠ registry ${stable(v[key])}`,
          );
        }
      }
    });
    if (stable(source.getSurfaceAncestry(name)) !== stable(getSurfaceAncestry(name))) {
      problems.push(`${name}: ancestry differs`);
    }
    if (stable(source.getSurfaceChildren(name)) !== stable(getSurfaceChildren(name))) {
      problems.push(`${name}: children differ`);
    }
  }
  return problems;
}

function build(): { encoded: EncodedSurface[]; text: string } {
  const encoded = encodeSurfaceIndex(RAW_MANIFESTS, getManifest);
  return { encoded, text: render(encoded) };
}

function check(text: string, encoded: readonly EncodedSurface[]): string[] {
  const problems = compareIndex(encoded);
  const gz = gzipSync(text).length;
  if (gz > INDEX_BUDGET_GZIP) problems.push(`index is ${gz} B gzip, over the ${INDEX_BUDGET_GZIP} B budget`);
  return problems;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sources = await manifestSources();
  const rendered = renderLoaders(sources);
  const loadersText = rendered.loaders;
  if (args.includes("--write")) {
    const { encoded, text } = build();
    const problems = [...check(text, encoded), ...(await compareBodies(loaderFromSources(sources)))];
    if (problems.length) {
      console.error(problems.slice(0, 20).join("\n"));
      process.exit(1);
    }
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, text);
    writeFileSync(LOADERS_OUT, loadersText);
    mkdirSync(BUCKET_DIR, { recursive: true });
    for (const f of readdirSync(BUCKET_DIR)) if (!rendered.buckets.has(f)) rmSync(join(BUCKET_DIR, f));
    for (const [f, text] of rendered.buckets) writeFileSync(join(BUCKET_DIR, f), text);
    console.log(`surface index: ${encoded.length} surfaces, ${text.length} B, ${gzipSync(text).length} B gzip → ${OUT}`);
    console.log(`body loaders: ${sources.size} surfaces, every body equals the registry's → ${LOADERS_OUT}`);
    return;
  }
  if (args.includes("--self-test")) {
    const { encoded } = build();
    // RED: one inlined value's autoContext flipped in the generated data.
    const tampered = JSON.parse(JSON.stringify(encoded)) as EncodedSurface[];
    const row = tampered.find((s) => s[3].length > 0)!;
    (row[3][0] as unknown[])[2] = ((row[3][0] as number[])[2] ^ 2) as number;
    const red = compareIndex(tampered);
    // RED: a parent chain cut (inheritsFrom dropped).
    const cut = JSON.parse(JSON.stringify(encoded)) as EncodedSurface[];
    const child = cut.find((s) => typeof s[1].inheritsFrom === "string")!;
    delete child[1].inheritsFrom;
    const redChain = compareIndex(cut);
    const green = compareIndex(encoded);
    // RED: one loader's chain loses its parent (the body resolves without inherited values).
    const orphan = RAW_MANIFESTS.find((m) => typeof m.inheritsFrom === "string")!.surfaceName;
    const redBody = await compareBodies(
      loaderFromSources(sources, (n) => (n === orphan ? [n] : chainOf(n))),
    );
    // RED: one loaded file differs from what the registry holds (a value label edited).
    const real = loaderFromSources(sources);
    const edited = RAW_MANIFESTS.find((m) => m.values.length > 0)!.surfaceName;
    const redEdit = await compareBodies(async (n) => {
      const chain = await real(n);
      if (n !== edited) return chain;
      const own = chain[chain.length - 1];
      const values = own.values.map((v, i) => (i === 0 ? { ...v, label: `${v.label} (edited)` } : v));
      return [...chain.slice(0, -1), { ...own, values }];
    });
    const greenBody = await compareBodies(real);
    console.log(`self-test RED (value flag edit): ${red.length} problem(s) — ${red[0] ?? "none"}`);
    console.log(`self-test RED (parent chain cut): ${redChain.length} problem(s) — ${redChain[0] ?? "none"}`);
    console.log(`self-test GREEN (generated): ${green.length} problem(s)`);
    console.log(`self-test RED (body loader without its parent): ${redBody.length} problem(s) — ${redBody[0] ?? "none"}`);
    console.log(`self-test RED (one loaded file edited): ${redEdit.length} problem(s) — ${redEdit[0] ?? "none"}`);
    console.log(`self-test GREEN (body loaders): ${greenBody.length} problem(s)`);
    if (
      red.length === 0 ||
      redChain.length === 0 ||
      green.length !== 0 ||
      redBody.length === 0 ||
      redEdit.length === 0 ||
      greenBody.length !== 0
    ) {
      process.exit(1);
    }
    return;
  }
  // Default: check the committed file.
  const { text: fresh } = build();
  let committed = "";
  try {
    committed = readFileSync(OUT, "utf8");
  } catch {
    console.error(`missing ${OUT} — run pnpm generate:surface-index`);
    process.exit(1);
  }
  const encoded = JSON.parse(committed.slice(committed.indexOf("= ") + 2, committed.lastIndexOf(";"))) as EncodedSurface[];
  const problems = check(committed, encoded);
  if (committed !== fresh) problems.push("generated file is stale — run pnpm generate:surface-index");
  // The COMMITTED loader map, imported exactly as the browser does.
  let loadersCommitted = "";
  try {
    loadersCommitted = readFileSync(LOADERS_OUT, "utf8");
  } catch {
    problems.push(`missing ${LOADERS_OUT} — run pnpm generate:surface-index`);
  }
  if (loadersCommitted && loadersCommitted !== loadersText) {
    problems.push("body loader map is stale — run pnpm generate:surface-index");
  }
  for (const [f, text] of rendered.buckets) {
    let committedBucket = "";
    try {
      committedBucket = readFileSync(join(BUCKET_DIR, f), "utf8");
    } catch {
      problems.push(`missing ${f} — run pnpm generate:surface-index`);
    }
    if (committedBucket && committedBucket !== text) problems.push(`${f} is stale — run pnpm generate:surface-index`);
  }
  if (loadersCommitted) {
    const { SURFACE_BODY_LOADERS } = (await import(
      "@/features/surfaces/manifests/generated/surface-body-loaders.generated"
    )) as { SURFACE_BODY_LOADERS: Record<string, () => Promise<readonly SurfaceManifest[]>> };
    problems.push(
      ...(await compareBodies(async (n) => {
        const load = SURFACE_BODY_LOADERS[n];
        if (!load) throw new Error("no loader");
        return load();
      })),
    );
  }
  if (problems.length) {
    console.error(`check:surface-index RED — ${problems.length} problem(s):\n` + problems.slice(0, 25).join("\n"));
    process.exit(1);
  }
  console.log(`check:surface-index GREEN — ${encoded.length} surfaces match field by field; ${gzipSync(committed).length} B gzip (budget ${INDEX_BUDGET_GZIP}); every body loader equals the registry`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
