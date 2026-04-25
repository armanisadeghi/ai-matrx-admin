/**
 * migrate-barrel-imports.ts
 *
 * Rewrites imports that go through barrel index.ts files to direct source imports.
 *
 * USAGE:
 *   # Dry run (report only, no changes) — always run this first:
 *   npx ts-node scripts/migrate-barrel-imports.ts --dry-run
 *
 *   # Process a limited batch (default 5 barrels) with a report:
 *   npx ts-node scripts/migrate-barrel-imports.ts --batch 5
 *
 *   # Process a specific barrel only:
 *   npx ts-node scripts/migrate-barrel-imports.ts --barrel features/agents/redux/agent-apps/index.ts
 *
 *   # Process all partial barrels (after you've validated a batch):
 *   npx ts-node scripts/migrate-barrel-imports.ts --all
 *
 *   # After rewriting, delete the barrel files that are now empty/unused:
 *   npx ts-node scripts/migrate-barrel-imports.ts --batch 5 --delete-empty
 *
 * HOW IT WORKS:
 *   1. Reads barrel-migration-status.json to get the list of barrels needing migration.
 *   2. For each barrel, builds a map of { exportedSymbol → actual source file }.
 *   3. Scans all .ts/.tsx files for imports from that barrel.
 *   4. Rewrites each import to use the direct source file path.
 *   5. Writes a detailed report to scripts/barrel-migration-report.json.
 *
 * SAFETY:
 *   - --dry-run never touches files. Always start here.
 *   - The script preserves type-only imports (import type { ... }).
 *   - It handles named imports, not namespace (import * as X) imports.
 *   - Namespace imports are logged as manual-review items in the report.
 */

import { Project, SourceFile, ImportDeclaration, SyntaxKind } from "ts-morph";
import * as path from "path";
import * as fs from "fs";

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const STATUS_FILE = path.join(ROOT, "scripts", "barrel-migration-status.json");
const REPORT_FILE = path.join(ROOT, "scripts", "barrel-migration-report.json");
const TSCONFIG = path.join(ROOT, "tsconfig.json");

// ─── Args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const DELETE_EMPTY = args.includes("--delete-empty");
const ALL = args.includes("--all");
const BATCH = (() => {
  const idx = args.indexOf("--batch");
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10);
  return ALL ? Infinity : 5;
})();
const SINGLE_BARREL = (() => {
  const idx = args.indexOf("--barrel");
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return null;
})();

if (DRY_RUN) {
  console.log("🔍 DRY RUN — no files will be modified\n");
} else if (SINGLE_BARREL) {
  console.log(`🎯 Processing single barrel: ${SINGLE_BARREL}\n`);
} else if (ALL) {
  console.log("🚀 Processing ALL partial barrels\n");
} else {
  console.log(`📦 Batch mode — processing up to ${BATCH} barrels\n`);
}

// ─── Load status ─────────────────────────────────────────────────────────────

interface BarrelPartial {
  file: string;
  unused_exports: string[];
  unused_types: string[];
}

interface StatusFile {
  barrels_partial: BarrelPartial[];
  barrels_fully_unused: string[];
}

const status: StatusFile = JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8"));

// Pick which barrels to process
let barrelsToProcess: string[] = status.barrels_partial.map((b) => b.file);
if (SINGLE_BARREL) {
  barrelsToProcess = [SINGLE_BARREL];
} else if (!ALL) {
  barrelsToProcess = barrelsToProcess.slice(0, BATCH);
}

console.log(`Processing ${barrelsToProcess.length} barrel(s):\n`);
barrelsToProcess.forEach((b) => console.log(`  ${b}`));
console.log();

// ─── Set up ts-morph project ──────────────────────────────────────────────────

const project = new Project({
  tsConfigFilePath: TSCONFIG,
  skipAddingFilesFromTsConfig: false,
  addFilesFromTsConfig: true,
});

// ─── Helper: resolve @/ alias to absolute path ───────────────────────────────

function resolveAlias(importPath: string): string | null {
  if (importPath.startsWith("@/")) {
    return path.join(ROOT, importPath.slice(2));
  }
  return null;
}

// ─── Helper: resolve a specifier to an @/ import path ───────────────────────

function resolveSpecifierToAtPath(
  specifier: string,
  fromDir: string,
): string | null {
  let resolvedAbs: string;
  if (specifier.startsWith(".")) {
    resolvedAbs = path.resolve(fromDir, specifier);
  } else if (specifier.startsWith("@/")) {
    resolvedAbs = resolveAlias(specifier)!;
  } else {
    return null; // External — skip
  }

  const candidates = [
    resolvedAbs,
    resolvedAbs + ".ts",
    resolvedAbs + ".tsx",
    path.join(resolvedAbs, "index.ts"),
    path.join(resolvedAbs, "index.tsx"),
  ];
  const actualPath = candidates.find((c) => fs.existsSync(c));
  if (!actualPath) return null;

  const relToRoot = path.relative(ROOT, actualPath).replace(/\\/g, "/");
  return "@/" + relToRoot.replace(/\.(ts|tsx)$/, "");
}

