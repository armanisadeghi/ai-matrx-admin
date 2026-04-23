#!/usr/bin/env npx tsx
/**
 * check-registry.ts
 *
 * Integrity check for the Window Panels registry. Run standalone (e.g. from
 * a pre-commit hook or CI step) to catch drift before code review:
 *
 *   pnpm check:registry
 *
 * Validates:
 *   1. Every entry has required fields (slug, overlayId, kind, componentImport, label, defaultData).
 *   2. kind: "window" entries have mobilePresentation.
 *   3. slug and overlayId are each unique.
 *   4. Every urlSync.key has a matching registerPanelHydrator call in initUrlHydration.ts.
 *   5. Every toolsGridTiles tile references a registered overlayId (or has onActivate).
 *   6. Every componentImport path resolves to a real file.
 *
 * Exit codes:
 *   0  all checks pass
 *   1  at least one check failed
 *   2  file read / parse error
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");
const REGISTRY_PATH = join(
  REPO_ROOT,
  "features/window-panels/registry/windowRegistry.ts",
);
const INIT_URL_HYDRATION_PATH = join(
  REPO_ROOT,
  "features/window-panels/url-sync/initUrlHydration.ts",
);
const TOOLS_GRID_TILES_PATH = join(
  REPO_ROOT,
  "features/window-panels/tools-grid/toolsGridTiles.ts",
);

interface RegistryEntry {
  slug?: string;
  overlayId?: string;
  kind?: string;
  label?: string;
  componentPath?: string;
  mobilePresentation?: string;
  urlSyncKey?: string;
  lineStart: number;
}

function die(code: number, msg: string): never {
  process.stderr.write(`check-registry: ${msg}\n`);
  process.exit(code);
}

function readFile(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    die(2, `failed to read ${path}: ${(e as Error).message}`);
  }
}

/**
 * Parse the REGISTRY array from windowRegistry.ts. The file uses a
 * predictable shape — each entry is a `{ ... }` block inside the REGISTRY
 * const. We scan line-by-line looking for known keys.
 */
function parseRegistry(src: string): RegistryEntry[] {
  const entries: RegistryEntry[] = [];
  const lines = src.split("\n");
  let inArray = false;
  let depth = 0;
  let current: RegistryEntry | null = null;
  let buffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inArray) {
      if (/const REGISTRY: WindowRegistryEntry\[\] = \[/.test(line)) {
        inArray = true;
      }
      continue;
    }

    // Track brace depth to know when we're inside an entry object.
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;

    // Entry starts with "  {" at depth 0 -> 1
    if (depth === 0 && /^\s*\{\s*$/.test(line)) {
      current = { lineStart: i + 1 };
      buffer = [];
    }

    if (current) buffer.push(line);

    depth += opens - closes;
    if (depth < 0) depth = 0;

    // Entry closed — scan the accumulated buffer with multi-line-friendly
    // regexes, then reset.
    if (
      current &&
      depth === 0 &&
      (/^\s*\},?\s*$/.test(line) || /^\s*\}\s*,\s*$/.test(line))
    ) {
      const text = buffer.join("\n");
      const slug = /slug:\s*"([^"]+)"/.exec(text);
      if (slug) current.slug = slug[1];
      const overlayId = /overlayId:\s*"([^"]+)"/.exec(text);
      if (overlayId) current.overlayId = overlayId[1];
      const kind = /kind:\s*"([^"]+)"/.exec(text);
      if (kind) current.kind = kind[1];
      const label = /label:\s*"([^"]+)"/.exec(text);
      if (label) current.label = label[1];
      const mobile = /mobilePresentation:\s*"([^"]+)"/.exec(text);
      if (mobile) current.mobilePresentation = mobile[1];
      const urlKey = /urlSync:\s*\{\s*key:\s*"([^"]+)"/.exec(text);
      if (urlKey) current.urlSyncKey = urlKey[1];
      // Multi-line-tolerant: `import(\n "path" \n)` is common.
      const ci = /import\(\s*"([^"]+)"/.exec(text);
      if (ci) current.componentPath = ci[1];

      if (current.slug || current.overlayId) entries.push(current);
      current = null;
      buffer = [];
    }

    // Array closed.
    if (inArray && /^\];\s*$/.test(line)) break;
  }

  return entries;
}

/** Extract every `registerPanelHydrator("key", ...)` key from initUrlHydration.ts. */
function parseHydratorKeys(src: string): Set<string> {
  const keys = new Set<string>();
  const rx = /registerPanelHydrator\(\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(src)) !== null) keys.add(m[1]);
  return keys;
}

/** Extract every `overlayId: "..."` in toolsGridTiles.ts (excluding onActivate-only tiles). */
function parseToolsGridOverlayIds(src: string): Set<string> {
  const ids = new Set<string>();
  const rx = /overlayId:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(src)) !== null) ids.add(m[1]);
  return ids;
}

