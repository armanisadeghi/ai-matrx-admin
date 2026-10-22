/**
 * Emit the SQL that mirrors the manifests into the `ui` schema.
 *
 * ALC-14 — ONE SYNC PATH: the rows come from `@ai-matrx/alchemy/checks`
 * `planSurfaceSync` (via `../aidream/apps/shared/chat/src/surfaces/declare/surface-declare.ts`
 * `planManifestSync`) and the SQL from `renderSurfaceSyncSql`. This file builds
 * no rows of its own. Governance columns (`organization_id` and the row's web
 * state) are INSERT-ONLY: a conflict never rewrites them (chair ruling N5).
 *
 * Prints, to stdout (all manifests by default, or only repeated
 * `--surface <name>` selections), one transaction body:
 *   1. INSERT … ON CONFLICT (name) DO NOTHING for every ui_surface row;
 *   2. per-surface UPDATE of the code-owned columns (label, value_groups,
 *      readiness, readiness_note, description, execution_mode, client_name,
 *      plus overlay_id / url_pattern / intro / parent only when declared);
 *   3. one upsert per mirror table (values, write targets, agent roles,
 *      client tools).
 *   4. for every selected manifest with a `guide`, an upsert of that markdown
 *      as the platform skill `surface-guide-<slug>` (`skill.definition`; see
 *      `renderSurfaceGuideSkillSql`). The intro pointer to it is part of the
 *      plan (`withAgentHints`).
 * Then (`scripts/lib/surface-sync-archive.ts`) it ARCHIVES — `deleted_at`, never
 * DELETE — every code-declared row of the selected surfaces that no manifest
 * declares any more, in every keyed mirror table, and revives re-declared ones.
 * `declared_by = 'database'` rows are never addressed.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderSurfaceSyncSql, sqlLiteral } from "@ai-matrx/alchemy/checks";
import {
  getAllManifests,
  getRawManifest,
} from "@/features/surfaces/manifests/registry";
import {
  planManifestSync,
  toPackageResolved,
} from "@ai-matrx/chat/surfaces/declare/surface-declare";
import { withDatabaseRoot } from "../features/surfaces/services/surface-database-root";
import { renderStaleArchiveSql } from "./lib/surface-sync-archive";
import { sqlSyncedFrom } from "@/features/surfaces/services/sync-provenance";
import {
  surfaceGuideSkillId,
  surfaceGuideSkillText,
  surfaceGuideSlug,
} from "@ai-matrx/chat/surfaces/utils/surface-guide";
import type { SurfaceManifest } from "@ai-matrx/chat/surfaces/types";
import { isUuidShape } from "@ai-matrx/kit/uuid";

const REPO_ROOT = resolve(__dirname, "..");

/** sha256 of the trimmed guide body — stored as the skill's `config.source_hash`. */
export function surfaceGuideSourceHash(body: string): string {
  return createHash("sha256").update(body.trim()).digest("hex");
}

/** The guide markdown for a manifest, read from the repo. */
export function readSurfaceGuide(repoPath: string): string {
  return readFileSync(resolve(REPO_ROOT, repoPath), "utf8");
}

/**
 * Upsert a surface's guide markdown as a normal platform skill — the same row
 * shape as the other system reference skills (`skill_type` reference,
 * `is_system`, the system org, published to the web so the in-app `skill` tool
 * can `get` and `search` it). `skill.definition` has no unique key on `skill_id`,
 * so it is an UPDATE of the live row plus an INSERT … WHERE NOT EXISTS. Governance
 * columns (`organization_id`, `published_to_web`) are insert-only, as for the mirror.
 */