// ─── Helper: get the module specifier a barrel's re-export points to ─────────

function buildExportMap(barrelFile: SourceFile): Map<string, string> {
  const map = new Map<string, string>();
  const barrelDir = path.dirname(barrelFile.getFilePath());

  // Pattern 1: export { X } from './source'  (direct re-exports)
  for (const exportDecl of barrelFile.getExportDeclarations()) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;

    const atPath = resolveSpecifierToAtPath(moduleSpecifier, barrelDir);
    if (!atPath) continue;

    const namedExports = exportDecl.getNamedExports();
    if (namedExports.length > 0) {
      for (const ne of namedExports) {
        const localName =
          ne.getAliasNode()?.getText() ?? ne.getNameNode().getText();
        map.set(localName, atPath);
      }
    } else if (exportDecl.isNamespaceExport()) {
      map.set("__namespace__:" + moduleSpecifier, atPath);
    } else {
      // export * from './source' — wildcard, mark with a sentinel
      map.set("__star__:" + moduleSpecifier, atPath);
    }
  }

  // Pattern 2: import X from './source'; export { X }
  // Build a local-name → source-file map from all imports in the barrel
  const localImportMap = new Map<string, string>(); // localName → @/path
  for (const importDecl of barrelFile.getImportDeclarations()) {
    const specifier = importDecl.getModuleSpecifierValue();
    const atPath = resolveSpecifierToAtPath(specifier, barrelDir);
    if (!atPath) continue;

    // Default import: import X from './file'
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport) {
      localImportMap.set(defaultImport.getText(), atPath);
    }

    // Named imports: import { X, Y } from './file'
    for (const ni of importDecl.getNamedImports()) {
      const localName =
        ni.getAliasNode()?.getText() ?? ni.getNameNode().getText();
      localImportMap.set(localName, atPath);
    }

    // Namespace import: import * as X from './file'
    const nsImport = importDecl.getNamespaceImport();
    if (nsImport) {
      localImportMap.set(nsImport.getText(), atPath);
    }
  }

  // Now scan export { X } statements that reference local names
  for (const exportDecl of barrelFile.getExportDeclarations()) {
    if (exportDecl.getModuleSpecifierValue()) continue; // already handled above
    for (const ne of exportDecl.getNamedExports()) {
      const localName = ne.getNameNode().getText();
      const exportedName = ne.getAliasNode()?.getText() ?? localName;
      const atPath = localImportMap.get(localName);
      if (atPath) {
        map.set(exportedName, atPath);
      }
    }
  }

  return map;
}

// ─── Report structure ─────────────────────────────────────────────────────────

interface ReportBarrel {
  barrel: string;
  consumers_found: number;
  imports_rewritten: number;
  manual_review: string[];
  errors: string[];
}

interface Report {
  generated_at: string;
  dry_run: boolean;
  barrels_processed: number;
  total_imports_rewritten: number;
  total_manual_review: number;
  barrels: ReportBarrel[];
}

const report: Report = {
  generated_at: new Date().toISOString(),
  dry_run: DRY_RUN,
  barrels_processed: 0,
  total_imports_rewritten: 0,
  total_manual_review: 0,
  barrels: [],
};

// ─── Main migration loop ──────────────────────────────────────────────────────

