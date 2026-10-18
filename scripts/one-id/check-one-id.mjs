#!/usr/bin/env node
/**
 * check:one-id — THERE IS ONE ID (Arman, 2026-10-18).
 *
 * Every record id a person sees or copies is `<RecordId value label token />` from
 * `@ai-matrx/design-system` (the table's MatrxUuidCell is the same component): short or whole, the full
 * id on hover, one-click copy, the record's doors. Agents kept hand-building their own: an
 * `id.slice(0, 8)` in a <code>, a private copy-id button, a local `CopyableUuid` chip.
 *
 * Three items, each keyed per file (the count is the ratchet):
 *
 *   hand-shortened-id|<file>      an id cut down by hand for display: `x.id.slice(0, n)`, `xId.slice(…)`,
 *                                 `truncateId(…)`, a local `shortId(…)`/`shortUuid(…)`.
 *   hand-copied-id|<file>         an id copied by hand: `copyText(<…id…>)`, `navigator.clipboard.writeText(<…id…>)`,
 *                                 or a copy control titled/labelled "Copy ID" / "Copy UUID" / "Copy agent ID" /
 *                                 "Copy Memory ID" (up to three words before the id word), or a copy helper whose
 *                                 id follows literal args: `handleCopy("agent-id", agentId, …)`.
 *   hand-built-id-component|<file> a component DECLARED to show/copy an id (CopyableUuid, CopyableId*, *IdBadge,
 *                                 *IdCopy, ShortId, IdChip, UuidDisplay) outside record-id.tsx / MatrxUuidCell.tsx.
 *   id-exception|<file>           an `id-exception: <reason>` on the line or within 3 lines above; ratchets too.
 *
 * Not reported: `key=`, hrefs/URLs, data-/aria- attributes, logs, tests, and context-menu ITEMS labeled
 * "Copy ID" inside a menu config (`label: "Copy ID"`, a MenuItem).
 *
 * Scanned: this repo's .tsx and every `../aidream/apps/shared/<pkg>` source file.
 * BASELINE (scripts/one-id/baseline.json) ONLY SHRINKS. `--shrink` lowers counts, never raises;
 * `--strict` exits 1 on a NEW item; `--list` prints the census.
 *
 *   node scripts/one-id/check-one-id.mjs [paths…] [--strict] [--shrink] [--list]
 *   node scripts/one-id/check-one-id.mjs --write-initial-baseline   (only when no baseline exists)
 *   node scripts/one-id/check-one-id.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emitItem, endItems } from "../checks/items.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TAG = "[one-id]";
const BASELINE = "scripts/one-id/baseline.json";
const AIDREAM_SHARED = "../aidream/apps/shared";
const FIX =
  "Show/copy the id with <RecordId value={id} label token /> from @ai-matrx/design-system (playground: the design-system RecordId demo; same component as MatrxUuidCell). Not a record id? `id-exception: <reason>`.";

export const RULES = {
  "hand-shortened-id": { title: "hand-shortened id", fix: FIX },
  "hand-copied-id": { title: "hand-copied id", fix: FIX },
  "hand-built-id-component": { title: "hand-built id component", fix: `Delete the local id chip/copier and render <RecordId>. ${FIX}` },
  "id-exception": { title: "id exception", fix: "A new `id-exception:` is reviewed like any new item: say why this is not a record id shown to a person, or move it onto <RecordId>." },
};

export function remedyForKey(key) {
  return RULES[String(key).split("|")[0]]?.fix ?? null;
}

const OUT_OF_SCOPE =
  /(^|\/)node_modules\/|\/dist\/|\.(test|spec)\.tsx$|\/__tests__\/|^app\/\((dev|lab)\)\/|\/demos?\/|\.stories\.tsx$|(^|\/)(playground|scripts)\/|^app\/\(public\)\/free\/|(^|\/)design-system\/src\/(record-id|data-table\/MatrxUuidCell)\.tsx$/;

/** Lines that are never a person-facing id: keys, links, attributes, logs, ids sent to services. */
const SKIP_LINE =
  /\bkey=|\bhref=|\bsrc=|\bdata-[\w-]+=|\baria-[\w-]+=|console\.\w+\(|\blogger?\.\w+\(|\blog(?:Debug|Info|Warn|Error)\(|\bthrow new|\bnew Error\(|\bcaptureError\(|https?:\/\/|["'`]\/[\w-]+\/\$\{|\brouter\.(push|replace)\(|\bfetch\(|\bclassName=\{?["'`][^"'`]*\$\{[^}]*\.slice/;

const ID_NAME = String.raw`(?:id|\w+Id|\w+_id|uuid|\w*Uuid|\w+_uuid)`;
/** `row.id.slice(0, 8)`, `agentId.slice(…)`, `node?.id.slice(…)`, `x.id?.slice(…)`. */
const SLICE_RE = new RegExp(String.raw`\b(?:\w+(?:\?)?\.)*${ID_NAME}\??\.(?:slice|substring|substr)\(\s*0\s*,\s*\d+`);
const SHORTENER_CALL_RE = /\b(?:truncateId|shortId|shortUuid|shortenId|shortenUuid|truncateUuid|formatShortId|abbreviateId)\s*\(/;
const COPY_ARG = String.raw`\(\s*(?:[\w$]+\??\.)*${ID_NAME}\s*[,)]`;
const CLIPBOARD_RE = new RegExp(String.raw`clipboard\??\.writeText\s*${COPY_ARG}`);
/** Any copy helper (`copyText`, `handleCopy`, `onCopyId`, `copy`) with an id-named argument in ANY position. */
const COPY_FN_RE = /\b(?:copy|copyText|copyToClipboard|copyNotify|copyId|copyUuid|handleCopy|handleCopyId|handleCopyUuid|onCopy|onCopyId)\s*\(([^()]*)\)/g;
const ID_ARG_RE = new RegExp(String.raw`^\s*(?:[\w$]+\??\.)*${ID_NAME}\s*$`);
function copiesAnId(line) {
  const clip = line.match(CLIPBOARD_RE);
  if (clip) return clip[0];
  // The id is the value copied when every argument before it is a string literal (a key or message):
  // `handleCopy("agent-id", agentId, …)`. `onCopy(segment.text, segment.id)` copies text, id is only a key.
  for (const m of line.matchAll(COPY_FN_RE)) {
    const args = m[1].split(",");
    for (let k = 0; k < args.length; k++) {
      // handleCopy/onCopy take (key, text) as often as (text): an id there only counts after a literal key.
      if (ID_ARG_RE.test(args[k]) && (k > 0 || /^(?:copy|copyText|copyToClipboard|copyNotify)\b/.test(m[0]))) return m[0];
      if (!/^\s*["'`]/.test(args[k])) break;
    }
  }
  return null;
}
/** "Copy ID", "Copy UUID", "Copy agent ID", "Copy Memory ID", "Copy conversation id" (up to three words before the id word) as a title/aria-label/label or button text. */
const COPY_WORDS = String.raw`Copy (?:(?!and\b)[A-Za-z]+ ){0,3}?(?:ID|Id|id|UUID|uuid)(?: to clipboard)?`;
const COPY_LABEL_RE = new RegExp(String.raw`(?:title|aria-label|label|tooltip)\s*=\s*\{?\s*["'\`]${COPY_WORDS}["'\`]|>\s*${COPY_WORDS}\s*<|["'\`]${COPY_WORDS}["'\`]`);
const MENU_ITEM_LINE = /\blabel\s*:|MenuItem|DropdownItem|ContextItem|\bitems?\s*:|\bactions?\s*:/;
const ID_COMPONENT = /^(?:CopyableUuid\w*|CopyableId\w*|\w*IdBadge|\w*IdCopy|ShortId|IdChip|UuidDisplay\w*|\w*UuidChip|\w*IdChip)$/;
const DECLARE_RE =
  /(?:export\s+)?(?:default\s+)?(?:function\s+([A-Z]\w*)|class\s+([A-Z]\w*)|const\s+([A-Z]\w*)\s*(?::[^=]+)?=\s*(?:React\.)?(?:forwardRef|memo|\(|function|\w+\s*=>))/g;
const LOCAL_SHORTENER_DECL = /\b(?:function|const)\s+(?:shortId|shortUuid|truncateId|shortenId)\b/;

function excepted(lines, i) {
  for (let k = Math.max(0, i - 3); k <= i; k++) if (/id-exception:/.test(lines[k] ?? "")) return true;
  return false;
}

/** One file's sites: [{ rule, line, what }]. */
export function scanSource(file, text) {
  if (OUT_OF_SCOPE.test(file)) return [];
  const lines = text.split("\n");
  const sites = [];
  let lastLabelLine = -10;
  const add = (rule, i, what) =>
    sites.push(excepted(lines, i) ? { rule: "id-exception", line: i + 1, what: `${what} (${rule})` } : { rule, line: i + 1, what });
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || /^(\/\/|\*|\/\*)/.test(line)) return;
    const cl = line.match(COPY_LABEL_RE);
    if (cl && !MENU_ITEM_LINE.test(line)) {
      // One control often carries title= AND aria-label= on adjacent lines: one site, not two.
      if (i - lastLabelLine > 2) add("hand-copied-id", i, cl[0].trim().slice(0, 48));
      lastLabelLine = i;
      return;
    }
    if (SKIP_LINE.test(line)) return;
    if (LOCAL_SHORTENER_DECL.test(line)) { add("hand-shortened-id", i, "local id shortener"); return; }
    const sl = line.match(SLICE_RE) ?? line.match(SHORTENER_CALL_RE);
    if (sl) { add("hand-shortened-id", i, sl[0].slice(0, 48)); return; }
    const cp = copiesAnId(line);
    if (cp && !MENU_ITEM_LINE.test(line)) add("hand-copied-id", i, cp.slice(0, 48));
  });
  const lineOf = (index) => text.slice(0, index).split("\n").length - 1;
  for (const m of text.matchAll(DECLARE_RE)) {
    const name = m[1] ?? m[2] ?? m[3];
    if (name && ID_COMPONENT.test(name)) add("hand-built-id-component", lineOf(m.index), name);
  }
  return sites.sort((a, b) => a.line - b.line);
}

