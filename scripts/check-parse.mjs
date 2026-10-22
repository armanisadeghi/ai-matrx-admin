#!/usr/bin/env node
/**
 * check-parse.mjs — every tracked `.ts` / `.tsx` file must PARSE.
 *
 * THE CLASS: "an import injected INSIDE an import statement" (2026-09-07).
 * The census-H1 codemod that adopted `@ai-matrx/kit/format` inserted its new
 * `import { … } from "@ai-matrx/kit/format";` line — plus a comment block —
 * at the position of the first matched SYMBOL rather than at the top of the
 * import block. When the matched symbol lived inside a multi-line
 * `import { … } from "…"`, the new import landed between `import {` and the
 * member list:
 *
 *     import type {
 *     // THE package duration formatter (@ai-matrx/kit/format, census H1…)
 *     import { formatDurationSeconds } from "@ai-matrx/kit/format";
 *       FieldChoice,
 *     } from "./types";
 *
 * That is a hard parse error. Seven files landed that way
 * (components/image/cloud/CloudImageList.tsx, ../aidream/apps/shared/chat/src/agents/resources/utils.ts,
 * features/transcripts/service/audioStorageService.ts,
 * utils/file-operations/utils.ts, lib/field-formats/registry.ts,
 * features/marketing/seo/run-console/RunHistoryPanel.tsx,
 * components/chat/UsageStatsModal.tsx — all repaired in fc9a28a26f) and took
 * the SHARED dev server down repeatedly: every route 500, for every agent
 * working out of the checkout, until someone traced it by hand.
 *
 * WHY A SEPARATE GUARD WHEN `pnpm type-check` ALREADY SEES IT. It does — as
 * TS1003 / TS1005 / TS1128. But type-check takes minutes, carries a large
 * tracked backlog of ordinary type errors, and is ADVISORY by standing ruling
 * (D64/D65: type errors scream, they never stop a ship). Nothing ran it
 * between the codemod and the push. This guard reads the same parser, does no
 * type resolution, finishes in seconds, and reports ONLY syntax — a signal
 * with zero backlog and no judgment in it, which is why it can block where
 * type-check cannot.
 *
 * IT EXITS 1 IN BOTH MODES, deliberately, unlike most gates in
 * run-release-gates.sh. A file that does not parse is not an opinion about
 * quality: it cannot build, cannot render, and breaks everyone sharing the
 * tree. There is no backlog to grandfather (0 findings over 14,716 files at
 * introduction) and no lawful exception, so it never earns an advisory
 * carve-out. `--advisory` exists only for a human triaging by hand.
 *
 * Portable by construction: node stdlib + the TypeScript parser already in
 * every Matrx TS repo. Copy it unchanged into matrx-extend / matrx-local /
 * matrx-games.
 *
 * Usage:
 *   pnpm check:parse                 # all tracked .ts/.tsx — exit 1 on any finding
 *   pnpm check:parse --changed       # only files changed vs origin/main + worktree
 *   pnpm check:parse --fix           # repair the injected-import class, then re-check
 *   pnpm check:parse --advisory      # report, exit 0 (human triage only)
 *   pnpm check:parse --self-test     # prove the guard catches the exact 2026-09-07 shape
 *   pnpm check:parse --staged        # the STAGED (index) content of staged code files — pre-commit
 *   node scripts/check-parse.mjs --files <path…>   # files just written — the edit-time agent hook
 *   pnpm check:parse:write-time-self-test          # prove --staged and --files red, then green
 *
 * WRITE TIME, NEVER RELEASE TIME (Arman, 2026-10-22: "nothing can stop the release, once it's
 * triggered"). 12 of 20 production builds failed in two days, several 7-9 min into the compile on
 * "Merge conflict marker encountered" / "Expression expected". The catch is where the file is
 * written: `--files` runs from the agents' PostToolUse hook on every Edit/Write (matrx Claude
 * plugin, hooks/edit_parse_guard.py), `--staged` from scripts/githooks/pre-commit; the sweep
 * (scripts/sync-main.py) holds a file that does not parse via check-sweep-resolves.mjs and skips
 * a marked one. `--files` / `--staged` also judge `.js/.jsx/.mjs/.cjs`, and `--files` checks any
 * other text file for conflict-marker lines. Under MATRX_RELEASE_PATH=1 `--staged` reports only.
 *
 * Exit: 0 clean · 1 unparseable file(s) · 3 self-test failed
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import ts from "typescript";

// `--staged` judges the repository it is run IN (the pre-commit hook's cwd); everything else this one.
const ROOT = process.argv.includes("--staged")
  ? execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim()
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARGS = process.argv.slice(2);
const ADVISORY = ARGS.includes("--advisory");
const SELF_TEST = ARGS.includes("--self-test");
const CHANGED = ARGS.includes("--changed");
const FIX = ARGS.includes("--fix");
const STAGED = ARGS.includes("--staged");
const FILES = ARGS.includes("--files") ? ARGS.slice(ARGS.indexOf("--files") + 1).filter((a) => !a.startsWith("--")) : null;
const WRITE_TIME_SELF_TEST = ARGS.includes("--write-time-self-test");

/** Code files the write-time modes judge (the full sweep stays `.ts`/`.tsx`). */
const CODE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const PROSE_FILE = /\.(md|mdx|txt|rst)$/i;
/** A git conflict-marker line: `<<<<<<< ` / `>>>>>>> ` anywhere; a bare `=======` too outside prose. */
const MARKER_LINE = /^(<{7}|>{7})(?: |$)/m;
const MID_MARKER_LINE = /^={7}(?: |$)/m;

