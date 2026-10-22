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
    baselinable: false,
    fix: `Delete the hand-written bulk list; give each verb its \`bulk\` twin inside defineRowVerbs. ${FIX}`,
  },
  "bulk-only-row-verbs": {
    title: "defineRowVerbs used as a bulk-only list (no-op onClick / row half thrown away)",
    baselinable: false,
    fix: `A verb declared with a no-op \`onClick\` or a defineRowVerbs call whose \`rowActionDefs\` are discarded is a second, hand-written bulk list wearing the primitive's name. Build the row menu FROM the same call (take \`rowActionDefs\`, real \`onClick\`s), or declare the verbs as a registry both import (bulkActionsFromRowVerbs). ${FIX}`,
  },
  "mutating-no-bulk": {
    title: "mutating verb marked noBulk without a reason",
    baselinable: false,
    fix: "A verb that changes or removes records (archive, delete, revoke, cancel, …) gets a bulk twin. If it truly can never run on many rows together, put `// bulk-parity-exception: <why>` within 3 lines above its `noBulk` (reviewed like any new item); a one-word noBulk (\"single\") is never enough for a mutating verb.",
  },
  "hand-written-bulk-list": {
    title: "hand-written bulk list in a file with row verbs (no defineRowVerbs)",
    baselinable: true,
    fix: `The row verbs and the bulk list are written twice in this file; they drift. Move the row verbs onto defineRowVerbs / bulkActionsFromRowVerbs and let the bulk list come from them. ${FIX}`,
  },
  "missing-bulk-twin": { title: "mutating row verb(s) with no bulk twin", baselinable: true, fix: FIX },
  "bulk-parity-exception": {
    title: "bulk-parity exception",
    baselinable: true,
    fix: "A new `bulk-parity-exception:` is reviewed like any new item: say why these rows can never be acted on together.",
  },
};

export function remedyForKey(key) {
  return RULES[String(key).split("|")[0]]?.fix ?? null;
}

const OUT_OF_SCOPE =
  /(^|\/)node_modules\/|\/dist\/|\.(test|spec)\.tsx?$|\/__tests__\/|^app\/\((dev|lab)\)\/|\/demos?\/|\.stories\.tsx$|(^|\/)(playground|scripts|testing)\/|^lib\/entity-list\/(rowVerbs|standardBulkActions|selection)\.ts$|\.d\.ts$/;

/**
 * THE VERB VOCABULARY — every verb that changes or removes records, in one place. The census
 * (missing-bulk-twin) and the noBulk check (mutating-no-bulk) both read it; `--self-test` proves
 * every entry matches as an id (kebab, snake, camel) and as a label, and that the look-alikes
 * ("Rejected", "Closed", "History") do not. Widen it here, never with a second regex.
 */
export const MUTATING_VERBS = Object.freeze([
  "archive", "unarchive", "delete", "trash", "move to trash", "restore",
  "approve", "reject", "pause", "resume", "resolve", "revoke", "remove",
  "set status", "change status", "set role", "change role",
  "cancel", "send", "disable", "enable", "publish", "unpublish",
  "suspend", "reactivate", "close", "reopen", "mute", "unmute",
  "assign", "unassign", "mark read", "mark unread", "mark as read", "mark as unread",
]);

const escapeRe = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Label: "Move to Trash", "Move to trash", "Archive brand" — case-insensitive, whole first words. */
export const VERB_LABEL = new RegExp(`^(?:${MUTATING_VERBS.map((v) => v.split(" ").map(escapeRe).join("\\s+")).join("|")})(?![A-Za-z0-9])`, "i");
/** Id: move-to-trash, set_status, markRead, archive-all — the words joined by -, _ or camel case. */
export const VERB_ID = new RegExp(
  `^(?:${MUTATING_VERBS.map((v) =>
    v
      .split(" ")
      .map((w, i) => (i === 0 ? escapeRe(w) : `(?:[-_]${escapeRe(w)}|${escapeRe(w[0].toUpperCase() + w.slice(1))})`))
      .join(""),
  ).join("|")})(?:$|[-_]|[A-Z])`,
);
export const isMutatingVerb = (idOrLabel, field) => (field === "id" ? VERB_ID : VERB_LABEL).test(String(idOrLabel).trim());