function gitFiles(cwd, pattern) {
  try {
    return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", pattern], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function listFiles(root) {
  const out = gitFiles(root, "*.tsx").map((f) => ({ rel: f, abs: join(root, f) }));
  const shared = resolve(root, AIDREAM_SHARED);
  if (existsSync(shared)) {
    const aidream = resolve(shared, "..", "..");
    for (const f of gitFiles(aidream, "apps/shared/*/**/*.tsx")) out.push({ rel: `aidream:${f}`, abs: join(aidream, f) });
  }
  return out.filter((f) => !OUT_OF_SCOPE.test(f.rel.replace(/^aidream:/, "")));
}

export function collect({ root = ROOT, paths = null } = {}) {
  let files = listFiles(root);
  if (paths) files = files.filter((f) => paths.some((p) => f.rel === p || f.rel.startsWith(`${p.replace(/\/+$/, "")}/`)));
  const byKey = new Map();
  for (const { rel, abs } of files) {
    if (!existsSync(abs)) continue;
    for (const site of scanSource(rel.replace(/^aidream:/, ""), readFileSync(abs, "utf8"))) {
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
    `${JSON.stringify({ note: "Shrink-only: hand-built id displays not yet on <RecordId> (the adoption census). Lower a count by moving a surface onto RecordId; never add a key or raise a count (scripts/one-id/check-one-id.mjs).", counts: sorted }, null, 2)}\n`,
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
  if (!paths && argv.includes("--shrink") && !existsSync(resolve(root, AIDREAM_SHARED))) {
    console.error(`${TAG} --shrink refused: ${AIDREAM_SHARED} is not checked out next to this repo, so the scan is partial`);
    return 1;
  }
  if (!paths && argv.includes("--shrink")) {
    const live = new Map(found.map((f) => [f.key, f.sites.length]));
    const kept = {};
    for (const [k, v] of Object.entries(baseline)) if (live.has(k)) kept[k] = Math.min(v, live.get(k));
    writeBaseline(root, kept);
    console.log(`${TAG} baseline shrunk ${Object.keys(baseline).length} → ${Object.keys(kept).length} item(s)`);
  }
  const count = (r) => found.filter((f) => f.rule === r).length;
  console.log(
    `${TAG} ${found.length} file(s) with a hand-built id (shortened ${count("hand-shortened-id")}, copied ${count("hand-copied-id")}, components ${count("hand-built-id-component")}), ${fresh} new${paths ? " (narrowed scan)" : ""}`,
  );
  return argv.includes("--strict") && fresh ? 1 : 0;
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "one-id-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const plant = {
      "features/a/Slice.tsx": 'export const A = ({ run }) => <code>{run.id.slice(0, 8)}…</code>;\n',
      "features/a/Slice2.tsx": 'export const A = ({ agentId }) => <span>{agentId.slice(0, 8)}</span>;\n',
      "features/a/Trunc.tsx": 'export const A = ({ c }) => <span>{truncateId(c.id, 12)}</span>;\n',
      "features/a/CopyCall.tsx": 'export const A = ({ t }) => <button onClick={() => copyText(t.id, "ID copied")}>x</button>;\n',
      "features/a/Clip.tsx": 'export const A = ({ id }) => <button onClick={() => navigator.clipboard.writeText(id)}>x</button>;\n',
      "features/a/Label.tsx": 'export const A = () => <button title="Copy ID">x</button>;\n',
      "features/a/LabelWorded.tsx": 'export const A = () => <button title="Copy agent ID" aria-label="Copy Memory ID">x</button>;\n',
      "features/a/LabelText.tsx": 'export const A = () => <button>Copy conversation id</button>;\n',
      "features/a/CopyLater.tsx": 'export const A = ({ liveAgentId }) => <button onClick={() => handleCopy("agent-id", liveAgentId, "Agent ID copied")}>x</button>;\n',
      "features/a/CopyLater2.tsx": 'export const A = ({ run }) => <button onClick={() => copyText("ID copied", run.execution_id)}>x</button>;\n',
      "features/a/Comp.tsx": "export function CopyableUuid() { return null; }\nexport const SkillIdBadge = () => null;\n",
      // Quiet: canonical, menu items, keys/hrefs/logs, exceptions, tests, non-ids.
      "features/ok/Ok.tsx":
        'import { RecordId } from "@ai-matrx/design-system";\nexport const A = ({ id, rows }) => (<div><RecordId value={id} />{rows.map((r) => <i key={r.id.slice(0, 4)} />)}<a href={`/x/${id.slice(0, 8)}`} /></div>);\nconsole.log(id.slice(0, 8));\nconst items = [{ label: "Copy ID", run: () => copyText(row.id) }];\nconst name = title.slice(0, 8);\n',
      "features/ok/Menu.tsx": 'const items = [{ label: "Copy agent ID", run: () => handleCopy("agent-id", agentId) }];\nexport const B = () => <button title="Copy ids" tooltip="Copy name and id">x</button>;\nexport const C = () => <button onClick={() => copyText(name, "Copied")}>x</button>;\n',
      "features/ok/Exc.tsx": '// id-exception: git sha, not a record id\nexport const A = ({ shaId }) => <b>{shaId.slice(0, 7)}</b>;\nexport const B = ({ commitId }) => <b>{commitId.slice(0, 7)}</b>; // id-exception: git sha\n',
      "features/ok/Ok.test.tsx": "export const x = id.slice(0, 8);\n",
    };
    for (const [name, text] of Object.entries(plant)) {
      execFileSync("mkdir", ["-p", dirname(join(dir, name))]);
      writeFileSync(join(dir, name), text);
    }
    const got = collect({ root: dir }).map((f) => `${f.key}=${f.sites.length}`);
    const want = [
      "hand-built-id-component|features/a/Comp.tsx=2",
      "hand-copied-id|features/a/Clip.tsx=1",
      "hand-copied-id|features/a/CopyCall.tsx=1",
      "hand-copied-id|features/a/CopyLater.tsx=1",
      "hand-copied-id|features/a/CopyLater2.tsx=1",
      "hand-copied-id|features/a/Label.tsx=1",
      "hand-copied-id|features/a/LabelText.tsx=1",
      "hand-copied-id|features/a/LabelWorded.tsx=1",
      "hand-shortened-id|features/a/Slice.tsx=1",
      "hand-shortened-id|features/a/Slice2.tsx=1",
      "hand-shortened-id|features/a/Trunc.tsx=1",
      "id-exception|features/ok/Exc.tsx=1",
    ];
    // Exc.tsx: the comment above covers line 2 only; line 3's own trailing comment covers itself → both excepted.
    want[want.length - 1] = "id-exception|features/ok/Exc.tsx=2";
    execFileSync("mkdir", ["-p", join(dir, "scripts/one-id")]);
    const counts = Object.fromEntries(want.map((w) => w.split("=")).map(([k, n]) => [k, Number(n)]));
    writeFileSync(join(dir, BASELINE), JSON.stringify({ counts }));
    const quiet = console.log;
    console.log = () => {};
    let atBaseline, raised;
    try {
      atBaseline = main(["--strict"], dir);
      writeFileSync(join(dir, "features/a/New.tsx"), "export const A = ({ x }) => <i>{x.id.slice(0, 8)}</i>;\n");
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