function scriptKindOf(file) {
  if (/\.(tsx|jsx|js)$/.test(file)) return ts.ScriptKind.TSX; // Next accepts JSX in .js
  if (/\.(mjs|cjs)$/.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/** A conflict-marker line in a NON-code file (code files get the parser's own TS1185). */
export function markerFinding(file, source) {
  const m = MARKER_LINE.exec(source) ?? (PROSE_FILE.test(file) ? null : MID_MARKER_LINE.exec(source));
  if (!m) return null;
  const line = source.slice(0, m.index).split("\n").length;
  return { code: "MARKER", line, column: 1, message: "git conflict marker line; resolve the conflict and delete the marker lines" };
}

/* ── the parser ───────────────────────────────────────────────────────────── */

/**
 * Syntax diagnostics for one file's source. Parse-only: no program, no type
 * resolution, no tsconfig — so it cannot report a type error and cannot be
 * fooled by an unresolved import.
 */
export function parseErrors(file, source) {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    scriptKindOf(file),
  );
  // `parseDiagnostics` is where the TS parser records TS1003/TS1005/TS1128 and
  // friends. It is not on the public SourceFile type, hence the cast-by-index.
  const diags = sf["parseDiagnostics"] ?? [];
  return diags.map((d) => {
    const { line, character } = sf.getLineAndCharacterOfPosition(d.start ?? 0);
    return {
      code: d.code,
      line: line + 1,
      column: character + 1,
      message: ts.flattenDiagnosticMessageText(d.messageText, " "),
    };
  });
}

/**
 * A tracked `.ts`/`.tsx` file with a literal NUL byte (0x00) in its content.
 * TypeScript's parser is happy to accept a NUL inside a string or comment —
 * `parseErrors` reports nothing — but a NUL makes `git` classify the file as
 * BINARY, which hides every diff of it from review forever (`git show --stat`
 * prints "Bin" instead of the change). 9 such bytes were found in tracked
 * source on 2026-09-10 (fixed in 68d68a7727) and would have shipped invisibly
 * to review had this guard existed. `\0` is the correct escape — identical at
 * runtime, but ordinary text to git and every diff tool.
 */
export function nulByteFinding(file, source) {
  const idx = source.indexOf("\0");
  if (idx === -1) return null;
  const before = source.slice(0, idx);
  const line = (before.match(/\n/g) ?? []).length + 1;
  const column = idx - before.lastIndexOf("\n");
  return {
    code: "NUL",
    line,
    column,
    message:
      "literal NUL byte (0x00) makes git treat this file as binary; replace it with the escape \\0 (identical at runtime)",
  };
}

/**
 * A name imported twice at module scope — `import { readOf } from "a"` beside
 * `import { readOf } from "b"`. The TS parser accepts it (it is a binder error,
 * TS2300, which only the advisory `type-check` reports), but Turbopack refuses
 * the module ("the name `readOf` is defined multiple times"), so the whole
 * production build fails. That shipped on 2026-10-18 (MeaningPanel.tsx) and
 * failed every ai-matrx Vercel build of v0.4.3333-v0.4.3334.
 */
export function duplicateImportFindings(file, source) {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    false,
    scriptKindOf(file),
  );
  const seen = new Set();
  const findings = [];
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause) continue;
    const clause = st.importClause;
    const idents = [];
    if (clause.name) idents.push(clause.name);
    const b = clause.namedBindings;
    if (b) {
      if (ts.isNamespaceImport(b)) idents.push(b.name);
      else for (const el of b.elements) idents.push(el.name);
    }
    for (const id of idents) {
      if (!seen.has(id.text)) {
        seen.add(id.text);
        continue;
      }
      const { line, character } = sf.getLineAndCharacterOfPosition(id.getStart(sf));
      findings.push({
        code: "DUP-IMPORT",
        line: line + 1,
        column: character + 1,
        message: `\`${id.text}\` is imported more than once; Turbopack refuses the module and the production build fails — keep one import`,
      });
    }
  }
  return findings;
}

