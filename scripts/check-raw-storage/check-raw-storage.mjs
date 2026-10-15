#!/usr/bin/env node
/**
 * check:raw-storage — ONE DOOR TO BROWSER STORAGE (2026-10-14).
 *
 * Browser storage holds only what is specific to this browser at this moment (a draft, a panel
 * size, a cache, a device id, a one-shot handoff, a per-tab diagnostic); every choice about a chat,
 * record, run or setting persists on the server. Outside `lib/sync/` nothing touches
 * `localStorage` / `sessionStorage` directly:
 *   - a Redux slice persists through a sync policy (`lib/sync/policies/define.ts`);
 *   - anything else declares its key once with `defineClientKey` / `defineClientKeyFamily`
 *     (`lib/sync/client-storage.ts`) — SSR-safe, never throws, one `matrx:client:` prefix, a key
 *     registry with the kind of client-moment state and why it is browser-only;
 *   - a setting moves to `lib/redux/preferences` (server-saved), never to browser storage.
 *
 * Two items, keyed per file (the count is the ratchet):
 *
 *   raw-call|<file>    `localStorage.getItem(…)`, `window.sessionStorage.setItem(…)`, `.removeItem`,
 *                      `.clear()`, `.key(i)` or bracket access `localStorage[k]`.
 *   raw-alias|<file>   the storage object handed around (`const s = window.localStorage`,
 *                      `Object.keys(localStorage)`, `storage ?? window.sessionStorage`) — the way
 *                      around the first rule.
 *
 * A call that genuinely cannot use the door (a pre-paint inline <script> string, the admin storage
 * inspector) says so with `raw-storage-exception: <reason>` on the line or within the 3 lines above
 * it — and that exception is itself an item (`raw-storage-exception|<file>`) on the same ratchet.
 *
 * Out of scope: lib/sync/ (the engine and the door), tests, scripts/, type declarations.
 *
 * BASELINE (scripts/check-raw-storage/baseline.json) ONLY SHRINKS: per key a count. A key absent from
 * the baseline, or a count above it, is NEW. `--shrink` lowers counts and drops fixed keys; it never
 * raises one. `--strict` exits 1 on a NEW item. `--list` prints every known item (the census).
 *
 *   node scripts/check-raw-storage/check-raw-storage.mjs [paths…] [--strict] [--shrink] [--list]
 *   node scripts/check-raw-storage/check-raw-storage.mjs --write-initial-baseline   (only when none exists)
 *   node scripts/check-raw-storage/check-raw-storage.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emitItem, endItems } from "../checks/items.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TAG = "[raw-storage]";
const BASELINE = "scripts/check-raw-storage/baseline.json";

export const RULES = {
  "raw-call": {
    title: "raw browser-storage call",
    fix: "Declare the key with defineClientKey / defineClientKeyFamily from @/lib/sync/client-storage (kind + reason). A setting or choice moves to lib/redux/preferences (server-saved) instead.",
  },
  "raw-alias": {
    title: "browser-storage object passed around",
    fix: "Do not hand localStorage/sessionStorage around; read and write through a declared key from @/lib/sync/client-storage.",
  },
  "raw-storage-exception": {
    title: "raw-storage exception",
    fix: "A new `raw-storage-exception:` is reviewed like any new item: say why the door cannot serve this (e.g. a pre-paint inline script string), or move it onto @/lib/sync/client-storage.",
  },
};

export function remedyForKey(key) {
  return RULES[String(key).split("|")[0]]?.fix ?? null;
}

const OUT_OF_SCOPE =
  /(^|\/)node_modules\/|^lib\/sync\/|\.(test|spec)\.(t|j)sx?$|\/__tests__\/|(^|\/)scripts\/|\.d\.ts$|^tests\/|^e2e\//;

const STORE = String.raw`(?:localStorage|sessionStorage)`;
const CALL_RE = new RegExp(String.raw`\b${STORE}\s*\??\.\s*(getItem|setItem|removeItem|clear|key)\b|\b${STORE}\s*\[`, "g");
const ALIAS_RE = new RegExp(
  String.raw`(?:=|\?\?|\|\||\(|,|\breturn)\s*(?:window\.|globalThis\.|self\.)?(${STORE})\b(?!\s*\??\.|\s*\[|\s*[!=]==?|\s+in\b|\s*:)`,
  "g",
);

function excepted(lines, lineIdx) {
  for (let i = Math.max(0, lineIdx - 3); i <= lineIdx; i++) if (/raw-storage-exception:/.test(lines[i] ?? "")) return true;
  return false;
}

const isCommentLine = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

/** True when `index` in `line` sits inside a plain '…' or "…" string (template strings count as code). */
function insidePlainString(line, index) {
  let quote = null;
  for (let i = 0; i < index; i++) {
    const c = line[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "/" && line[i + 1] === "/") return true; // trailing comment
  }
  return quote !== null;
}

