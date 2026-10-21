#!/usr/bin/env node
/**
 * check:bulk-parity — THE BULK TWIN RULE (2026-10-21).
 *
 * A verb a person can do to ONE row is offered, the same way, when they select MANY. It drifted on
 * ~95 lists because the row verbs and the bulk verbs were written twice (spend approvals: five row
 * decisions, three bulk buttons). The shared layer is `lib/entity-list/rowVerbs.ts`
 * (`defineRowVerbs` / `bulkActionsFromRowVerbs`): one declaration, both surfaces. Two items, each
 * keyed per file (the count is the ratchet):
 *
 *   parallel-bulk-list|<file>   a file that declares its verbs with defineRowVerbs /
 *                               bulkActionsFromRowVerbs AND hand-writes a second bulk list beside
 *                               them (`EntityBulkAction<…>` literals, a `BULK_ACTIONS` table, a
 *                               selection bar that renders its own buttons). BLOCKING under
 *                               --strict from the first one: the twin must come from the declaration.
 *   missing-bulk-twin|<file>    THE CENSUS: a list surface (MatrxDataTable / rowActionDefs /
 *                               rowActions / useRowActions / an ItemMenuConfig row menu) that declares
 *                               mutating row verbs (archive, delete, trash, approve, reject, pause,
 *                               resume, resolve, revoke, remove, restore, status) while neither it nor
 *                               any file in its folder declares a selection or bulk actions. Count =
 *                               the mutating verbs found.
 *   bulk-parity-exception|<file> a `bulk-parity-exception: <reason>` within 3 lines above a site;
 *                               ratchets too.
 *
 * BASELINE (scripts/bulk-parity/baseline.json) ONLY SHRINKS. `--shrink` lowers counts, never raises;
 * `--strict` exits 1 on a NEW item; `--list` prints the census.
 *
 *   node scripts/bulk-parity/check-bulk-parity.mjs [paths…] [--strict] [--shrink] [--list]
 *   node scripts/bulk-parity/check-bulk-parity.mjs --write-initial-baseline   (only when no baseline exists)
 *   node scripts/bulk-parity/check-bulk-parity.mjs --self-test
 *
 * Rule body: lib/entity-list/FEATURE.md § THE BULK TWIN RULE.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emitItem, endItems } from "../checks/items.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TAG = "[bulk-parity]";
const BASELINE = "scripts/bulk-parity/baseline.json";
const FIX =
  "Declare each row verb once with defineRowVerbs (MatrxDataTable / EntityListPage) or bulkActionsFromRowVerbs (a verb registry) from lib/entity-list/rowVerbs.ts — its bulk twin comes from the same declaration; a verb with no sensible bulk form says `bulk: false, noBulk: \"single\"`. Rule: lib/entity-list/FEATURE.md § THE BULK TWIN RULE.";

export const RULES = {
  "parallel-bulk-list": {
    title: "hand-written bulk list beside defineRowVerbs",
    fix: `Delete the hand-written bulk list; give each verb its \`bulk\` twin inside defineRowVerbs. ${FIX}`,
  },
  "missing-bulk-twin": { title: "mutating row verb(s) with no bulk twin", fix: FIX },
  "bulk-parity-exception": {
    title: "bulk-parity exception",
    fix: "A new `bulk-parity-exception:` is reviewed like any new item: say why these rows can never be acted on together.",
  },
};

export function remedyForKey(key) {
  return RULES[String(key).split("|")[0]]?.fix ?? null;
}

const OUT_OF_SCOPE =
  /(^|\/)node_modules\/|\/dist\/|\.(test|spec)\.tsx?$|\/__tests__\/|^app\/\((dev|lab)\)\/|\/demos?\/|\.stories\.tsx$|(^|\/)(playground|scripts|testing)\/|^lib\/entity-list\/(rowVerbs|standardBulkActions|selection)\.ts$|\.d\.ts$/;

/** A list surface with row verbs. */
const LIST_SURFACE = /<MatrxDataTable\b|\browActionDefs\b|\browActions\s*[=:]|\buseRowActions\b|\bmenuFor\s*[:=(]|\bItemMenuConfig\b/;
/** The file (or a folder sibling) can act on a selection. */
const HAS_BULK =
  /\bbulkActions\b|\buseTableBulkSelection\b|\bdefineRowVerbs\s*[<(]|\bbulkActionsFromRowVerbs\s*[<(]|\bselection=\{|\bEntityBulkAction\b|\bstandardBulkActionsFor\b/;
const USES_TWINS = /\bdefineRowVerbs\s*[<(]|\bbulkActionsFromRowVerbs\s*[<(]/;
/** Hand-written bulk lists that must not sit beside a twin declaration. */
const PARALLEL = [
  /:\s*EntityBulkAction<[^>]*>(?:\[\])?\s*=/,
  /\bEntityBulkAction<[^>]*>\[\]\s*=\s*\[/,
  /\bBULK_ACTIONS\b/,
  /\bactions:\s*\(\s*selected\b[^)]*\)\s*=>/,
];
const VERB_LABEL =
  /^(?:Archive|Unarchive|Delete|Trash|Move to Trash|Approve|Reject|Pause|Resume|Resolve|Revoke|Remove|Restore|Set status|Change status)\b/;
const VERB_ID =
  /^(?:archive|unarchive|delete|trash|move-to-trash|approve|reject|pause|resume|resolve|revoke|remove|restore|set[-_]status|change[-_]status)(?:$|[-_])/;
const VERB_FIELD = /\b(id|label)\s*:\s*(["'`])([^"'`]+)\2/g;

function excepted(lines, i) {
  for (let k = Math.max(0, i - 3); k <= i; k++) if (/bulk-parity-exception:/.test(lines[k] ?? "")) return true;
  return false;
}

/** One file's sites: { verbs: [{line, what}], parallel: [{line, what}], exceptions }. */
export function scanSource(file, text) {
  if (OUT_OF_SCOPE.test(file)) return null;
  const lines = text.split("\n");
  const verbs = [];
  const parallel = [];
  const exceptions = [];
  const twins = USES_TWINS.test(text);
  const surface = LIST_SURFACE.test(text);
  // A verb's id and label on neighbouring lines are ONE verb.
  let lastIdLine = -10;
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || /^(\/\/|\*|\/\*)/.test(line) || /^import\b/.test(line)) return;
    if (twins && PARALLEL.some((re) => re.test(line))) {
      (excepted(lines, i) ? exceptions : parallel).push({ line: i + 1, what: line.slice(0, 60) });
    }
    if (!surface) return;
    // One verb per line: `{ id: "approve", label: "Approve" }` is one verb, not two.
    for (const m of line.matchAll(VERB_FIELD)) {
      const value = m[3].trim();
      const isId = m[1] === "id" && VERB_ID.test(value);
      if (isId || (m[1] === "label" && VERB_LABEL.test(value) && i - lastIdLine > 2)) {
        (excepted(lines, i) ? exceptions : verbs).push({ line: i + 1, what: value });
        if (isId) lastIdLine = i;
        break;
      }
    }
  });
  return { surface, hasBulk: HAS_BULK.test(text), verbs, parallel, exceptions };
}

function gitFiles(cwd) {
  try {
    return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.ts", "*.tsx"], {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function collect({ root = ROOT, paths = null } = {}) {
  let files = gitFiles(root).filter((f) => !OUT_OF_SCOPE.test(f));
  const scans = new Map();
  for (const rel of files) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const scan = scanSource(rel, readFileSync(abs, "utf8"));
    if (scan) scans.set(rel, scan);
  }
  // A folder whose files declare a selection covers its row-action hooks and configs.
  const bulkDirs = new Set([...scans].filter(([, s]) => s.hasBulk).map(([rel]) => dirname(rel)));
  if (paths) files = files.filter((f) => paths.some((p) => f === p || f.startsWith(`${p.replace(/\/+$/, "")}/`)));
  const wanted = new Set(files);
  const out = [];
  for (const [rel, s] of scans) {
    if (!wanted.has(rel)) continue;
    if (s.parallel.length) out.push({ key: `parallel-bulk-list|${rel}`, rule: "parallel-bulk-list", file: rel, sites: s.parallel });
    if (s.exceptions.length) out.push({ key: `bulk-parity-exception|${rel}`, rule: "bulk-parity-exception", file: rel, sites: s.exceptions });
    if (s.surface && s.verbs.length && !s.hasBulk && !bulkDirs.has(dirname(rel))) {
      out.push({ key: `missing-bulk-twin|${rel}`, rule: "missing-bulk-twin", file: rel, sites: s.verbs });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

function readBaseline(root) {
  const abs = join(root, BASELINE);
  if (!existsSync(abs)) return {};
  return JSON.parse(readFileSync(abs, "utf8")).counts ?? {};
}

function writeBaseline(root, counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  mkdirSync(dirname(join(root, BASELINE)), { recursive: true });
  writeFileSync(
    join(root, BASELINE),
    `${JSON.stringify(
      {
        note: "Shrink-only: list surfaces whose mutating row verbs have no bulk twin yet (the census). Lower a count by moving the surface onto defineRowVerbs / bulkActionsFromRowVerbs (lib/entity-list/rowVerbs.ts); never add a key or raise a count (scripts/bulk-parity/check-bulk-parity.mjs).",
        counts: sorted,
      },
      null,
      2,
    )}\n`,
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
    // A hand-written list beside defineRowVerbs is never grandfathered.
    writeBaseline(root, Object.fromEntries(found.filter((f) => f.rule !== "parallel-bulk-list").map((f) => [f.key, f.sites.length])));
    console.log(`${TAG} initial baseline: ${found.filter((f) => f.rule !== "parallel-bulk-list").length} item(s)`);
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
  const count = (r) => found.filter((f) => f.rule === r).length;
  console.log(
    `${TAG} ${count("missing-bulk-twin")} list file(s) with row verbs and no bulk twin, ${count("parallel-bulk-list")} parallel bulk list(s), ${count("bulk-parity-exception")} exception(s); ${fresh} new${paths ? " (narrowed scan)" : ""}`,
  );
  return argv.includes("--strict") && fresh ? 1 : 0;
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "bulk-parity-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const plant = {
      // The spend-approvals drift, before: five row decisions, a hand-built bar with three.
      "features/a/Board.tsx": [
        "export function Board() {",
        "  const rowActionDefs = [",
        '    { id: "approve", label: "Approve", onClick },',
        '    { id: "reject", label: "Reject", onClick },',
        '    { id: "history", label: "History", onClick },',
        "  ];",
        "  return <MatrxDataTable rowActionDefs={rowActionDefs} />;",
        "}",
      ].join("\n"),
      // A row-actions hook whose folder declares no selection.
      "features/b/useRowActions.tsx": 'export function useThingRowActions() { const menuFor = (r) => () => ({ items: [{ id: "archive", label: "Archive" }, { label: "Delete" }] }); }\n',
      // defineRowVerbs plus a hand-written twin list beside it.
      "features/c/Twice.tsx": [
        'import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";',
        "const { rowActionDefs } = defineRowVerbs([{ id: \"approve\", label: \"Approve\", bulk: false, noBulk: \"single\" }], opts);",
        'const extra: EntityBulkAction<Row>[] = [{ id: "approve", label: "Approve", run }];',
      ].join("\n"),
      // Quiet: one declaration; a folder sibling declares bulk; no verbs; an option label in a non-list file.
      "features/ok/Good.tsx": [
        'import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";',
        'const { rowActionDefs, bulkActions } = defineRowVerbs([{ id: "approve", label: "Approve", bulk: { runOne } }], opts);',
        "export const G = () => <MatrxDataTable rowActionDefs={rowActionDefs} selection={bulk.selection} />;",
      ].join("\n"),
      "features/ok2/useRowActions.tsx": 'export function useRowActions() { const menuFor = () => () => ({ items: [{ id: "delete", label: "Delete" }] }); }\n',
      "features/ok2/config.tsx": "export const config = { bulkActions: [], useRowActions };\n",
      "features/ok3/Options.tsx": 'const OPTIONS = [{ value: "rejected", label: "Rejected" }, { label: "Approved" }];\n',
      "features/ok4/Exc.tsx":
        '// bulk-parity-exception: one-off ledger rows, never acted on together\nexport const E = () => <MatrxDataTable rowActionDefs={[{ id: "revoke", label: "Revoke", onClick }]} />;\n',
      "features/a/Board.test.tsx": 'const rowActionDefs = [{ id: "approve" }];\n',
    };
    for (const [name, text] of Object.entries(plant)) {
      mkdirSync(dirname(join(dir, name)), { recursive: true });
      writeFileSync(join(dir, name), text);
    }
    const got = collect({ root: dir }).map((f) => `${f.key}=${f.sites.length}`);
    const want = [
      "bulk-parity-exception|features/ok4/Exc.tsx=1",
      "missing-bulk-twin|features/a/Board.tsx=2",
      "missing-bulk-twin|features/b/useRowActions.tsx=1",
      "parallel-bulk-list|features/c/Twice.tsx=1",
    ];
    const counts = Object.fromEntries(want.filter((w) => !w.startsWith("parallel")).map((w) => w.split("=")).map(([k, n]) => [k, Number(n)]));
    mkdirSync(join(dir, "scripts/bulk-parity"), { recursive: true });
    writeFileSync(join(dir, BASELINE), JSON.stringify({ counts }));
    const quiet = console.log;
    console.log = () => {};
    let withParallel, atBaseline, raised;
    try {
      // The parallel list is never grandfathered: red at the baseline.
      withParallel = main(["--strict"], dir);
      rmSync(join(dir, "features/c/Twice.tsx"));
      atBaseline = main(["--strict"], dir);
      // A planted break: a new mutating row verb with no bulk twin.
      writeFileSync(
        join(dir, "features/a/Board.tsx"),
        readFileSync(join(dir, "features/a/Board.tsx"), "utf8").replace('{ id: "history"', '{ id: "pause", label: "Pause", onClick },\n    { id: "history"'),
      );
      raised = main(["--strict"], dir);
    } finally {
      console.log = quiet;
    }
    const ok = JSON.stringify(got) === JSON.stringify(want) && withParallel === 1 && atBaseline === 0 && raised === 1;
    console.log(`${TAG} self-test ${ok ? "PASS" : "FAIL"}: ${JSON.stringify(got)} withParallel=${withParallel} atBaseline=${atBaseline} raised=${raised}`);
    return ok ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