/* ── the repair (`--fix`) ─────────────────────────────────────────────────── */

/** The line that opens a multi-line import — the one the codemod split. */
const OPEN_IMPORT = /^\s*import\s+(?:type\s+)?\{\s*$/;

/**
 * Move any injected run (comment lines + whole import statements) that sits
 * between `import {` and its member list back ABOVE the import it interrupted.
 * Returns the repaired source, or null when there was nothing to repair.
 * Idempotent. Folded in from the hand-run repair script used on 2026-09-07.
 */
export function repairInjectedImports(source) {
  const lines = source.split("\n");
  let changed = false;
  let i = 0;
  while (i < lines.length) {
    if (!OPEN_IMPORT.test(lines[i])) {
      i += 1;
      continue;
    }
    const run = [];
    let k = i + 1;
    while (k < lines.length) {
      const s = lines[k].trimStart();
      if (s.startsWith("//") || s.startsWith("import ")) {
        run.push(lines[k]);
        k += 1;
        continue;
      }
      break;
    }
    // Only a run that actually contains an IMPORT is an injection. A plain
    // comment directly after `import {` is legal, ordinary code.
    if (run.some((l) => l.trimStart().startsWith("import "))) {
      lines.splice(i, k - i, ...run, lines[i]);
      changed = true;
      i += run.length + 1;
      continue;
    }
    i += 1;
  }
  return changed ? lines.join("\n") : null;
}

/* ── file set ─────────────────────────────────────────────────────────────── */

const git = (args) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 })
    .split("\n")
    .filter(Boolean);