/** One file's sites: [{ rule, line, what }]. */
export function scanSource(file, text) {
  if (OUT_OF_SCOPE.test(file)) return [];
  const lines = text.split("\n");
  const sites = [];
  lines.forEach((line, idx) => {
    if (isCommentLine(line)) return;
    for (const [rule, re] of [
      ["raw-call", CALL_RE],
      ["raw-alias", ALIAS_RE],
    ]) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        if (rule === "raw-alias" && insidePlainString(line, m.index)) continue;
        if (rule === "raw-call" && insidePlainString(line, m.index) && !excepted(lines, idx)) continue;
        const what = m[0].trim().slice(0, 60);
        sites.push(excepted(lines, idx) ? { rule: "raw-storage-exception", line: idx + 1, what: `${what} (${rule})` } : { rule, line: idx + 1, what });
      }
    }
  });
  return sites;
}

function gitFiles(cwd) {
  try {
    return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs"], {
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
  let files = gitFiles(root).filter((f) => !OUT_OF_SCOPE.test(f) && !f.startsWith("public/"));
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
  if (!existsSync(abs)) return {};
  return JSON.parse(readFileSync(abs, "utf8")).counts ?? {};
}

function writeBaseline(root, counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    join(root, BASELINE),
    `${JSON.stringify({ note: "Shrink-only: raw localStorage/sessionStorage use outside lib/sync not yet on @/lib/sync/client-storage or server preferences. Lower a count by migrating; never add a key or raise a count (scripts/check-raw-storage/check-raw-storage.mjs).", counts: sorted }, null, 2)}\n`,
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
  if (argv.includes("--list")) for (const f of found) console.log(`  ${f.sites.length}\t${f.key}`);
  if (!paths && argv.includes("--shrink")) {
    const live = new Map(found.map((f) => [f.key, f.sites.length]));
    const kept = {};
    for (const [k, v] of Object.entries(baseline)) if (live.has(k)) kept[k] = Math.min(v, live.get(k));
    writeBaseline(root, kept);
    console.log(`${TAG} baseline shrunk ${Object.keys(baseline).length} → ${Object.keys(kept).length} item(s)`);
  }
  const sum = (r) => found.filter((f) => f.rule === r).reduce((n, f) => n + f.sites.length, 0);
  console.log(
    `${TAG} ${found.length} item(s): ${sum("raw-call")} raw calls, ${sum("raw-alias")} aliases, ${sum("raw-storage-exception")} exceptions; ${fresh} new${paths ? " (narrowed scan)" : ""}`,
  );
  return argv.includes("--strict") && fresh ? 1 : 0;
}

/** Proves each rule fires on its planted shape and stays quiet on the door, comments and strings. */
function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "raw-storage-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const plant = {
      "features/a/Draft.tsx":
        'export function load() { return localStorage.getItem("draft"); }\nexport const save = (v: string) => window.sessionStorage?.setItem("k", v);\nexport const peek = (k: string) => localStorage[k];\n',
      "features/b/Around.ts":
        "const store = window.localStorage;\nexport const all = Object.keys(sessionStorage);\nexport const pick = (s?: Storage) => s ?? globalThis.localStorage;\n",
      "lib/x/boot.tsx":
        "// raw-storage-exception: pre-paint inline script string\nexport const script = `try{localStorage.getItem('w')}catch(e){}`;\n",
      // Quiet: the door, comments, plain strings, typeof checks, lib/sync, tests.
      "features/ok/Ok.ts":
        'import { defineClientKey } from "@/lib/sync/client-storage";\n// localStorage.getItem("x") in a comment\nconst msg = "never touch localStorage.setItem here";\nif (typeof localStorage === "undefined") {}\nexport const k = defineClientKey({ id: "ok", area: "local", kind: "draft", reason: "r" });\n',
      "lib/sync/client-storage.ts": 'export const x = window.localStorage.getItem("y");\n',
      "features/ok/Ok.test.ts": 'localStorage.setItem("a", "b");\n',
    };
    for (const [name, text] of Object.entries(plant)) {
      execFileSync("mkdir", ["-p", dirname(join(dir, name))]);
      writeFileSync(join(dir, name), text);
    }
    const got = collect({ root: dir }).map((f) => `${f.key}=${f.sites.length}`);
    const want = [
      "raw-alias|features/b/Around.ts=3",
      "raw-call|features/a/Draft.tsx=3",
      "raw-storage-exception|lib/x/boot.tsx=1",
    ];
    execFileSync("mkdir", ["-p", join(dir, "scripts/check-raw-storage")]);
    writeFileSync(
      join(dir, BASELINE),
      JSON.stringify({
        counts: { "raw-alias|features/b/Around.ts": 3, "raw-call|features/a/Draft.tsx": 2, "raw-storage-exception|lib/x/boot.tsx": 1 },
      }),
    );
    const quiet = console.log;
    console.log = () => {};
    let strict;
    try {
      strict = main(["--strict"], dir);
    } finally {
      console.log = quiet;
    }
    const ok = JSON.stringify(got) === JSON.stringify(want) && strict === 1;
    console.log(`${TAG} self-test ${ok ? "PASS" : "FAIL"}: ${JSON.stringify(got)} strict=${strict}`);
    return ok ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
