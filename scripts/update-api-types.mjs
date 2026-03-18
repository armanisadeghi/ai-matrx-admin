#!/usr/bin/env node
/**
 * update-api-types — Single command to sync Python backend types + verify alignment.
 *
 * Usage:
 *   pnpm update-api-types               # default: localhost:8000/api
 *   pnpm update-api-types --url http://api.aidream.com
 *
 * Steps:
 *   1. Fetch schema bundles from the Python backend via sync-types.mjs
 *   2. Run TypeScript type-check (tsc --noEmit) to surface any drift
 *
 * If ANYTHING in the codebase references a field, enum value, or type that
 * no longer matches the backend schema, step 2 will fail loudly with type errors.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
function getArg(name, fallback) {
    const idx = args.indexOf(name);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return fallback;
}

const skipTypeCheck = args.includes('--skip-typecheck');
const backendUrl = getArg('--url', 'http://localhost:8000/api');
const outDir = resolve(PROJECT_ROOT, 'types/python-generated');

const AIDREAM_SYNC_SCRIPT = resolve(PROJECT_ROOT, '../aidream/scripts/sync-types.mjs');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  update-api-types');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ── Step 1: Sync types from Python backend ─────────────────────────────────

if (!existsSync(AIDREAM_SYNC_SCRIPT)) {
    console.error(`  ✗ sync-types.mjs not found at: ${AIDREAM_SYNC_SCRIPT}`);
    console.error('    Make sure the aidream repo is cloned at ../aidream');
    process.exit(1);
}

console.log('  Step 1: Fetching types from Python backend...\n');

try {
    execSync(
        `node "${AIDREAM_SYNC_SCRIPT}" --url "${backendUrl}" --out "${outDir}"`,
        { stdio: 'inherit', cwd: PROJECT_ROOT },
    );
} catch {
    console.error('\n  ✗ Failed to sync types from the Python backend.');
    console.error('    Make sure the backend is running: uv run run.py (from aidream/)');
    process.exit(1);
}

// ── Step 2: Type-check the codebase ────────────────────────────────────────

if (skipTypeCheck) {
    console.log('\n  ⊘ Skipping type-check (--skip-typecheck)\n');
} else {
    console.log('\n  Step 2: Running TypeScript type-check...\n');
    try {
        execSync('npx tsc --noEmit', {
            stdio: 'inherit',
            cwd: PROJECT_ROOT,
        });
        console.log('\n  ✓ Type-check passed — all types are aligned.\n');
    } catch {
        console.error('\n  ✗ TYPE ERRORS DETECTED');
        console.error('    The codebase has types that are out of sync with the backend.');
        console.error('    Fix the errors above, then re-run: pnpm update-api-types\n');
        process.exit(1);
    }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  update-api-types complete');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
