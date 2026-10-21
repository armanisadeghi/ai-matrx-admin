#!/usr/bin/env node
/**
 * check:derived-breadcrumbs — BREADCRUMBS ARE DERIVED, NEVER TYPED (feature-pages rule 7; Arman, 2026-10-19).
 *
 * One breadcrumb builds the trail from the address + the menu + the route tree
 * (features/shell/breadcrumbs). A page supplies only its record. A hand-typed trail is a defect:
 *
 *   hand-typed-parents|<file>   `parents={[ … ]}` / `parents={[` passed to RecordPageHeader.
 *   hand-typed-trail|<file>     `trail={[ … ]}` literal handed to CrumbTrailHeader / EntityModeHeader.
 *
 * Wrong words for one route are fixed in features/shell/breadcrumbs/trail-overrides.ts, never in the page.
 * A deliberate exception carries `derived-exception: <reason>` on the line or within 3 lines above; it
 * ratchets too. BASELINE (scripts/derived-breadcrumbs/baseline.json) ONLY SHRINKS.
 *
 *   node scripts/derived-breadcrumbs/check-derived-breadcrumbs.mjs [paths…] [--strict] [--shrink] [--list]
 *   node scripts/derived-breadcrumbs/check-derived-breadcrumbs.mjs --write-initial-baseline
 *   node scripts/derived-breadcrumbs/check-derived-breadcrumbs.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emitItem, endItems } from "../checks/items.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TAG = "[derived-breadcrumbs]";
const BASELINE = "scripts/derived-breadcrumbs/baseline.json";
const FIX =
  "Delete the typed trail. A record page passes only its record — <RecordPageHeader record={{ name }} /> (or nothing: the key, declared name or id is used); the levels above come from the address, the menu and the route tree. A wrong word for one route goes in features/shell/breadcrumbs/trail-overrides.ts. Genuinely not an address trail? `derived-exception: <reason>`.";

export const RULES = {
  "hand-typed-parents": { title: "hand-typed breadcrumb parents", fix: FIX },
  "hand-typed-trail": { title: "hand-typed breadcrumb trail", fix: FIX },
  "derived-exception": { title: "derived-breadcrumb exception", fix: "A new `derived-exception:` is reviewed like any new item: say why this trail cannot come from the address." },
};

export function remedyForKey(key) {
  return RULES[String(key).split("|")[0]]?.fix ?? null;
}

// The derivation itself, the render primitives that DEFINE the props, tests, demos and playgrounds.
const OUT_OF_SCOPE =
  /(^|\/)node_modules\/|\/dist\/|\.(test|spec)\.tsx?$|\/__tests__\/|^app\/\((dev|lab)\)\/|\/demos?\/|\.stories\.tsx$|(^|\/)(playground|scripts)\/|^features\/shell\/breadcrumbs\/|^features\/shell\/components\/header\/templates\/(CrumbTrailHeader|EntityModeHeader|RecordPageHeader|RouteTreeBreadcrumbHeader)\.tsx$/;

const PARENTS_RE = /\bparents\s*=\s*\{/;
const TRAIL_RE = /\btrail\s*=\s*\{\s*\[/;

function excepted(lines, i) {
  for (let k = Math.max(0, i - 3); k <= i; k++) if (/derived-exception:/.test(lines[k] ?? "")) return true;
  return false;
}

/** One file's sites: [{ rule, line, what }]. */
export function scanSource(file, text) {
  if (OUT_OF_SCOPE.test(file)) return [];
  const lines = text.split("\n");
  const sites = [];
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || /^(\/\/|\*|\/\*)/.test(line)) return;
    let rule = null;
    let what = "";
    let m = line.match(PARENTS_RE);
    if (m) { rule = "hand-typed-parents"; what = m[0]; }
    else if ((m = line.match(TRAIL_RE))) { rule = "hand-typed-trail"; what = m[0]; }
    if (!rule) return;
    sites.push(excepted(lines, i) ? { rule: "derived-exception", line: i + 1, what: `${what} (${rule})` } : { rule, line: i + 1, what });
  });
  return sites;
}