/** A list surface with row verbs. */
const LIST_SURFACE = /<MatrxDataTable\b|\browActionDefs\b|\browActions\s*[=:]|\buseRowActions\b|\bmenuFor\s*[:=(]|\bItemMenuConfig\b/;
/** A file that declares row verbs of its own (a table alone is not one). */
const ROW_VERBS = /\browActionDefs\b|\browActions\s*[=:]|\buseRowActions\b|\bmenuFor\s*[:=(]|\bItemMenuConfig\b/;
/** The file itself can act on a selection — read with comments stripped; a folder sibling never counts. */
const HAS_BULK =
  /\bbulkActions\b|\buseTableBulkSelection\b|\bdefineRowVerbs\s*[<(]|\bbulkActionsFromRowVerbs\s*[<(]|\bselection=\{|\bEntityBulkAction\b|\bstandardBulkActionsFor\b/;
const USES_TWINS = /\bdefineRowVerbs\s*[<(]|\bbulkActionsFromRowVerbs\s*[<(]/;
/** Hand-written bulk lists. */
const PARALLEL = [
  /:\s*EntityBulkAction<[^>]*>(?:\[\])?\s*=/,
  /\bEntityBulkAction<[^>]*>\[\]\s*=\s*\[/,
  /\bBULK_ACTIONS\b/,
  /\bactions:\s*\(\s*selected\b[^)]*\)\s*=>/,
];
const VERB_FIELD = /\b(id|label)\s*:\s*(["'`])([^"'`]+)\2/g;
const NO_BULK = /\bnoBulk\s*:\s*["'`]/;
/** A no-op handler: `() => {}`, `() => undefined`, `(_row) => null`. */
const NOOP_FN = String.raw`\(\s*[\w\s,]*\)\s*=>\s*(?:\{\s*\}|undefined|null|void\s+0)`;

/**
 * Comments → spaces, newlines kept (line numbers hold). Strings and template literals are kept
 * verbatim; a backslash outside a string escapes the next character (regex literals' `\/\/`).
 */
export function stripComments(text) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") {
        out += n ?? "";
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "\\") {
      out += c + (n ?? "");
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === "/" && n === "/") {
      while (i < text.length && text[i] !== "\n") {
        out += " ";
        i += 1;
      }
      continue;
    }
    if (c === "/" && n === "*") {
      out += "  ";
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) {
        out += text[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      out += i < text.length ? "  " : "";
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/** A `bulk-parity-exception: <reason>` (a real reason, not an empty tag) within 3 lines above. */
function excepted(lines, i) {
  for (let k = Math.max(0, i - 3); k <= i; k++) if (/bulk-parity-exception:\s*\S.{2,}/.test(lines[k] ?? "")) return true;
  return false;
}

/** Index just past the `)` that closes the call whose `(` is at `open` (strings skipped). */
function closeParen(text, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i += 1;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(") depth += 1;
    else if (c === ")" && --depth === 0) return i + 1;
  }
  return -1;
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/**
 * defineRowVerbs used as a BULK-ONLY list: verbs with a no-op `onClick`, or a call whose
 * `rowActionDefs` half is thrown away (`defineRowVerbs(…).bulkActions`, `const { bulkActions } =
 * defineRowVerbs(…)`). Returns the sites.
 */
function bulkOnlySites(code) {
  const sites = [];
  if (!/\bdefineRowVerbs\s*[<(]/.test(code)) return sites;
  const lines = code.split("\n");
  // Local no-op consts (`const none = () => {}`) count as no-op handlers too.
  const noopNames = [...code.matchAll(new RegExp(String.raw`\bconst\s+(\w+)\s*=\s*${NOOP_FN}`, "g"))].map((m) => m[1]);
  const noopOnClick = new RegExp(
    String.raw`\bonClick\s*:\s*(?:${NOOP_FN}${noopNames.length ? `|(?:${noopNames.map(escapeRe).join("|")})\\b` : ""})`,
  );
  lines.forEach((line, i) => {
    if (noopOnClick.test(line)) sites.push({ line: i + 1, what: line.trim().slice(0, 60) });
  });
  for (const m of code.matchAll(/\bdefineRowVerbs\s*(?:<[^()]*?>)?\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const end = closeParen(code, open);
    if (end > 0 && /^\s*\.\s*bulkActions\b/.test(code.slice(end))) {
      sites.push({ line: lineOf(code, end), what: ").bulkActions (row half discarded)" });
    }
    const before = code.slice(Math.max(0, m.index - 200), m.index);
    const destructure = before.match(/\{([^{}]*)\}\s*=\s*$/);
    if (destructure && /\bbulkActions\b/.test(destructure[1]) && !/\browActionDefs\b/.test(destructure[1])) {
      sites.push({ line: lineOf(code, m.index), what: "{ bulkActions } = defineRowVerbs (row half discarded)" });
    }
  }
  return sites.sort((a, b) => a.line - b.line);
}

/** `noBulk` on a verb whose id or label is in the vocabulary, without an exception. */
function mutatingNoBulkSites(code, rawLines) {
  const lines = code.split("\n");
  const sites = [];
  const exceptions = [];
  lines.forEach((line, i) => {
    if (!NO_BULK.test(line)) return;
    // A registry entry: `archive: { noBulk: "single" }` — the key is the id.
    const keyed = line.match(/(["']?)([\w-]+)\1\s*:\s*\{\s*noBulk\s*:/);
    let verb = keyed && isMutatingVerb(keyed[2], "id") ? keyed[2] : null;
    // An object verb: its id / label sit on this line or the lines since its `id:`. A registry
    // entry is decided by its key alone (the ids above it belong to the registry, not to it).
    if (!keyed) {
      let from = i;
      for (let k = i; k >= Math.max(0, i - 20); k--) {
        from = k;
        if (/\bid\s*:/.test(lines[k])) break;
      }
      for (let k = from; k <= i && !verb; k++) {
        for (const m of lines[k].matchAll(VERB_FIELD)) {
          if (isMutatingVerb(m[3], m[1])) {
            verb = m[3];
            break;
          }
        }
      }
      if (verb && (excepted(rawLines, from) || excepted(rawLines, i))) {
        exceptions.push({ line: i + 1, what: `noBulk on ${verb}` });
        return;
      }
    } else if (excepted(rawLines, i)) {
      exceptions.push({ line: i + 1, what: `noBulk on ${verb}` });
      return;
    }
    if (verb) sites.push({ line: i + 1, what: `noBulk on ${verb}` });
  });
  return { sites, exceptions };
}

/** One file's sites by rule. */
export function scanSource(file, text) {
  if (OUT_OF_SCOPE.test(file)) return null;
  const rawLines = text.split("\n");
  const code = stripComments(text);
  const lines = code.split("\n");
  const verbs = [];
  const parallel = [];
  const handWritten = [];
  const exceptions = [];
  const twins = USES_TWINS.test(code);
  const surface = LIST_SURFACE.test(code);
  const rowVerbs = ROW_VERBS.test(code);
  // A verb's id and label on neighbouring lines are ONE verb.
  let lastIdLine = -10;
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || /^import\b/.test(line)) return;
    if (PARALLEL.some((re) => re.test(line))) {
      const site = { line: i + 1, what: line.slice(0, 60) };
      if (excepted(rawLines, i)) exceptions.push(site);
      else if (twins) parallel.push(site);
      else if (rowVerbs) handWritten.push(site);
    }
    if (!surface) return;
    // One verb per line: `{ id: "approve", label: "Approve" }` is one verb, not two.
    for (const m of line.matchAll(VERB_FIELD)) {
      const value = m[3].trim();
      const isId = m[1] === "id" && VERB_ID.test(value);
      if (isId || (m[1] === "label" && VERB_LABEL.test(value) && i - lastIdLine > 2)) {
        (excepted(rawLines, i) ? exceptions : verbs).push({ line: i + 1, what: value });
        if (isId) lastIdLine = i;
        break;
      }
    }
  });
  const bulkOnly = bulkOnlySites(code);
  const noBulk = mutatingNoBulkSites(code, rawLines);
  exceptions.push(...noBulk.exceptions);
  return {
    surface,
    hasBulk: HAS_BULK.test(code),
    verbs,
    parallel,
    handWritten,
    bulkOnly,
    mutatingNoBulk: noBulk.sites,
    // One site per line: a verb's census line and its noBulk line are often the same line.
    exceptions: [...new Map(exceptions.map((e) => [e.line, e])).values()].sort((a, b) => a.line - b.line),
  };
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
  if (paths) files = files.filter((f) => paths.some((p) => f === p || f.startsWith(`${p.replace(/\/+$/, "")}/`)));
  const out = [];
  const push = (rule, rel, sites) => {
    if (sites.length) out.push({ key: `${rule}|${rel}`, rule, file: rel, sites });
  };
  for (const rel of files) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const s = scanSource(rel, readFileSync(abs, "utf8"));
    if (!s) continue;
    push("parallel-bulk-list", rel, s.parallel);
    push("bulk-only-row-verbs", rel, s.bulkOnly);
    push("mutating-no-bulk", rel, s.mutatingNoBulk);
    push("hand-written-bulk-list", rel, s.handWritten);
    push("bulk-parity-exception", rel, s.exceptions);
    // THE FILE ITSELF must act on a selection: a comment saying `bulkActions` or a bar in a
    // sibling file never covers this file's verbs.
    if (s.surface && !s.hasBulk) push("missing-bulk-twin", rel, s.verbs);
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
    // A parallel list, a bulk-only defineRowVerbs and an unexplained noBulk on a mutating verb are
    // never grandfathered (RULES[rule].baselinable).
    const kept = found.filter((f) => RULES[f.rule].baselinable);
    writeBaseline(root, Object.fromEntries(kept.map((f) => [f.key, f.sites.length])));
    console.log(`${TAG} initial baseline: ${kept.length} item(s)`);
    return 0;
  }
  let fresh = 0;
  // A rule that is never baselined is new at any count, whatever a stale baseline says.
  const isNew = (f) => !RULES[f.rule].baselinable || f.sites.length > (baseline[f.key] ?? 0);
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
    `${TAG} ${count("missing-bulk-twin")} list file(s) with row verbs and no bulk twin, ${count("parallel-bulk-list")} parallel bulk list(s), ${count("bulk-only-row-verbs")} bulk-only defineRowVerbs, ${count("mutating-no-bulk")} unexplained noBulk on a mutating verb, ${count("hand-written-bulk-list")} hand-written bulk list(s), ${count("bulk-parity-exception")} exception(s); ${fresh} new${paths ? " (narrowed scan)" : ""}`,
  );
  return argv.includes("--strict") && fresh ? 1 : 0;
}

/** The vocabulary matches every verb as an id (kebab, snake, camel) and a label; look-alikes do not. */
function vocabularySelfTest() {
  const misses = [];
  for (const verb of MUTATING_VERBS) {
    const words = verb.split(" ");
    const ids = [words.join("-"), words.join("_"), words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join(""), `${words.join("-")}-all`];
    const labels = [verb[0].toUpperCase() + verb.slice(1), words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" "), `${verb[0].toUpperCase() + verb.slice(1)} selected`];
    for (const id of ids) if (!isMutatingVerb(id, "id")) misses.push(`id ${id}`);
    for (const label of labels) if (!isMutatingVerb(label, "label")) misses.push(`label ${label}`);
  }
  const lookAlikes = [
    ["label", "Rejected"], ["label", "Closed"], ["label", "History"], ["label", "Open"], ["label", "Sender"],
    ["label", "Cancellation policy"], ["id", "history"], ["id", "closed"], ["id", "sender"], ["id", "open"], ["id", "copy-id"],
  ];
  for (const [field, value] of lookAlikes) if (isMutatingVerb(value, field)) misses.push(`false ${field} ${value}`);
  return misses;
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "bulk-parity-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const baselinable = {
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
      // NEW RULE — a COMMENT naming bulkActions does not cover the file.
      "features/d/Commented.tsx":
        '// bulkActions live on the board below\nexport const C = () => <MatrxDataTable rowActionDefs={[{ id: "cancel", label: "Cancel", onClick }]} />;\n',
      // NEW RULE — a folder SIBLING with a bar does not cover this hook's verbs.
      "features/e/useRowActions.tsx": 'export function useRowActions() { const menuFor = () => () => ({ items: [{ id: "delete", label: "Delete" }] }); }\n',
      "features/e/config.tsx": "export const config = { bulkActions: [], useRowActions };\n",
      // NEW RULE — a hand-written bulk list in a file with row verbs and no defineRowVerbs (baselinable).
      "features/f/Tasks.tsx": [
        'const rowActionDefs = [{ id: "edit", label: "Edit", onClick }];',
        'const actions: EntityBulkAction<Task>[] = [{ id: "complete", label: "Mark complete", run }];',
      ].join("\n"),
      "features/ok4/Exc.tsx":
        '// bulk-parity-exception: one-off ledger rows, never acted on together\nexport const E = () => <MatrxDataTable rowActionDefs={[{ id: "revoke", label: "Revoke", onClick }]} />;\n',
    };
    const blocking = {
      // defineRowVerbs plus a hand-written twin list beside it.
      "features/c/Twice.tsx": [
        'import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";',
        "const { rowActionDefs, bulkActions } = defineRowVerbs([{ id: \"approve\", label: \"Approve\", onClick: open, bulk: false, noBulk: \"single\" }], opts);",
        'const extra: EntityBulkAction<Row>[] = [{ id: "approve", label: "Approve", run }];',
      ].join("\n"),
      // NEW RULE — defineRowVerbs as a bulk-only list: a local no-op and the row half discarded.
      "features/g/rosterVerbs.ts": [
        'import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";',
        "export function rosterVerbs() {",
        "  const none = () => {};",
        "  return defineRowVerbs<Member>(",
        '    [{ id: "suspend", label: "Suspend", onClick: none, bulk: { runOne } }],',
        "    opts,",
        "  ).bulkActions;",
        "}",
      ].join("\n"),
      // NEW RULE — the same, destructured: an inline no-op and only `bulkActions` taken.
      "features/h/Classes.tsx": [
        'import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";',
        "const { bulkActions } = defineRowVerbs([",
        '  { id: "archive", label: "Archive", onClick: () => {}, bulk: { runOne } },',
        "], opts);",
      ].join("\n"),
      // NEW RULE — noBulk on a destructive verb with only a one-word reason (object and registry forms).
      "features/i/useBrandRowActions.tsx": [
        'import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";',
        "export const { rowActionDefs } = defineRowVerbs([",
        '  { id: "open", label: "Open", onClick: openIt, bulk: false, noBulk: "open" },',
        '  { id: "archive", icon: Archive, label: "Archive brand", tone: "destructive", onClick: archiveIt, bulk: false, noBulk: "single" },',
        "], opts);",
      ].join("\n"),
      "features/j/accountTwins.ts": [
        'import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";',
        'export const actions = bulkActionsFromRowVerbs(allUserActions(), { revoke_sessions: { noBulk: "single" }, message: { noBulk: "single" } }, opts);',
      ].join("\n"),
    };
    const quietFiles = {
      // Quiet: one declaration with both halves used; an option label in a non-list file; tests.
      "features/ok/Good.tsx": [
        'import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";',
        'const { rowActionDefs, bulkActions } = defineRowVerbs([{ id: "approve", label: "Approve", onClick: approveIt, bulk: { runOne } }], opts);',
        "export const G = () => <MatrxDataTable rowActionDefs={rowActionDefs} selection={bulk.selection} />;",
      ].join("\n"),
      "features/ok3/Options.tsx": 'const OPTIONS = [{ value: "rejected", label: "Rejected" }, { label: "Approved" }];\n',
      // Quiet: a mutating noBulk WITH a reasoned exception (counted as an exception, ratchets).
      "features/ok5/Excepted.tsx": [
        'import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";',
        "export const { rowActionDefs, bulkActions } = defineRowVerbs([",
        "  // bulk-parity-exception: transferring ownership names one new owner per organization",
        '  { id: "remove-owner", label: "Remove owner", onClick: removeIt, bulk: false, noBulk: "single" },',
        "], opts);",
      ].join("\n"),
      "features/a/Board.test.tsx": 'const rowActionDefs = [{ id: "approve" }];\n',
    };
    const plantAll = (files) => {
      for (const [name, text] of Object.entries(files)) {
        mkdirSync(dirname(join(dir, name)), { recursive: true });
        writeFileSync(join(dir, name), text);
      }
    };
    plantAll({ ...baselinable, ...blocking, ...quietFiles });
    const got = collect({ root: dir }).map((f) => `${f.key}=${f.sites.length}`);
    const want = [
      "bulk-only-row-verbs|features/g/rosterVerbs.ts=2",
      "bulk-only-row-verbs|features/h/Classes.tsx=2",
      "bulk-parity-exception|features/ok4/Exc.tsx=1",
      "bulk-parity-exception|features/ok5/Excepted.tsx=1",
      "hand-written-bulk-list|features/f/Tasks.tsx=1",
      "missing-bulk-twin|features/a/Board.tsx=2",
      "missing-bulk-twin|features/b/useRowActions.tsx=1",
      "missing-bulk-twin|features/d/Commented.tsx=1",
      "missing-bulk-twin|features/e/useRowActions.tsx=1",
      "mutating-no-bulk|features/c/Twice.tsx=1",
      "mutating-no-bulk|features/i/useBrandRowActions.tsx=1",
      "mutating-no-bulk|features/j/accountTwins.ts=1",
      "parallel-bulk-list|features/c/Twice.tsx=1",
    ];
    const counts = Object.fromEntries(
      want
        .map((w) => w.split("="))
        .filter(([k]) => RULES[k.split("|")[0]].baselinable)
        .map(([k, n]) => [k, Number(n)]),
    );
    mkdirSync(join(dir, "scripts/bulk-parity"), { recursive: true });
    // A stale baseline that DOES list a blocking key must not grandfather it.
    writeFileSync(join(dir, BASELINE), JSON.stringify({ counts: { ...counts, "bulk-only-row-verbs|features/g/rosterVerbs.ts": 9 } }));
    const quiet = console.log;
    console.log = () => {};
    let withBlocking, atBaseline, raised;
    const eachBlockingRed = {};
    try {
      // Blocking rules are never grandfathered: red at the baseline.
      withBlocking = main(["--strict"], dir);
      for (const name of Object.keys(blocking)) rmSync(join(dir, name));
      atBaseline = main(["--strict"], dir);
      // A planted break for EACH blocking rule, alone: red.
      for (const [name, text] of Object.entries(blocking)) {
        plantAll({ [name]: text });
        eachBlockingRed[name] = main(["--strict"], dir);
        rmSync(join(dir, name));
      }
      // A planted break: a new mutating row verb with no bulk twin.
      writeFileSync(
        join(dir, "features/a/Board.tsx"),
        readFileSync(join(dir, "features/a/Board.tsx"), "utf8").replace('{ id: "history"', '{ id: "pause", label: "Pause", onClick },\n    { id: "history"'),
      );
      raised = main(["--strict"], dir);
    } finally {
      console.log = quiet;
    }
    const vocab = vocabularySelfTest();
    const ok =
      JSON.stringify(got) === JSON.stringify(want) &&
      withBlocking === 1 &&
      atBaseline === 0 &&
      Object.values(eachBlockingRed).every((code) => code === 1) &&
      raised === 1 &&
      vocab.length === 0;
    console.log(
      `${TAG} self-test ${ok ? "PASS" : "FAIL"}: ${JSON.stringify(got)} withBlocking=${withBlocking} atBaseline=${atBaseline} eachBlockingRed=${JSON.stringify(eachBlockingRed)} raised=${raised} vocabulary=${vocab.length ? JSON.stringify(vocab) : "ok"}`,
    );
    return ok ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
