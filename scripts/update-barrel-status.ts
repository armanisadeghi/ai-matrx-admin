/**
 * update-barrel-status.ts
 *
 * Refreshes barrel-migration-status.json by re-running knip analysis.
 * Run this after any barrel migration work to keep the shared status file current.
 *
 * USAGE:
 *   npx ts-node scripts/update-barrel-status.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const STATUS_FILE = path.join(ROOT, 'scripts', 'barrel-migration-status.json');
const TMP_KNIP = '/tmp/knip-update.json';

console.log('🔍 Running knip analysis...\n');

try {
  execSync(`cd "${ROOT}" && npx knip --reporter json > "${TMP_KNIP}" 2>/dev/null`, {
    stdio: 'inherit',
    timeout: 120_000,
  });
} catch {
  // knip exits 1 when it finds issues — that's normal
}

const rawKnip = JSON.parse(fs.readFileSync(TMP_KNIP, 'utf-8'));
const issues: any[] = rawKnip.issues ?? [];

// Get all barrel files on disk
const findResult = execSync(
  `find "${ROOT}" \\( -name "index.ts" -o -name "index.tsx" \\) ` +
  `! -path "*/node_modules/*" ! -path "*/.claude/*" ! -path "*/.cursor/*" ! -path "*/.next/*"`,
  { encoding: 'utf-8' }
);
const allFsBarrels = new Set<string>();
for (const line of findResult.trim().split('\n')) {
  if (line) allFsBarrels.add(line.replace(ROOT + '/', ''));
}

const barrelsFullyUnused: string[] = [];
const barrelsPartial: { file: string; unused_exports: string[]; unused_types: string[] }[] = [];
const barrelsInKnip = new Set<string>();

for (const issue of issues) {
  const fname: string = issue.file ?? '';
  if (!fname.includes('index.ts') && !fname.includes('index.tsx')) continue;
  if (fname.includes('.claude/') || fname.includes('.cursor/') || fname.includes('node_modules/')) continue;

  barrelsInKnip.add(fname);
  const exports: any[] = issue.exports ?? [];
  const types: any[] = issue.types ?? [];

  if (issue.files) {
    barrelsFullyUnused.push(fname);
  } else if (exports.length > 0 || types.length > 0) {
    barrelsPartial.push({
      file: fname,
      unused_exports: exports.map((e: any) => e.symbol ?? ''),
      unused_types: types.map((t: any) => t.symbol ?? ''),
    });
  }
}

const barrelsHealthy = [...allFsBarrels].filter(b => !barrelsInKnip.has(b)).sort();

const unusedFiles: string[] = [];
for (const issue of issues) {
  if (issue.files) {
    const f: string = issue.file ?? '';
    if (!f.includes('.claude/') && !f.includes('node_modules/')) {
      unusedFiles.push(f);
    }
  }
}

const dirCounter: Record<string, number> = {};
for (const f of unusedFiles) {
  const parts = f.split('/');
  const top = parts.slice(0, 2).join('/');
  dirCounter[top] = (dirCounter[top] ?? 0) + 1;
}

const topDirs = Object.entries(dirCounter)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 25);

const report = {
  generated_at: new Date().toISOString(),
  note: 'Barrel import elimination in progress. Do NOT create new index.ts barrel files. Import directly from source files.',
  summary: {
    total_barrel_files_on_disk: allFsBarrels.size,
    barrels_fully_unused_delete_now: barrelsFullyUnused.length,
    barrels_partial_need_migration: barrelsPartial.length,
    barrels_healthy_all_exports_consumed: barrelsHealthy.length,
    total_unused_files: unusedFiles.length,
  },
  barrels_fully_unused: barrelsFullyUnused.sort(),
  barrels_partial: barrelsPartial.sort((a, b) => a.file.localeCompare(b.file)),
  barrels_healthy: barrelsHealthy,
  top_dirs_with_unused_files: Object.fromEntries(topDirs),
  unused_files: unusedFiles.sort(),
};

fs.writeFileSync(STATUS_FILE, JSON.stringify(report, null, 2));

const s = report.summary;
console.log('═'.repeat(55));
console.log('BARREL MIGRATION STATUS UPDATED');
console.log('═'.repeat(55));
console.log(`  Total barrels on disk:           ${s.total_barrel_files_on_disk}`);
console.log(`  Fully unused (delete now):       ${s.barrels_fully_unused_delete_now}`);
console.log(`  Partial (migration needed):      ${s.barrels_partial_need_migration}`);
console.log(`  Healthy (all exports consumed):  ${s.barrels_healthy_all_exports_consumed}`);
console.log(`  Total unused files:              ${s.total_unused_files}`);
console.log(`\n  Status file: scripts/barrel-migration-status.json`);
console.log('═'.repeat(55));

if (s.barrels_fully_unused_delete_now > 0) {
  console.log('\n⚠️  There are fully-unused barrels ready to delete:');
  for (const b of report.barrels_fully_unused) {
    console.log(`   ${b}`);
  }
  console.log('\nDelete them with: npx ts-node scripts/migrate-barrel-imports.ts --dry-run');
}