async function main() {
  for (const barrelRelPath of barrelsToProcess) {
    const barrelAbsPath = path.join(ROOT, barrelRelPath);

    const barrelEntry: ReportBarrel = {
      barrel: barrelRelPath,
      consumers_found: 0,
      imports_rewritten: 0,
      manual_review: [],
      errors: [],
    };

    // Find the barrel source file in the ts-morph project
    const barrelSF = project.getSourceFile(barrelAbsPath);
    if (!barrelSF) {
      barrelEntry.errors.push(
        `Source file not found in project: ${barrelAbsPath}`,
      );
      report.barrels.push(barrelEntry);
      console.warn(`  ⚠️  Not in project: ${barrelRelPath}`);
      continue;
    }

    // Build export → source file map
    const exportMap = buildExportMap(barrelSF);
    if (exportMap.size === 0) {
      barrelEntry.errors.push(
        "Could not build export map — no re-exports found or all external",
      );
      report.barrels.push(barrelEntry);
      console.warn(`  ⚠️  No re-exports resolved: ${barrelRelPath}`);
      continue;
    }

    // Build the @/ import path for the barrel itself
    const barrelAtPath = "@/" + barrelRelPath.replace(/\.(ts|tsx)$/, "");
    // Also try without /index suffix
    const barrelAtPathNoIndex = barrelAtPath.replace(/\/index$/, "");

    // Find all files that import from this barrel
    const allSourceFiles = project.getSourceFiles();
    const consumers = allSourceFiles.filter((sf) => {
      if (sf.getFilePath() === barrelAbsPath) return false;
      return sf.getImportDeclarations().some((imp) => {
        const spec = imp.getModuleSpecifierValue();
        return spec === barrelAtPath || spec === barrelAtPathNoIndex;
      });
    });

    barrelEntry.consumers_found = consumers.length;
    console.log(`\n  📁 ${barrelRelPath}`);
    console.log(
      `     Export map: ${exportMap.size} symbols → ${new Set(exportMap.values()).size} source files`,
    );
    console.log(`     Consumers:  ${consumers.length} files`);

    for (const consumerSF of consumers) {
      const consumerPath = path.relative(ROOT, consumerSF.getFilePath());
      const importsToProcess = consumerSF
        .getImportDeclarations()
        .filter((imp) => {
          const spec = imp.getModuleSpecifierValue();
          return spec === barrelAtPath || spec === barrelAtPathNoIndex;
        });

      for (const importDecl of importsToProcess) {
        // Handle namespace imports (import * as X from '...') — manual review
        if (importDecl.getNamespaceImport()) {
          const note = `${consumerPath}: namespace import 'import * as X from "${importDecl.getModuleSpecifierValue()}"' — requires manual rewrite`;
          barrelEntry.manual_review.push(note);
          console.log(`     ⚠️  Namespace import in ${consumerPath}`);
          continue;
        }

        const namedImports = importDecl.getNamedImports();
        const isTypeOnly = importDecl.isTypeOnly();

        // Group named imports by their target source file
        const byTarget = new Map<string, string[]>();
        const unresolved: string[] = [];

        for (const ni of namedImports) {
          const name =
            ni.getAliasNode()?.getText() ?? ni.getNameNode().getText();
          const target = exportMap.get(name);
          if (!target) {
            // Could be a re-export of * — try namespace lookup
            const nsEntry = [...exportMap.entries()].find(([k]) =>
              k.startsWith("__namespace__:"),
            );
            if (nsEntry) {
              const t = nsEntry[1];
              if (!byTarget.has(t)) byTarget.set(t, []);
              byTarget.get(t)!.push(ni.getText());
            } else {
              unresolved.push(name);
            }
          } else {
            if (!byTarget.has(target)) byTarget.set(target, []);
            byTarget.get(target)!.push(ni.getText());
          }
        }

        if (unresolved.length > 0) {
          const note = `${consumerPath}: symbols [${unresolved.join(", ")}] not found in barrel export map — kept as-is`;
          barrelEntry.manual_review.push(note);
          console.log(
            `     ⚠️  Unresolved symbols in ${consumerPath}: ${unresolved.join(", ")}`,
          );
          // Don't touch this import if any symbol is unresolved
          continue;
        }

        if (byTarget.size === 0) continue;

        console.log(`     ✓  Rewriting ${consumerPath}`);

        if (!DRY_RUN) {
          // Remove the old barrel import
          importDecl.remove();

          // Insert new direct imports, one per target file
          // Re-read the source file after removal to get updated structure
          let insertPos = 0; // Insert at top
          for (const [targetPath, symbols] of byTarget.entries()) {
            const importText = isTypeOnly
              ? `import type { ${symbols.join(", ")} } from '${targetPath}';`
              : `import { ${symbols.join(", ")} } from '${targetPath}';`;
            consumerSF.insertImportDeclaration(insertPos, {
              moduleSpecifier: targetPath,
              namedImports: symbols.map((s) => ({ name: s })),
              isTypeOnly,
            });
            insertPos++;
          }

          await consumerSF.save();
        }

        barrelEntry.imports_rewritten++;
        report.total_imports_rewritten++;
      }
    }

    // Optionally delete the barrel if it's now empty/fully migrated
    if (
      DELETE_EMPTY &&
      !DRY_RUN &&
      barrelEntry.imports_rewritten > 0 &&
      barrelEntry.manual_review.length === 0
    ) {
      if (fs.existsSync(barrelAbsPath)) {
        fs.unlinkSync(barrelAbsPath);
        console.log(`     🗑️  Deleted barrel: ${barrelRelPath}`);
      }
    }

    report.barrels.push(barrelEntry);
    report.barrels_processed++;
    report.total_manual_review += barrelEntry.manual_review.length;
  }

  // ─── Write report ─────────────────────────────────────────────────────────────

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));
  console.log(`  Barrels processed:     ${report.barrels_processed}`);
  console.log(`  Imports rewritten:     ${report.total_imports_rewritten}`);
  console.log(`  Manual review items:   ${report.total_manual_review}`);
  console.log(
    `  Mode:                  ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}`,
  );
  console.log(`\n  Report written to: scripts/barrel-migration-report.json`);
  console.log(`  Status file at:    scripts/barrel-migration-status.json`);
  console.log("═".repeat(60));

  if (DRY_RUN) {
    console.log(
      "\n✅ Dry run complete. Review the report, then run without --dry-run to apply.",
    );
  } else {
    console.log(
      "\n✅ Done. Run knip again + update barrel-migration-status.json to track progress.",
    );
    console.log("   Command: pnpm barrels:status");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
