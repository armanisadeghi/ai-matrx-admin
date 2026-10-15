/**
 * Seeds the featured (platform-curated) workbook and document templates into
 * workbench.file_template, owned by the Matrx System organization. Idempotent:
 * a template is keyed by metadata.seed_key; a re-run updates its content and
 * clears its thumbnail only when the content (ignoring random ids) changed (the gallery re-renders it).
 *
 *   tsx --tsconfig tsconfig.json scripts/file-templates/seed-featured-templates.ts [--dry-run]
 *   Add --showcase-only to reconcile only the supported Univer showcase imports.
 *
 * Content: features/templates/files/seeds/*. Connection: the direct-DB
 * variables (scripts/lib/direct-db-env.ts), the same the migration runner uses.
 */
import { resolve } from "node:path";
import pg from "pg";
import { loadDbEnvFrom } from "../lib/direct-db-env";
import { workbookSeeds } from "@/features/templates/files/seeds/workbook-templates";
import { documentSeeds } from "@/features/templates/files/seeds/document-templates";
import { presentationSeeds } from "@/features/templates/files/seeds/presentation-templates";
import { stableContentHash } from "@/features/templates/files/seeds/content-hash";
import { SYSTEM_ORGANIZATION_ID } from "@/features/templates/files/types";
import { univerShowcaseSeeds } from "@/features/templates/files/seeds/univer-showcase-templates";

async function main() {
  const dry = process.argv.includes("--dry-run");
  const showcases = univerShowcaseSeeds();
  const seeds = process.argv.includes("--showcase-only")
    ? showcases
    : [...workbookSeeds(), ...documentSeeds(), ...presentationSeeds(), ...showcases];
  console.log(`[seed-templates] ${seeds.length} featured templates`);
  if (dry) {
    for (const t of seeds) console.log(`  ${t.kind.padEnd(12)} ${t.seedKey} ${stableContentHash(t.snapshot)}`);
    return;
  }
  const env = loadDbEnvFrom(resolve(process.cwd()));
  if ("missing" in env) throw new Error(`direct-DB variables missing: ${env.missing.join(", ")}`);
  const client = new pg.Client({ user: env.user, password: env.password, host: env.host, port: env.port, database: env.database, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const t of seeds) {
      const body = JSON.stringify(t.snapshot);
      const hash = stableContentHash(t.snapshot);
      const metadata = JSON.stringify({
        ...("metadata" in t ? t.metadata : {}),
        seed_key: t.seedKey,
        content_hash: hash,
      });
      const existing = await client.query(
        `select id, metadata->>'content_hash' as h from workbench.file_template where organization_id = $1 and metadata->>'seed_key' = $2 and deleted_at is null`,
        [SYSTEM_ORGANIZATION_ID, t.seedKey],
      );
      if (existing.rows[0]) {
        const changed = existing.rows[0].h !== hash;
        await client.query(
          `update workbench.file_template set name=$2, category=$3, description=$4, sort_order=$5, snapshot=$6::jsonb,
             thumbnail_file_id = case when $7 then null else thumbnail_file_id end,
             metadata = metadata || $8::jsonb
           where id=$1`,
          [existing.rows[0].id, t.name, t.category, t.description, t.sortOrder, body, changed, metadata],
        );
        console.log(`  ${changed ? "updated" : "same   "} ${t.kind.padEnd(8)} ${t.name}`);
      } else {
        await client.query(
          `insert into workbench.file_template (organization_id, visibility, kind, name, category, description, sort_order, snapshot, metadata)
           values ($1, 'internal', $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
          [SYSTEM_ORGANIZATION_ID, t.kind, t.name, t.category, t.description, t.sortOrder, body, metadata],
        );
        console.log(`  added   ${t.kind.padEnd(8)} ${t.name}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
