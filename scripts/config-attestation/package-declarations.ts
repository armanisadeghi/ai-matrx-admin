/**
 * The knob declarations of the @ai-matrx/* packages this build bundles (lane CONFIG-ATTEST-ROLLOUT).
 *
 * Each shipped package carries its own `knob-declaration.json` (format 1), generated from its source at
 * package build by aidream apps/shared/scripts/knob-declaration.mjs — the host never scans package
 * source. Which version is bundled is the lockfile's answer AT THE COMMIT, so the manifest of a sha is
 * the same on every run; the declaration is read from that exact version in the local pnpm store.
 *
 * Absence is honest, never silent: a package version with no declaration predates declarations (or
 * reads nothing — the package-side --check proves which); a version the store does not hold is listed
 * as unresolved, so its reads are counted rather than assumed away.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DynamicRead, ReadSite } from "../settings-guards/lib";
import type { Address } from "./indirection";

export interface KnobDeclaration {
  format: 1;
  package: string;
  reads: Array<{ feature: string; key: string; files: string[] }>;
  addresses: Record<string, Address>;
  unresolved: Array<{ file: string; line: number; call: string }>;
}

export interface Bundled {
  name: string;
  version: string;
  declaration: KnobDeclaration | null;
  /** The store did not hold this version: its reads could not be read. */
  missing: boolean;
}

/** Every `@ai-matrx/<name>@<version>` the lockfile resolves (importers and transitive snapshots). */
export function bundledVersions(lockfile: string): Array<{ name: string; version: string }> {
  const out = new Map<string, { name: string; version: string }>();
  const re = /^\s{2}'?(@ai-matrx\/[\w.-]+)@(\d+\.\d+\.\d+(?:-[\w.]+)?)(?:\([^\n]*\))?'?:\s*$/gm;
  for (let m = re.exec(lockfile); m; m = re.exec(lockfile)) out.set(`${m[1]}@${m[2]}`, { name: m[1], version: m[2] });
  return [...out.values()].sort((a, b) => (a.name === b.name ? (a.version < b.version ? -1 : 1) : a.name < b.name ? -1 : 1));
}

/** The installed copy of one exact version in the pnpm store, or null. */
function storeDir(root: string, name: string, version: string): string | null {
  const store = join(root, "node_modules", ".pnpm");
  if (!existsSync(store)) return null;
  const prefix = `${name.replace("/", "+")}@${version}`;
  for (const e of readdirSync(store)) {
    if (e !== prefix && !e.startsWith(`${prefix}_`) && !e.startsWith(`${prefix}(`)) continue;
    const dir = join(store, e, "node_modules", name);
    if (existsSync(join(dir, "package.json"))) return dir;
  }
  return null;
}

export function loadBundled(root: string, lockfile: string): Bundled[] {
  return bundledVersions(lockfile).map(({ name, version }) => {
    const dir = storeDir(root, name, version);
    if (!dir) return { name, version, declaration: null, missing: true };
    const path = join(dir, "knob-declaration.json");
    if (!existsSync(path)) return { name, version, declaration: null, missing: false };
    const decl = JSON.parse(readFileSync(path, "utf8")) as KnobDeclaration;
    if (decl.format !== 1) throw new Error(`${name}@${version}: knob-declaration.json format ${String(decl.format)} is not 1`);
    return { name, version, declaration: decl, missing: false };
  });
}

/** Sites, unresolved reads and exported addresses the bundled packages contribute to the host. */
export function packageContribution(bundled: Bundled[]): {
  sites: ReadSite[];
  dynamic: DynamicRead[];
  addresses: Map<string, Address>;
  summary: string;
} {
  const sites: ReadSite[] = [];
  const dynamic: DynamicRead[] = [];
  const addresses = new Map<string, Address>();
  let declared = 0;
  for (const b of bundled) {
    const tag = `${b.name}@${b.version}`;
    if (b.missing) {
      dynamic.push({ file: `node_modules/${b.name}`, line: 0, fn: "package", raw: tag, why: "bundled version not in the local pnpm store: its knob declaration could not be read" });
      continue;
    }
    if (!b.declaration) continue;
    declared++;
    for (const r of b.declaration.reads) {
      for (const file of r.files) sites.push({ file: `${b.name}/${file}`, line: 0, fn: `package ${tag}`, feature: r.feature, key: r.key });
    }
    for (const u of b.declaration.unresolved) {
      dynamic.push({ file: `${b.name}/${u.file}`, line: u.line, fn: "package", raw: u.call, why: `computed read inside ${tag}` });
    }
    for (const [k, v] of Object.entries(b.declaration.addresses)) addresses.set(k, v);
  }
  const missing = bundled.filter((b) => b.missing).length;
  return {
    sites,
    dynamic,
    addresses,
    summary: `${bundled.length} bundled @ai-matrx package version(s), ${declared} with a knob declaration${missing ? `, ${missing} NOT IN THE STORE` : ""}`,
  };
}