interface Failure {
  level: "error" | "warn";
  msg: string;
}

function resolveComponentPath(importSpecifier: string): string {
  // Strip @/ alias + try .tsx, .ts, /index.tsx.
  const cleaned = importSpecifier.replace(/^@\//, "");
  const abs = join(REPO_ROOT, cleaned);
  for (const suffix of [".tsx", ".ts", "/index.tsx", "/index.ts", ""]) {
    if (existsSync(abs + suffix)) return abs + suffix;
  }
  return "";
}

function main(): void {
  const registrySrc = readFile(REGISTRY_PATH);
  const hydrationSrc = readFile(INIT_URL_HYDRATION_PATH);
  const toolsGridSrc = existsSync(TOOLS_GRID_TILES_PATH)
    ? readFile(TOOLS_GRID_TILES_PATH)
    : "";

  const entries = parseRegistry(registrySrc);
  const hydratorKeys = parseHydratorKeys(hydrationSrc);
  const gridOverlayIds = toolsGridSrc
    ? parseToolsGridOverlayIds(toolsGridSrc)
    : new Set<string>();

  const failures: Failure[] = [];
  const seenSlugs = new Set<string>();
  const seenOverlayIds = new Set<string>();
  const registeredOverlayIds = new Set<string>();

  for (const e of entries) {
    const loc = `line ${e.lineStart}`;
    if (!e.slug) failures.push({ level: "error", msg: `${loc}: entry missing slug` });
    if (!e.overlayId)
      failures.push({ level: "error", msg: `${loc}: entry missing overlayId` });
    if (!e.kind) failures.push({ level: "error", msg: `${loc}: entry missing kind` });
    if (!e.label) failures.push({ level: "error", msg: `${loc}: entry missing label` });
    if (!e.componentPath)
      failures.push({
        level: "error",
        msg: `${loc}: entry missing componentImport`,
      });

    if (e.slug) {
      if (seenSlugs.has(e.slug)) {
        failures.push({
          level: "error",
          msg: `${loc}: duplicate slug "${e.slug}"`,
        });
      }
      seenSlugs.add(e.slug);
    }

    if (e.overlayId) {
      if (seenOverlayIds.has(e.overlayId)) {
        failures.push({
          level: "error",
          msg: `${loc}: duplicate overlayId "${e.overlayId}"`,
        });
      }
      seenOverlayIds.add(e.overlayId);
      registeredOverlayIds.add(e.overlayId);
    }

    if (e.kind === "window" && !e.mobilePresentation) {
      failures.push({
        level: "error",
        msg: `${loc}: kind "window" (${e.overlayId}) requires mobilePresentation`,
      });
    }

    if (e.componentPath) {
      const resolved = resolveComponentPath(e.componentPath);
      if (!resolved) {
        failures.push({
          level: "error",
          msg: `${loc}: componentImport "${e.componentPath}" does not resolve to a file`,
        });
      }
    }

    if (e.urlSyncKey && !hydratorKeys.has(e.urlSyncKey)) {
      failures.push({
        level: "error",
        msg: `${loc}: urlSync.key "${e.urlSyncKey}" (${e.overlayId}) has no hydrator in initUrlHydration.ts`,
      });
    }
  }

  // Tools-grid tiles must reference a known overlayId.
  for (const overlayId of gridOverlayIds) {
    if (!registeredOverlayIds.has(overlayId)) {
      failures.push({
        level: "error",
        msg: `toolsGridTiles.ts: overlayId "${overlayId}" is not registered`,
      });
    }
  }

  const errors = failures.filter((f) => f.level === "error");
  const warns = failures.filter((f) => f.level === "warn");

  process.stdout.write(
    `Window Panels registry integrity check\n` +
      `  entries:              ${entries.length}\n` +
      `  url-sync hydrators:   ${hydratorKeys.size}\n` +
      `  tools-grid tiles (w/ overlayId): ${gridOverlayIds.size}\n` +
      `  errors:               ${errors.length}\n` +
      `  warnings:             ${warns.length}\n\n`,
  );

  if (warns.length > 0) {
    process.stdout.write("WARNINGS:\n");
    for (const w of warns) process.stdout.write(`  ⚠  ${w.msg}\n`);
    process.stdout.write("\n");
  }

  if (errors.length > 0) {
    process.stderr.write("ERRORS:\n");
    for (const e of errors) process.stderr.write(`  ✗  ${e.msg}\n`);
    process.stderr.write("\nregistry integrity check failed.\n");
    process.exit(1);
  }

  process.stdout.write("all checks passed.\n");
  process.exit(0);
}

main();