function repoFiles() {
  if (FILES) {
    return FILES.map((f) => (f.startsWith("/") ? f : resolve(process.cwd(), f)))
      .map((f) => (f.startsWith(`${ROOT}/`) ? f.slice(ROOT.length + 1) : f))
      .filter((f) => !f.includes("node_modules/"));
  }
  if (STAGED) {
    return git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
      .filter((f) => CODE_FILE.test(f) && !f.includes("node_modules/") && !f.startsWith("_conflicts/"));
  }
  const isTs = (f) => /\.tsx?$/.test(f) && !f.includes("node_modules/");
  if (!CHANGED) return git(["ls-files", "*.ts", "*.tsx"]).filter(isTs);

  const base = (() => {
    try {
      return git(["merge-base", "HEAD", "origin/main"])[0];
    } catch {
      return "HEAD";
    }
  })();
  const set = new Set([
    ...git(["diff", "--name-only", "--diff-filter=ACMR", base]),
    ...git(["diff", "--name-only", "--diff-filter=ACMR"]),
    ...git(["diff", "--name-only", "--diff-filter=ACMR", "--cached"]),
    ...git(["ls-files", "--others", "--exclude-standard"]),
  ]);
  return [...set].filter(isTs);
}

/* ── self-test ────────────────────────────────────────────────────────────── */

/**
 * The exact 2026-09-07 shape, reproduced from lib/field-formats/registry.ts:
 * the codemod's comment block + its new import, injected at the position of
 * the first matched symbol — which lived inside a multi-line `import type {`.
 */
const BROKEN_FIXTURE = `/**
 * The format registry.
 */
import type {
// THE package duration formatter (\`@ai-matrx/kit/format\`, census H1
// 2026-09-07). THE UNIT LAW: the unit is in the name.
import { formatDurationSeconds } from "@ai-matrx/kit/format";
  FieldChoice,
  FieldFormatDef,
} from "./types";

export const REGISTRY: Record<string, FieldFormatDef> = {};
`;

