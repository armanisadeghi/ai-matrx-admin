#!/usr/bin/env npx tsx
/**
 * check-public-imports.ts
 *
 * Detects when public route files transitively import the full Redux store
 * or root reducer, which adds ~2s to load time.
 *
 * Usage:
 *   npx tsx scripts/check-public-imports.ts
 *   pnpm check:public-imports
 *
 * Exit code:
 *   0 = no violations
 *   1 = violations found
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Files that should NEVER be imported (directly or transitively) from public routes
const FORBIDDEN_IMPORTS = [
    'lib/redux/store.ts',
    'lib/redux/store',
    'lib/redux/rootReducer.ts',
    'lib/redux/rootReducer',
    '@/lib/redux/store',
    '@/lib/redux/rootReducer',
];

// Entry points to check
const PUBLIC_DIRS = [
    'app/(public)',
];

// Cache for parsed imports
const importCache = new Map<string, string[]>();
// Track visited files to avoid cycles
const visiting = new Set<string>();

function resolveImport(importPath: string, fromFile: string): string | null {
    // Handle @ alias
    if (importPath.startsWith('@/')) {
        importPath = importPath.replace('@/', '');
        return path.join(PROJECT_ROOT, importPath);
    }

    // Relative imports
    if (importPath.startsWith('.')) {
        const dir = path.dirname(fromFile);
        return path.resolve(dir, importPath);
    }

    // Node modules — skip
    return null;
}

function findActualFile(resolved: string): string | null {
    // Try exact path
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;

    // Try common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) return withExt;
    }

    // Try index files
    for (const ext of extensions) {
        const indexPath = path.join(resolved, 'index' + ext);
        if (fs.existsSync(indexPath)) return indexPath;
    }

    return null;
}

function extractImports(filePath: string): string[] {
    if (importCache.has(filePath)) return importCache.get(filePath)!;

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const imports: string[] = [];

        // Match import statements and dynamic imports
        const staticImportRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
        const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
        const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

        for (const regex of [staticImportRegex, dynamicImportRegex, requireRegex]) {
            let match;
            while ((match = regex.exec(content)) !== null) {
                imports.push(match[1]);
            }
        }

        importCache.set(filePath, imports);
        return imports;
    } catch {
        return [];
    }
}

interface Violation {
    entryFile: string;
    chain: string[];
    forbiddenImport: string;
}

function checkFile(
    filePath: string,
    chain: string[],
    violations: Violation[],
    entryFile: string,
): void {
    const absolutePath = findActualFile(filePath);
    if (!absolutePath) return;

    // Cycle detection
    if (visiting.has(absolutePath)) return;
    visiting.add(absolutePath);

    const imports = extractImports(absolutePath);
    const relativePath = path.relative(PROJECT_ROOT, absolutePath);

    for (const imp of imports) {
        // Check if this import is forbidden
        const isForbidden = FORBIDDEN_IMPORTS.some(forbidden => {
            if (imp === forbidden) return true;
            if (imp.endsWith('/' + forbidden)) return true;
            // Check resolved path
            const resolved = resolveImport(imp, absolutePath);
            if (resolved) {
                const relResolved = path.relative(PROJECT_ROOT, resolved);
                return FORBIDDEN_IMPORTS.some(f => relResolved === f || relResolved.startsWith(f));
            }
            return false;
        });

        if (isForbidden) {
            violations.push({
                entryFile,
                chain: [...chain, relativePath, imp],
                forbiddenImport: imp,
            });
            continue;
        }

        // Recurse into resolved imports (skip node_modules)
        const resolved = resolveImport(imp, absolutePath);
        if (resolved) {
            const actual = findActualFile(resolved);
            if (actual && !actual.includes('node_modules')) {
                checkFile(actual, [...chain, relativePath], violations, entryFile);
            }
        }
    }

    visiting.delete(absolutePath);
}

function findPublicFiles(): string[] {
    const files: string[] = [];

    function walk(dir: string) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules') continue;
                walk(fullPath);
            } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
                files.push(fullPath);
            }
        }
    }

    for (const publicDir of PUBLIC_DIRS) {
        walk(path.join(PROJECT_ROOT, publicDir));
    }

    return files;
}

// ============================================================================
// MAIN
// ============================================================================

console.log('Checking public routes for full Redux store imports...\n');

const publicFiles = findPublicFiles();
console.log(`Found ${publicFiles.length} files in public routes\n`);

const violations: Violation[] = [];

for (const file of publicFiles) {
    const relativePath = path.relative(PROJECT_ROOT, file);
    visiting.clear();
    checkFile(file, [], violations, relativePath);
}

if (violations.length === 0) {
    console.log('No violations found. Public routes are clean.');
    process.exit(0);
} else {
    console.log(`Found ${violations.length} violation(s):\n`);
    for (const v of violations) {
        console.log(`  VIOLATION in ${v.entryFile}`);
        console.log(`    Chain: ${v.chain.join(' -> ')}`);
        console.log(`    Forbidden: ${v.forbiddenImport}`);
        console.log();
    }
    console.log('Fix: Use dynamic imports for components that need the full Redux store.');
    process.exit(1);
}