export function renderSurfaceGuideSkillSql(
  manifest: Pick<SurfaceManifest, "surfaceName" | "label" | "urlPattern" | "guide">,
  organizationId: string,
  readGuide: (repoPath: string) => string = readSurfaceGuide,
): string {
  if (!manifest.guide) return "";
  const body = readGuide(manifest.guide).trim();
  if (!body) throw new Error(`Surface guide ${manifest.guide} is empty`);
  const skillId = surfaceGuideSkillId(manifest.surfaceName);
  const { label, description } = surfaceGuideSkillText(manifest);
  const sourceHash = surfaceGuideSourceHash(body);
  const triggers = [
    surfaceGuideSlug(manifest.surfaceName),
    manifest.label,
    ...(manifest.urlPattern ? [manifest.urlPattern] : []),
    "apply_surface_write",
  ];
  const metadata = {
    authored_by: "surface-sync",
    audience: "runtime-agent",
    surface_name: manifest.surfaceName,
    source_of_truth: manifest.guide,
  };
  const config = {
    ingested_from: "surface-sync",
    source_repo: "matrx-frontend",
    source_path: manifest.guide,
    source_hash: sourceHash,
  };
  const L = (v: string) => sqlLiteral(v);
  const J = (v: unknown) =>
    `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  const live = `skill_id = ${L(skillId)} AND organization_id = ${L(organizationId)} AND deleted_at IS NULL`;
  return `-- Surface guide ${manifest.guide} → platform skill ${skillId}
UPDATE skill.definition SET label = ${L(label)}, description = ${L(description)}, skill_type = 'reference', body = ${L(body)}, icon_name = 'BookOpen', trigger_patterns = ${J(triggers)}, platform_targets = '["web"]'::jsonb, is_active = true, is_system = true, metadata = ${J(metadata)}, config = ${J(config)}, updated_at = now() WHERE ${live};

INSERT INTO skill.definition (skill_id, label, description, skill_type, body, icon_name, trigger_patterns, platform_targets, is_active, is_system, organization_id, published_to_web, metadata, config)
SELECT ${L(skillId)}, ${L(label)}, ${L(description)}, 'reference', ${L(body)}, 'BookOpen', ${J(triggers)}, '["web"]'::jsonb, true, true, ${L(organizationId)}, true, ${J(metadata)}, ${J(config)}
WHERE NOT EXISTS (SELECT 1 FROM skill.definition WHERE ${live});`;
}

/**
 * The checkout's commit, or null when git cannot answer (a tarball, a detached
 * export, no git binary). Null is a first-class answer — `sqlSyncedFrom` then
 * stamps `sha-unknown` rather than inventing a build identity.
 */
function currentGitSha(): string | null {
  try {
    return (
      execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || null
    );
  } catch {
    return null;
  }
}

export interface EmitSurfaceSyncSqlOptions {
  surfaceNames?: readonly string[];
  organizationId: string;
  /** Plan tables (`ui.<name>`) a caller archives itself; every other keyed table is archived here. */
  skipArchiveTables?: readonly string[];
}

function selectedManifests(surfaceNames: readonly string[]) {
  const allManifests = getAllManifests();
  const manifests =
    surfaceNames.length === 0
      ? allManifests
      : allManifests.filter((manifest) =>
          surfaceNames.includes(manifest.surfaceName),
        );
  const unresolvedNames = surfaceNames.filter(
    (name) => !manifests.some((manifest) => manifest.surfaceName === name),
  );
  if (unresolvedNames.length > 0) {
    throw new Error(
      `Unknown surface manifest${unresolvedNames.length === 1 ? "" : "s"}: ${unresolvedNames.join(", ")}`,
    );
  }
  return manifests;
}

export function emitSurfaceSyncSql({
  surfaceNames = [],
  organizationId,
  skipArchiveTables,
}: EmitSurfaceSyncSqlOptions): string {
  if (!isUuidShape(organizationId)) {
    throw new Error("--organization-id must be a UUID");
  }
  const manifests = selectedManifests([...new Set(surfaceNames)]);
  // PROVENANCE: every row stamps synced_by / synced_from. synced_by is NULL by
  // contract — this channel has no session, and the applier is whoever runs the SQL.
  const plan = withDatabaseRoot(
    planManifestSync(toPackageResolved(manifests, getRawManifest), {
      organizationId,
      syncedFrom: sqlSyncedFrom(currentGitSha()),
      syncedBy: null,
    }),
    manifests,
  );
  const guides = manifests
    .map((manifest) => renderSurfaceGuideSkillSql(manifest, organizationId))
    .filter(Boolean);
  return [renderSurfaceSyncSql(plan), renderStaleArchiveSql(plan, {
      skipTables: skipArchiveTables,
      registrySurfaceNames: surfaceNames.length === 0 ? getAllManifests().map((m) => m.surfaceName) : undefined,
    }), ...guides].filter(Boolean).join("\n\n");
}

/** Columns the direct check never compares (governance and provenance). */
const CHECK_NOT_COMPARED = new Set(["organization_id", "visibility", "synced_by", "synced_from"]);

/**
 * Cloud `--check` (2026-10-22): a read-only SELECT that returns one row per
 * problem for the selected surfaces — nothing returned means the DB mirror
 * matches the code. Run it through the Supabase MCP where the direct-Postgres
 * `sync-surface-manifests-direct.ts --check` cannot run. It compares what that
 * check compares: every column the sync writes on the surface row and on each
 * keyed child row (`to_jsonb(row)->column` against the planned value, so key
 * order inside JSON never matters), rows missing or archived, rows live but no
 * longer declared — in EVERY keyed table, including ones the plan has no rows
 * for — and each guide's skill hash. Not covered: the direct check's EXPLAIN
 * of every sync statement against the live schema.
 */
export function emitSurfaceCheckSql({
  surfaceNames = [],
  organizationId,
}: Pick<EmitSurfaceSyncSqlOptions, "surfaceNames" | "organizationId">): string {
  if (!isUuidShape(organizationId)) {
    throw new Error("--organization-id must be a UUID");
  }
  const manifests = selectedManifests([...new Set(surfaceNames)]);
  const plan = withDatabaseRoot(
    planManifestSync(toPackageResolved(manifests, getRawManifest), {
      organizationId,
      syncedFrom: "check",
    }),
    manifests,
  );
  const L = (v: unknown) => sqlLiteral(String(v));
  const J = (v: Record<string, unknown>) => {
    const compared = Object.fromEntries(
      Object.entries(v)
        .filter(([column]) => !CHECK_NOT_COMPARED.has(column))
        .map(([column, value]) => [column, value ?? null]),
    );
    return `${sqlLiteral(JSON.stringify(compared))}::jsonb`;
  };
  const names = manifests.map((m) => L(m.surfaceName)).join(", ");
  const parts: string[] = [];
  // Each expected set is written once, as a CTE, and read by every clause.
  const ctes: string[] = [];
  const surfaceValues = plan.surfaces
    .map((surface) => `(${L(surface.name)}, ${J(surface.update as Record<string, unknown>)})`)
    .join(",\n  ");
  ctes.push(`exp_surface(name, expected) AS (VALUES ${surfaceValues})`);
  parts.push(`SELECT e.name AS surface, 'ui_surface row missing, archived or inactive' AS problem
FROM exp_surface e
WHERE NOT EXISTS (SELECT 1 FROM ui.ui_surface s WHERE s.name = e.name AND s.deleted_at IS NULL AND s.is_active IS TRUE)`);
  parts.push(`SELECT e.name, 'ui_surface.' || kv.key || ' differs' AS problem
FROM exp_surface e
JOIN ui.ui_surface s ON s.name = e.name AND s.deleted_at IS NULL
CROSS JOIN LATERAL jsonb_each(e.expected) AS kv
WHERE to_jsonb(s) -> kv.key IS DISTINCT FROM kv.value`);
  const planTables = plan.tables as Array<{ table: string; rows: Array<Record<string, unknown>> }>;
  for (const [index, [table, conflict]] of Object.entries(plan.keys as Record<string, readonly string[]>).entries()) {
    const rows = planTables.find((t) => t.table === table)?.rows ?? [];
    const keyCols = conflict.join(", ");
    const keyLabel = (alias: string) => conflict.map((c) => `coalesce(${alias}.${c}::text, '')`).join(" || '/' || ");
    const match = conflict.map((c) => `t.${c}::text = e.${c}`).join(" AND ");
    const cte = `exp_${index}`;
    ctes.push(
      rows.length
        ? `${cte}(${keyCols}, expected) AS (VALUES ${rows.map((r) => `(${conflict.map((c) => L(r[c] ?? "")).join(", ")}, ${J(r)})`).join(",\n  ")})`
        : `${cte}(${keyCols}, expected) AS (SELECT ${conflict.map(() => "NULL::text").join(", ")}, NULL::jsonb WHERE false)`,
    );
    const expected = cte;
    const alias = "AS e";
    if (rows.length) {
      parts.push(`SELECT e.surface_name, '${table}: ' || ${keyLabel("e")} || ' missing or archived' AS problem
FROM ${expected} ${alias}
WHERE NOT EXISTS (SELECT 1 FROM ${table} t WHERE ${match} AND t.deleted_at IS NULL)`);
      parts.push(`SELECT e.surface_name, '${table}: ' || ${keyLabel("e")} || ' ' || kv.key || ' differs' AS problem
FROM ${expected} ${alias}
JOIN ${table} t ON ${match} AND t.deleted_at IS NULL
CROSS JOIN LATERAL jsonb_each(e.expected) AS kv
WHERE to_jsonb(t) -> kv.key IS DISTINCT FROM kv.value`);
    }
    parts.push(`SELECT t.surface_name, '${table}: ' || ${keyLabel("t")} || ' is live but no longer declared' AS problem
FROM ${table} t
WHERE t.surface_name IN (${names}) AND t.deleted_at IS NULL AND t.declared_by = 'code'
  AND NOT EXISTS (SELECT 1 FROM ${expected} ${alias} WHERE ${match})`);
  }
  for (const manifest of manifests) {
    if (!manifest.guide) continue;
    const hash = surfaceGuideSourceHash(readSurfaceGuide(manifest.guide));
    parts.push(`SELECT ${L(manifest.surfaceName)}, 'guide skill ${surfaceGuideSkillId(manifest.surfaceName)} missing or stale' AS problem
WHERE (SELECT count(*) FROM skill.definition WHERE skill_id = ${L(surfaceGuideSkillId(manifest.surfaceName))} AND organization_id = ${L(organizationId)} AND deleted_at IS NULL AND is_active AND config->>'source_hash' = ${L(hash)}) <> 1`);
  }
  return `-- Read-only. No rows = the DB mirror matches the code.\nWITH ${ctes.join(",\n")}\n${parts.join("\nUNION ALL\n")};`;
}

function main() {
  const surfaceNames: string[] = [];
  let organizationId: string | undefined;
  let checkOnly = false;
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === "--surface" || arg === "--organization-id") {
      if (!value || value.startsWith("--"))
        throw new Error(`${arg} requires a value`);
      if (arg === "--surface") surfaceNames.push(value);
      else organizationId = value;
      index += 1;
      continue;
    }
    if (arg === "--check") {
      checkOnly = true;
      continue;
    }
    if (arg.startsWith("--surface=")) {
      surfaceNames.push(arg.slice(10));
      continue;
    }
    if (arg.startsWith("--organization-id=")) {
      organizationId = arg.slice(18);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!organizationId)
    throw new Error(
      "--organization-id is required: the system org, from `select organization_id from iam.system_orgs where key = 'system'` (run it through the Supabase MCP in a cloud session)",
    );
  console.log(
    checkOnly
      ? emitSurfaceCheckSql({ surfaceNames, organizationId })
      : emitSurfaceSyncSql({ surfaceNames, organizationId }),
  );
}

if (process.argv[1]?.endsWith("emit-surface-sync-sql.ts")) main();
