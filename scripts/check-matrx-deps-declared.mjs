#!/usr/bin/env node
/**
 * EVERY @ai-matrx PACKAGE THE APP IMPORTS IS DECLARED IN package.json.
 *
 * 2026-10-10: release v0.4.3122 imported `@ai-matrx/context-menu/react` while package.json never
 * listed @ai-matrx/context-menu. Locally pnpm had it beside another @ai-matrx package, so dev,
 * parse and check:matrx-imports were all green; Vercel's clean `pnpm install --frozen-lockfile`
 * did not link it and the build died "Module not found". This gate reads every tracked source
 * file and fails when an imported @ai-matrx package name is missing from dependencies /
 * devDependencies. Offline, ~1s.
 *
 *   node scripts/check-matrx-deps-declared.mjs              # check the repo
 *   node scripts/check-matrx-deps-declared.mjs --self-test  # prove it fails on a planted import
 */
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*|\bvi\.mock\s*\(\s*|\bjest\.mock\s*\(\s*)["'](@ai-matrx\/[a-z0-9][a-z0-9._-]*)(?:\/[^"']*)?["']/g;

function undeclared(root, files) {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const declared = new Set([
    manifest.name,
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ]);
  const missing = new Map();
  for (const file of files) {
    let text;
    try {
      text = readFileSync(join(root, file), "utf8");
    } catch {
      continue; // deleted in the working tree
    }
    for (const m of text.matchAll(IMPORT)) {
      const name = m[1];
      if (declared.has(name)) continue;
      if (!missing.has(name)) missing.set(name, []);
      const line = text.slice(0, m.index).split("\n").length;
      missing.get(name).push(`${file}:${line}`);
    }
  }
  return missing;
}

function trackedSources(root) {
  const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  // scripts/ and root configs hold fixture strings (`@ai-matrx/x`), never app imports.
  return out
    .split("\0")
    .filter((f) => SOURCE.test(f) && f.includes("/") && !f.startsWith("scripts/") && !f.includes("node_modules/") && !f.endsWith(".d.ts"));
}

function report(missing) {
  console.error(`[FAIL] [matrx-deps-declared] ${missing.size} @ai-matrx package(s) imported but not in package.json:\n`);
  for (const [name, where] of missing) {
    console.error(`  ${name}`);
    for (const w of where.slice(0, 5)) console.error(`    ${w}`);
    if (where.length > 5) console.error(`    … ${where.length - 5} more`);
  }
  console.error(`\n  Vercel's clean install links only declared packages. Add each as "latest":`);
  console.error(`    pnpm add ${[...missing.keys()].map((n) => `${n}@latest`).join(" ")}`);
}

if (process.argv.includes("--self-test")) {
  const dir = mkdtempSync(join(tmpdir(), "matrx-deps-declared-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fixture", dependencies: { "@ai-matrx/chat": "latest" } }));
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src/ok.tsx"), `import { X } from "@ai-matrx/chat/surfaces";\n`);
  writeFileSync(join(dir, "src/bad.tsx"), `import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";\nconst m = await import('@ai-matrx/menus');\n`);
  const missing = undeclared(dir, ["src/ok.tsx", "src/bad.tsx"]);
  const names = [...missing.keys()].sort().join(",");
  if (names !== "@ai-matrx/context-menu,@ai-matrx/menus") {
    console.error(`[FAIL] [matrx-deps-declared] self-test: expected context-menu + menus flagged, got "${names}"`);
    process.exit(1);
  }
  console.log("[matrx-deps-declared] self-test ok — a planted undeclared import fails, a declared one passes");
  process.exit(0);
}

const root = process.cwd();
const missing = undeclared(root, trackedSources(root));
if (missing.size) {
  report(missing);
  process.exit(1);
}
console.log("[matrx-deps-declared] ok — every imported @ai-matrx package is declared in package.json");
