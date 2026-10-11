#!/usr/bin/env npx tsx
/**
 * check:intelligence-placement-from-data — the Intelligence pages never place a
 * job from a hand map again.
 *
 * THE RULE (Arman, mandates HANDOFF §1; plan common-docs systems/intelligence/
 * mandates/projects/intelligence-from-data §6.2): grouping comes from real data
 * only — a job's node is read from `mandate.intelligence_placement`, the tree
 * from `platform.taxonomy_node`. The hand snapshot (`taxonomy.ts`) and the 84
 * hand rules (`placement.ts`) were deleted; this keeps them deleted.
 *
 * WHAT THIS FLAGS, in `features/mandates/feature-intelligence/**` and
 * `app/(core)/intelligence/**` (tests excluded, comments ignored):
 *   - one array, object or call holding TWO OR MORE live registry slug literals
 *     as values (property NAMES are not counted, so an icon table keyed by
 *     slug is fine; a single `"research"` is fine);
 *   - a mandate-key pattern (`ns.*`, `ns.key`) beside a live slug literal in the
 *     same array, object or call — a key mapped to a place;
 *   - an import of a static registry module (`…/taxonomy`, `…/placement`);
 *   - the retired identifiers: PLACEMENT_RULES, REGISTRY_DOMAINS,
 *     SECTION_OF_FEATURE, DOMAINS_HOLDING_OWN_JOBS, placementForKey,
 *     targetForKey, legacyDestination.
 *
 * Slugs are read from the live DB. No credentials or no answer = UNMEASURED,
 * which exits 1 — never a green it did not earn.
 *
 *   pnpm check:intelligence-placement-from-data
 *   pnpm check:intelligence-placement-from-data --root <dir>   # scan another tree (proof runs)
 *   pnpm check:intelligence-placement-from-data --self-test    # a planted rule() line is red; removed, green
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const SELF_TEST = args.includes("--self-test");
const rootArg = args.indexOf("--root");
const ROOT = rootArg >= 0 && args[rootArg + 1] ? resolve(args[rootArg + 1]) : REPO;

const SCAN_DIRS = ["features/mandates/feature-intelligence", "app/(core)/intelligence"];
const RETIRED = new Set([
  "PLACEMENT_RULES",
  "REGISTRY_DOMAINS",
  "SECTION_OF_FEATURE",
  "DOMAINS_HOLDING_OWN_JOBS",
  "placementForKey",
  "targetForKey",
  "legacyDestination",
]);
const STATIC_REGISTRY_IMPORT = /(^|\/)(taxonomy|placement)(\.tsx?)?$/;
const KEY_PATTERN = /^[a-z][a-z0-9_]*\.(\*|[a-z0-9_*]+(\.[a-z0-9_*]+)*)$/;

export interface Finding {
  file: string;
  line: number;
  rule: string;
  text: string;
}

function isTest(path: string): boolean {
  return /(^|\/)__tests__\//.test(path) || /\.test\.tsx?$/.test(path);
}

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
}

/** Every finding in one file's source. Pure, so the self-test can feed it planted code. */
export function scanSource(file: string, source: string, slugs: ReadonlySet<string>): Finding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const findings: Finding[] = [];
  const at = (node: ts.Node, rule: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ file, line: line + 1, rule, text: node.getText(sf).split("\n")[0].slice(0, 120) });
  };
  /** String literals in VALUE positions directly inside a container (not property names). */
  const valueStrings = (node: ts.Node): string[] => {
    const items: ts.Node[] = [];
    if (ts.isArrayLiteralExpression(node)) {
      items.push(...node.elements);
      // A snapshot written as a list of records (`[{ id: "seo" }, { id: "notes" }]`).
      for (const element of node.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        for (const prop of element.properties) if (ts.isPropertyAssignment(prop)) items.push(prop.initializer);
      }
    }
    else if (ts.isCallExpression(node)) items.push(...node.arguments);
    else if (ts.isObjectLiteralExpression(node)) {
      for (const prop of node.properties) if (ts.isPropertyAssignment(prop)) items.push(prop.initializer);
    }
    return items
      .filter((item): item is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral =>
        ts.isStringLiteral(item) || ts.isNoSubstitutionTemplateLiteral(item))
      .map((item) => item.text);
  };
  const propertyKeyPatterns = (node: ts.Node): boolean => {
    if (!ts.isObjectLiteralExpression(node)) return false;
    return node.properties.some(
      (prop) =>
        ts.isPropertyAssignment(prop) &&
        (ts.isStringLiteral(prop.name) || ts.isIdentifier(prop.name)) &&
        KEY_PATTERN.test(prop.name.text) &&
        (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) &&
        slugs.has(prop.initializer.text),
    );
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (STATIC_REGISTRY_IMPORT.test(node.moduleSpecifier.text)) at(node, "static registry module import");
    }
    if (ts.isIdentifier(node) && RETIRED.has(node.text)) at(node, `retired identifier ${node.text}`);
    if (ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node) || ts.isCallExpression(node)) {
      const strings = valueStrings(node);
      const slugHits = strings.filter((text) => slugs.has(text));
      if (slugHits.length >= 2) at(node, `${slugHits.length} registry slugs in one list (${slugHits.slice(0, 3).join(", ")})`);
      else if (slugHits.length === 1 && strings.some((text) => KEY_PATTERN.test(text))) {
        at(node, `a mandate-key pattern beside the slug "${slugHits[0]}"`);
      } else if (propertyKeyPatterns(node)) at(node, "a mandate-key pattern mapped to a slug");
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

function loadEnv(): { url: string; key: string } | null {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let key = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!url || !key) {
    for (const f of [".env.local", ".env"]) {
      const p = join(REPO, f);
      if (!existsSync(p)) continue;
      for (const line of readFileSync(p, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
        if (!m) continue;
        const v = (m[2] ?? "").replace(/^['"]|['"]$/g, "");
        if (!url && m[1] === "NEXT_PUBLIC_SUPABASE_URL") url = v;
        if (!key && m[1] === "SUPABASE_SECRET_KEY") key = v;
      }
    }
  }
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function liveSlugs(): Promise<Set<string> | string> {
  const env = loadEnv();
  if (!env) return "no NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY";
  try {
    const res = await fetch(`${env.url}/rest/v1/taxonomy_node?select=slug`, {
      headers: { apikey: env.key, Authorization: `Bearer ${env.key}`, "Accept-Profile": "platform" },
    });
    if (!res.ok) return `taxonomy_node read failed: ${res.status}`;
    const rows = (await res.json()) as { slug?: string }[];
    const slugs = new Set(rows.map((row) => row.slug).filter((s): s is string => Boolean(s)));
    return slugs.size > 0 ? slugs : "taxonomy_node returned no slugs";
  } catch (error) {
    return `taxonomy_node read failed: ${String(error)}`;
  }
}

function selfTest(): number {
  const slugs = new Set(["agents", "agent-studio", "chat", "seo", "research", "notes"]);
  const planted = `const rule = (d: string, f: string | null, ...p: string[]) => p;\nexport const RULES = [...rule("agents", "agent-studio", "agent_factory.*")];\n`;
  const clean = `const rule = (d: string, f: string | null, ...p: string[]) => p;\nexport const RULES: string[] = [];\n`;
  const single = `export const NODE = "research"; const x = ["research"]; const icons = { seo: 1, notes: 2 };\n`;
  const keyMap = `const map = { "seo.*": "seo" };\n`;
  const retired = `import { REGISTRY_DOMAINS } from "./taxonomy";\n`;
  const snapshot = `export const NODES = [{ id: "seo", name: "SEO" }, { id: "notes", name: "Notes" }];\n`;
  const checks: [string, boolean][] = [
    ["RED   — a planted rule() line is flagged", scanSource("planted.ts", planted, slugs).length > 0],
    ["GREEN — the same file without it is clean", scanSource("clean.ts", clean, slugs).length === 0],
    ["QUIET — one slug, and slugs as property names, are not flagged", scanSource("single.ts", single, slugs).length === 0],
    ["RED   — a key pattern mapped to a slug is flagged", scanSource("map.ts", keyMap, slugs).length > 0],
    ["RED   — a static registry import and a retired name are flagged", scanSource("retired.ts", retired, slugs).length >= 2],
    ["RED   — a snapshot written as a list of records is flagged", scanSource("snapshot.ts", snapshot, slugs).length > 0],
  ];
  for (const [name, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${name}`);
  return checks.every(([, ok]) => ok) ? 0 : 1;
}

async function main(): Promise<number> {
  if (SELF_TEST) return selfTest();
  const slugs = await liveSlugs();
  if (typeof slugs === "string") {
    console.error(`✗ UNMEASURED — ${slugs}; nothing was checked. This is a failure, not a pass.`);
    return 1;
  }
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(join(ROOT, dir), files);
  const findings = files
    .filter((file) => !isTest(relative(ROOT, file)))
    .flatMap((file) => scanSource(relative(ROOT, file), readFileSync(file, "utf8"), slugs));
  if (findings.length === 0) {
    console.log(`✓ intelligence placement comes from data — ${files.length} files, ${slugs.size} live slugs`);
    return 0;
  }
  for (const f of findings) console.error(`✗ ${f.file}:${f.line}  ${f.rule}\n    ${f.text}`);
  console.error(`\n${findings.length} finding(s): placement must come from mandate.intelligence_placement and platform.taxonomy_node, never a hand map.`);
  return 1;
}

main().then((code) => process.exit(code));