function gitFiles(cwd) {
  try {
    return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.tsx"], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function collect({ root = ROOT, paths = null } = {}) {
  let files = gitFiles(root).filter((f) => !OUT_OF_SCOPE.test(f));
  if (paths) files = files.filter((f) => paths.some((p) => f === p || f.startsWith(`${p.replace(/\/+$/, "")}/`)));
  const byKey = new Map();
  for (const rel of files) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    for (const site of scanSource(rel, readFileSync(abs, "utf8"))) {
      const key = `${site.rule}|${rel}`;
      if (!byKey.has(key)) byKey.set(key, { key, rule: site.rule, file: rel, sites: [] });
      byKey.get(key).sites.push(site);
    }
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function readBaseline(root) {
  const abs = join(root, BASELINE);
  return existsSync(abs) ? (JSON.parse(readFileSync(abs, "utf8")).counts ?? {}) : {};
}

function writeBaseline(root, counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    join(root, BASELINE),
    `${JSON.stringify({ note: "Shrink-only: hand-typed breadcrumb trails not yet derived (the adoption census). Lower a count by deleting a typed trail; never add a key or raise a count (scripts/derived-breadcrumbs/check-derived-breadcrumbs.mjs).", counts: sorted }, null, 2)}\n`,
  );
}

export function main(argv = process.argv.slice(2), root = ROOT) {
  if (argv.includes("--self-test")) return selfTest();
  const pathArgs = argv.filter((a) => !a.startsWith("--"));
  const paths = pathArgs.length ? pathArgs : null;
  const found = collect({ root, paths });
  const baseline = readBaseline(root);
  if (argv.includes("--write-initial-baseline")) {
    if (existsSync(join(root, BASELINE))) {
      console.error(`${TAG} a baseline already exists — it only shrinks (--shrink)`);
      return 1;
    }
    writeBaseline(root, Object.fromEntries(found.map((f) => [f.key, f.sites.length])));
    console.log(`${TAG} initial baseline: ${found.length} item(s)`);
    return 0;
  }
  let fresh = 0;
  const isNew = (f) => f.sites.length > (baseline[f.key] ?? 0);
  for (const f of found) {
    const n = isNew(f);
    if (n) fresh += 1;
    emitItem({
      key: f.key,
      status: n ? "new" : "known",
      ...(n ? {} : { basis: "debt" }),
      title: `${f.sites.length} × ${RULES[f.rule].title}`,
      file: f.file,
      line: f.sites[0].line,
      rule: f.rule,
    });
  }
  if (!paths) endItems();
  for (const f of found) {
    if (!isNew(f)) continue;
    console.log(`  NEW ${f.file}: ${f.sites.length} ${RULES[f.rule].title} (baseline ${baseline[f.key] ?? 0})`);
    for (const s of f.sites.slice(0, 5)) console.log(`      :${s.line} ${s.what}`);
    console.log(`      fix: ${RULES[f.rule].fix}`);
  }
  if (argv.includes("--list")) for (const f of found) console.log(`  ${f.sites.length}\t${f.key}\t${f.sites.map((s) => `:${s.line} ${s.what}`).join(" | ")}`);
  if (!paths && argv.includes("--shrink")) {
    const live = new Map(found.map((f) => [f.key, f.sites.length]));
    const kept = {};
    for (const [k, v] of Object.entries(baseline)) if (live.has(k)) kept[k] = Math.min(v, live.get(k));
    writeBaseline(root, kept);
    console.log(`${TAG} baseline shrunk ${Object.keys(baseline).length} → ${Object.keys(kept).length} item(s)`);
  }
  const total = found.reduce((n, f) => n + f.sites.length, 0);
  console.log(`${TAG} ${found.length} file(s) with a typed trail (${total} site(s)), ${fresh} new${paths ? " (narrowed scan)" : ""}`);
  return argv.includes("--strict") && fresh ? 1 : 0;
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "derived-bc-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const plant = {
      "features/a/Parents.tsx": 'export const A = () => <RecordPageHeader parents={[{ label: "Forms", href: "/forms" }]} record={{ name: "x" }} />;\n',
      "features/a/Trail.tsx": 'export const A = () => <CrumbTrailHeader trail={[{ label: "CMS" }]} />;\n',
      // Quiet: derived use, exception, comments, tests, the primitives themselves.
      "features/ok/Derived.tsx": 'export const A = () => <RecordPageHeader record={{ name: "x" }} />;\nconst parentsList = [];\n',
      "features/ok/Exc.tsx": '// derived-exception: a wizard, not an address\nexport const A = () => <CrumbTrailHeader trail={[{ label: "Step 1" }]} />;\n',
      "features/ok/Comment.tsx": '// <RecordPageHeader parents={[…]} /> is gone\nexport const A = 1;\n',
      "features/ok/Ok.test.tsx": 'export const x = <RecordPageHeader parents={[{ label: "x" }]} />;\n',
      "features/shell/components/header/templates/RecordPageHeader.tsx": "export const y = <EntityModeHeader trail={[1]} />;\n",
    };
    for (const [name, text] of Object.entries(plant)) {
      execFileSync("mkdir", ["-p", dirname(join(dir, name))]);
      writeFileSync(join(dir, name), text);
    }
    const got = collect({ root: dir }).map((f) => `${f.key}=${f.sites.length}`);
    const want = [
      "derived-exception|features/ok/Exc.tsx=1",
      "hand-typed-parents|features/a/Parents.tsx=1",
      "hand-typed-trail|features/a/Trail.tsx=1",
    ];
    execFileSync("mkdir", ["-p", join(dir, "scripts/derived-breadcrumbs")]);
    writeFileSync(join(dir, BASELINE), JSON.stringify({ counts: Object.fromEntries(want.map((w) => w.split("=")).map(([k, n]) => [k, Number(n)])) }));
    const quiet = console.log;
    console.log = () => {};
    let atBaseline, raised;
    try {
      atBaseline = main(["--strict"], dir);
      writeFileSync(join(dir, "features/a/New.tsx"), 'export const A = () => <RecordPageHeader parents={[{ label: "New" }]} record={{ name: "n" }} />;\n');
      raised = main(["--strict"], dir);
    } finally {
      console.log = quiet;
    }
    const ok = JSON.stringify(got) === JSON.stringify(want) && atBaseline === 0 && raised === 1;
    console.log(`${TAG} self-test ${ok ? "PASS" : "FAIL"}: ${JSON.stringify(got)} atBaseline=${atBaseline} raised=${raised}`);
    return ok ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
