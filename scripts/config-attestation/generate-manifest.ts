/**
 * pnpm config:manifest --sha <40hex> --out <file>     the attestation manifest of one commit
 * pnpm config:registry-snapshot                        regenerate the checked-in knob registry snapshot
 *
 * See ./lib.ts. Exit 1 when the commit cannot be declared honestly: a `KNOB READS` annotation with
 * no computed read below it (a declaration that outlived its read).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildConfigManifest, type ConfigManifest } from "@ai-matrx/data/config-attestation";
import type { KnobDefs, KnobFeature } from "@ai-matrx/data/knobs";
import { ROOT, loadRegistry } from "../settings-guards/lib";
import { APP, SNAPSHOT_REL, declaredAt, git, snapshotHash, type RegistrySnapshot } from "./lib";

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

function envValue(name: string): string {
  if (process.env[name]) return process.env[name]!;
  for (const f of [".env.local", ".env"]) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    const m = new RegExp(`^${name}\\s*=\\s*["']?([^"'\\n]+)["']?`, "m").exec(readFileSync(p, "utf8"));
    if (m) return m[1].trim();
  }
  throw new Error(`${name} is not set (env, .env.local or .env): the manifest's bootstrap cannot be stated`);
}

async function writeSnapshot(): Promise<void> {
  const rows = (await loadRegistry("config:registry-snapshot"))
    .map((r) => [r.feature, r.key] as [string, string])
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1));
  const snap: RegistrySnapshot = { sha256: snapshotHash(rows), rows };
  writeFileSync(join(ROOT, SNAPSHOT_REL), JSON.stringify(snap, null, 0).replace(/\],\[/g, "],\n[") + "\n");
  console.log(`wrote ${SNAPSHOT_REL}: ${rows.length} rows, sha256 ${snap.sha256.slice(0, 12)}`);
}

export function generateManifest(sha: string): { manifest: ConfigManifest; unresolved: number; summary: string } {
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`--sha must be a full 40-hex commit sha (got ${sha})`);
  const d = declaredAt(sha);
  const uncovered = d.annotations.filter((a) => !a.covered);
  if (uncovered.length) {
    throw new Error(
      "KNOB READS annotation with no computed read in the 3 lines below it (a declaration that outlived its read):\n" +
        uncovered.map((a) => `  ${a.file}:${a.line}  "${a.feature}" ${a.keys.join(" ")}`).join("\n"),
    );
  }
  const byFeature = new Map<string, Set<string>>();
  const readers: Record<string, string[]> = {};
  const seenPair = new Set<string>();
  for (const s of d.sites) {
    byFeature.set(s.feature, (byFeature.get(s.feature) ?? new Set()).add(s.key));
    const full = `${s.feature}.${s.key}`;
    const file = s.file.replace(/^matrx-frontend\//, "");
    (readers[full] ??= []).push(file);
    seenPair.add(`${s.feature}\u0000${s.key}`);
  }
  const knobFeatures = [...byFeature.entries()].map(
    ([feature, keys]) =>
      ({ feature, defs: Object.fromEntries([...keys].map((key) => [key, { key }])) }) as unknown as KnobFeature<KnobDefs>,
  );
  const appVersion = (JSON.parse(git(["show", `${sha}:package.json`])) as { version: string }).version;
  const url = envValue("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const manifest = buildConfigManifest({
    app: APP,
    appVersion,
    buildSha: sha,
    knobFeatures,
    appConfigKeys: [...d.appKeys.entries()].map(([key, files]) => ({
      key,
      readers: [...files].map((f) => f.replace(/^matrx-frontend\//, "")).sort(),
    })),
    readers,
    bootstrap: {
      database_url: url,
      database_realtime_url: `${url.replace(/^http/, "ws")}/realtime/v1`,
      publishable_key_prefix: envValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY").slice(0, 20),
      source: "next-public-env",
    },
  });
  manifest.app_config.keys.sort((a, b) => a.key.localeCompare(b.key));
  // The read sites this build makes whose address could not be named (at run time each is filed
  // `missing` -> red). Additive to the frozen v1 shape; the admin header shows the count.
  const sites = d.dynamic
    .map((x) => ({ file: x.file.replace(/^matrx-frontend\//, ""), line: x.line, call: `${x.fn}(${x.raw})`.slice(0, 160) }))
    .sort((a, b) => (a.file === b.file ? a.line - b.line || (a.call < b.call ? -1 : 1) : a.file < b.file ? -1 : 1));
  (manifest as ConfigManifest & { unresolved?: unknown }).unresolved = { count: sites.length, sites };
  // Deterministic: the commit's own time, so a re-run for the same sha hashes identically.
  manifest.generated_at = new Date(git(["show", "-s", "--format=%cI", sha]).trim()).toISOString();
  const summary =
    `${APP} ${sha.slice(0, 10)} v${appVersion}: ${manifest.knobs.length} knobs in ${byFeature.size} features, ` +
    `${manifest.app_config.keys.length} app-config keys, ${d.dynamic.length} unresolved read sites; ${d.packages}` +
    (d.annotations.length ? `, ${d.annotations.length} KNOB READS annotations` : "");
  return { manifest, unresolved: d.dynamic.length, summary };
}

async function main(): Promise<void> {
  if (process.argv.includes("--write-registry-snapshot")) return writeSnapshot();
  const sha = arg("--sha");
  const out = arg("--out");
  if (!sha || !out) {
    console.error("usage: pnpm config:manifest --sha <40hex> --out <file>");
    process.exit(2);
  }
  const { manifest, summary } = generateManifest(sha);
  const abs = resolve(out);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`config manifest → ${abs}\n  ${summary}`);
}

if (process.argv[1] && /generate-manifest\.ts$/.test(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(`✗ config:manifest — ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