function selfTest() {
  const results = [];
  const check = (name, ok) => results.push({ name, ok });

  const before = parseErrors("planted.ts", BROKEN_FIXTURE);
  check("the guard REPORTS the injected-import fixture", before.length > 0);
  check(
    "it reports it as the parser's own syntax codes (TS1003/1005/1128 class)",
    before.some((e) => e.code >= 1000 && e.code < 1500),
  );

  const repaired = repairInjectedImports(BROKEN_FIXTURE);
  check("--fix rewrites the fixture", repaired !== null);
  check(
    "the repaired fixture PARSES",
    repaired !== null && parseErrors("planted.ts", repaired).length === 0,
  );
  check(
    "the repair moved the injected import ABOVE the statement it split",
    repaired !== null &&
      repaired.indexOf('from "@ai-matrx/kit/format"') <
        repaired.indexOf("import type {"),
  );
  check(
    "the repair is idempotent",
    repaired !== null && repairInjectedImports(repaired) === null,
  );
  check(
    "it does NOT rewrite an import block whose comment is lawful",
    repairInjectedImports('import {\n  // a plain comment\n  a,\n} from "x";\n') ===
      null,
  );
  check(
    "a clean file reports nothing",
    parseErrors("clean.tsx", 'import { a } from "x";\nexport const B = () => <a />;\n')
      .length === 0,
  );

  // The 2026-09-10 class: a literal NUL byte (0x00) parses fine as TS, so
  // `parseErrors` alone is blind to it — it is `nulByteFinding` that must
  // catch it, and its message must name both the byte and the escape.
  const nulFixture = "export const A = 1;\n// stray byte here \0 injected\nexport const B = 2;\n";
  const nul = nulByteFinding("planted.ts", nulFixture);
  check("the guard REPORTS a literal NUL byte", nul !== null);
  check("it locates the NUL on the correct line", nul !== null && nul.line === 2);
  check(
    "the finding names the defect and the fix (0x00 → \\0 escape)",
    nul !== null && nul.message.includes("0x00") && nul.message.includes("\\0"),
  );
  check(
    "a NUL-free file reports nothing",
    nulByteFinding("clean.ts", "export const A = 1;\n") === null,
  );

  // The 2026-10-18 class: one name imported twice parses, but Turbopack refuses it.
  const dupFixture =
    'import { RecordList, readOf } from "@ai-matrx/design-system/record-list";\n' +
    'import { useQuery } from "@tanstack/react-query";\n' +
    'import { readOf } from "@ai-matrx/design-system";\n';
  check("a duplicate import PARSES (parseErrors alone is blind)", parseErrors("planted.tsx", dupFixture).length === 0);
  const dup = duplicateImportFindings("planted.tsx", dupFixture);
  check("the guard REPORTS a name imported twice", dup.length === 1 && dup[0].message.includes("readOf"));
  check("it locates the second import's line", dup.length === 1 && dup[0].line === 3);
  check(
    "distinct names (and a type import beside a value import of another name) report nothing",
    duplicateImportFindings("clean.ts", 'import a, { b } from "x";\nimport type { C } from "y";\nimport * as d from "z";\n')
      .length === 0,
  );

  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.name}`);
  }
  return results.every((r) => r.ok);
}

/* ── main ─────────────────────────────────────────────────────────────────── */

/** RED then GREEN for `--files` and `--staged`, in a throwaway git repo (never this checkout). */
function writeTimeSelfTest() {
  const dir = mkdtempSync(resolve(tmpdir(), "parse-write-time-"));
  const me = fileURLToPath(import.meta.url);
  const run = (args) => {
    try { execFileSync(process.execPath, [me, ...args], { cwd: dir, stdio: "pipe", env: { ...process.env, MATRX_RELEASE_PATH: "0" } }); return { code: 0, out: "" }; }
    catch (e) { return { code: e.status, out: String(e.stderr) }; }
  };
  const g = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  const put = (f, src) => { mkdirSync(dirname(resolve(dir, f)), { recursive: true }); writeFileSync(resolve(dir, f), src); };
  const results = [];
  const check = (name, ok) => results.push({ name, ok });
  try {
    g("init", "-q"); g("config", "user.email", "t@example.com"); g("config", "user.name", "t");
    put("a.tsx", "export const A = 1;\n<<<<<<< HEAD\nconst b = 1;\n=======\nconst b = 2;\n>>>>>>> origin/main\n");
    put("b.ts", "export const x = (;\n");
    put("c.mjs", "export const y = 1;\n");
    put("d.css", ".a{}\n>>>>>>> theirs\n");
    put("doc.md", "Title\n=======\n");
    let r = run(["--files", resolve(dir, "a.tsx")]);
    check("--files: a conflict marker in .tsx is RED, naming file:line", r.code === 1 && /a\.tsx:2:/.test(r.out));
    r = run(["--files", resolve(dir, "b.ts")]);
    check("--files: 'Expression expected' is RED", r.code === 1 && /Expression expected/.test(r.out));
    check("--files: a marker in a stylesheet is RED", run(["--files", resolve(dir, "d.css")]).code === 1);
    check("--files: clean .mjs and a prose ======= underline are GREEN", run(["--files", resolve(dir, "c.mjs"), resolve(dir, "doc.md")]).code === 0);
    g("add", "a.tsx", "b.ts", "c.mjs");
    r = run(["--staged"]);
    check("--staged: staged marker + syntax error are RED", r.code === 1 && /a\.tsx/.test(r.out) && /b\.ts/.test(r.out));
    put("a.tsx", "export const A = 1;\n"); // fixed on disk only: the INDEX is what is judged
    check("--staged judges the index, not the disk", run(["--staged"]).code === 1);
    put("b.ts", "export const x = 1;\n");
    g("add", "a.tsx", "b.ts");
    check("--staged: fixed and re-staged is GREEN", run(["--staged"]).code === 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  for (const r of results) console.log(`  ${r.ok ? "✓" : "✗"} ${r.name}`);
  const ok = results.every((r) => r.ok);
  console.log(ok ? "[parse] write-time self-test PASSED" : "[parse] write-time self-test FAILED");
  process.exit(ok ? 0 : 3);
}

function main() {
  if (WRITE_TIME_SELF_TEST) writeTimeSelfTest();
  if (SELF_TEST) {
    console.log(
      "[parse] self-test — the injected-import class (2026-09-07, 7 files, shared dev server down):",
    );
    const ok = selfTest();
    console.log(
      ok
        ? "[parse] self-test PASSED — the guard still catches the exact shape it was built for."
        : "[parse] self-test FAILED — this guard no longer catches the original defect.",
    );
    process.exit(ok ? 0 : 3);
  }

  const files = repoFiles();
  let findings = files
    .map((file) => {
      let source;
      try {
        source = STAGED
          ? execFileSync("git", ["show", `:${file}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 })
          : readFileSync(resolve(ROOT, file), "utf8");
      } catch {
        return null; // deleted between listing and read
      }
      if (!CODE_FILE.test(file)) {
        if (source.includes("\0")) return null; // binary
        const marker = markerFinding(file, source);
        return marker ? { file, errors: [marker] } : null;
      }
      const errors = parseErrors(file, source);
      const nul = nulByteFinding(file, source);
      const dups = errors.length ? [] : duplicateImportFindings(file, source);
      const allErrors = [...errors, ...(nul ? [nul] : []), ...dups];
      return allErrors.length ? { file, errors: allErrors } : null;
    })
    .filter(Boolean);

  const repaired = [];
  if (FIX) {
    for (const finding of findings) {
      const path = resolve(ROOT, finding.file);
      const fixed = repairInjectedImports(readFileSync(path, "utf8"));
      if (fixed === null) continue;
      if (parseErrors(finding.file, fixed).length) continue; // repair did not clear it
      writeFileSync(path, fixed);
      repaired.push(finding.file);
    }
    for (const file of repaired) console.log(`[parse] repaired ${file}`);
    findings = findings.filter((f) => !repaired.includes(f.file));
  }

  if (FILES || STAGED) {
    if (findings.length === 0) {
      if (STAGED) console.log(`[parse] OK — ${files.length} staged code file(s) parse.`);
      process.exit(0);
    }
    console.error(
      FILES
        ? `[parse] THE FILE YOU JUST WROTE DOES NOT BUILD. Fix it now, before any other step — Turbopack refuses it and every release fails until it is fixed:`
        : `COMMIT REFUSED: staged file(s) do not parse — Turbopack refuses them and the release build fails:`,
    );
    for (const { file, errors } of findings) {
      for (const e of errors.slice(0, 3)) {
        console.error(`  ${file}:${e.line}:${e.column}  ${typeof e.code === "number" ? `TS${e.code}: ` : ""}${e.message}`);
      }
    }
    if (STAGED && process.env.MATRX_RELEASE_PATH === "1") {
      console.error("  (MATRX_RELEASE_PATH=1: reported, not refused)");
      process.exit(0);
    }
    process.exit(1);
  }

  if (findings.length === 0) {
    console.log(
      `[parse] OK — all ${files.length} tracked TypeScript file(s) parse.` +
        (repaired.length ? ` ${repaired.length} repaired by --fix.` : ""),
    );
    process.exit(0);
  }

  console.error(
    `\n[parse] ${findings.length} file(s) DO NOT PARSE. This is not a type ` +
      `error — these files cannot build, cannot render, and take the shared ` +
      `dev server down for everyone in this checkout (every route 500).\n` +
      (FIX
        ? `--fix could not repair them: they are not the injected-import class.\n`
        : `If a codemod injected an import INSIDE an import statement ` +
          `(the 2026-09-07 class), \`pnpm check:parse --fix\` repairs it.\n`),
  );
  for (const { file, errors } of findings) {
    console.error(`  ${file}`);
    for (const e of errors.slice(0, 5)) {
      console.error(
        typeof e.code !== "number"
          ? `    ${file}:${e.line}:${e.column} — ${e.message}`
          : `    ${file}:${e.line}:${e.column}  TS${e.code}: ${e.message}`,
      );
    }
    if (errors.length > 5) console.error(`    … ${errors.length - 5} more`);
  }
  console.error("");
  process.exit(ADVISORY ? 0 : 1);
}

main();
