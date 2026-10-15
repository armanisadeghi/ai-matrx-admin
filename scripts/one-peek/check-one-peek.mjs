#!/usr/bin/env node
/**
 * check:one-peek — THERE IS ONE PEEK (Arman, 2026-10-14).
 *
 * Showing one record at a glance — on hover, on click, floating, or as a phone's bottom drawer — is
 * `Peek` from `@ai-matrx/design-system`: one typed record in, the whole card out (`Peek` inside
 * `PeekHoverCard` / `PeekPopover` / `PeekWindow`). Agents kept hand-building their own: a HoverCard
 * holding a title, rows and buttons, at its own width, with its own delay — and every one looked
 * worse than the agent picker's card the peek was lifted from.
 *
 * Two items, each keyed per file (the count is the ratchet):
 *
 *   hand-built-hover-card|<file>   a `<HoverCardContent>` (design-system's or the app's re-export):
 *                                  a rich hover surface built by hand instead of `PeekHoverCard`.
 *   hand-built-peek|<file>         a component DECLARED with a peek-shaped name (…Peek, …HoverPreview,
 *                                  …HoverCard, …DetailCard, …SneakPeek…, …QuickLook…) outside the
 *                                  package's own peek: a second card for one record.
 *
 * Scanned: this repo's .tsx and every `../aidream/apps/shared/<pkg>` source file (the packages ship UI too).
 * Out of scope: the peek's own home (design-system `peek*.tsx`, `hover-card.tsx`), tests, demos, labs.
 *
 * A surface that is genuinely not a record peek (a chart's data-point readout, a colour swatch's
 * preview) says so with `peek-exception: <reason>` on the line or within the 3 lines above it — and
 * that exception is itself an item (`peek-exception|<file>`) on the same shrink-only ratchet, so a
 * new one is NEW and gets looked at; it is never a free pass.
 *
 * An adapter that renders `<Peek …>` is the intended pattern (`function AgentPeek() { return
 * <PeekHoverCard …><Peek record={…} /></PeekHoverCard> }`) and is never reported.
 *
 * BASELINE (scripts/one-peek/baseline.json) ONLY SHRINKS: per key a count. A key absent from the
 * baseline, or a count above it, is NEW. `--shrink` lowers counts and drops fixed keys; it never
 * raises one. `--strict` exits 1 on a NEW item. `--list` prints every known item (the census).
 *
 *   node scripts/one-peek/check-one-peek.mjs [paths…] [--strict] [--shrink] [--list]
 *   node scripts/one-peek/check-one-peek.mjs --write-initial-baseline   (only when no baseline exists)
 *   node scripts/one-peek/check-one-peek.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emitItem, endItems } from "../checks/items.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TAG = "[one-peek]";
const BASELINE = "scripts/one-peek/baseline.json";
const AIDREAM_SHARED = "../aidream/apps/shared";

export const RULES = {
  "hand-built-hover-card": {
    title: "hand-built hover card",
    fix: "Show the record with <Peek record={…} /> inside <PeekHoverCard trigger={…}> from @ai-matrx/design-system (playground: design-system demo/peek-card.html). Not a record peek? `peek-exception: <reason>`.",
  },
  "peek-exception": {
    title: "peek exception",
    fix: "A new `peek-exception:` is reviewed like any new item: say why this is not one record at a glance, or move it onto <Peek record={…} />.",
  },
  "hand-built-peek": {
    title: "hand-built peek component",
    fix: "Delete the bespoke card; build a PeekRecord and render <Peek record={…} /> in PeekHoverCard / PeekPopover / PeekWindow. What the record needs that Peek cannot say becomes a field IN the package.",
  },
};

export function remedyForKey(key) {
  return RULES[String(key).split("|")[0]]?.fix ?? null;
}

const OUT_OF_SCOPE =
  /(^|\/)node_modules\/|\/dist\/|\.(test|spec)\.tsx$|\/__tests__\/|^app\/\((dev|lab)\)\/|\/demos?\/|\.stories\.tsx$|(^|\/)(playground|scripts)\/|(^|\/)design-system\/src\/(peek[^/]*|hover-card)\.tsx$/;

/** Where a HoverCardContent can come from: the design-system, any `…/hover-card` module, a ui index. */
const isHoverSource = (src) => src === "@ai-matrx/design-system" || /(^|\/)hover-card$/.test(src) || /(^|\/)components\/ui$/.test(src) || src === "@/components/ui";
const RADIX_HOVER = "@radix-ui/react-hover-card";
const NAMESPACE_RE = /import\s+\*\s+as\s+(\w+)\s+from\s*["']@radix-ui\/react-hover-card["']/g;
const IMPORT_RE = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
/**
 * A component that IS a peek: the word, optionally followed by the surface it draws (AgentPeekCard,
 * MandatePeekModal, SitePeekBody, RecordPeekShell). What merely OPENS or HOSTS one — AgentPeekButton,
 * …PeekHost, …PeekProvider — and generic previews (an image PreviewCard) are not peeks.
 */
const PEEK_NAME = /(Peek|HoverPreview|HoverCard|DetailCard|QuickLook)(Card|Body|Content|Panel|Modal|Popover|Shell|Dialog|Window|Sheet)?$/;
const DECLARE_RE =
  /(?:export\s+)?(?:default\s+)?(?:function\s+([A-Z]\w*)|class\s+([A-Z]\w*)|const\s+([A-Z]\w*)\s*(?::[^=]+)?=\s*(?:React\.)?(?:forwardRef|memo|\(|function|\w+\s*=>))/g;
/** The file renders the one peek: its peek-named components are adapters, the intended pattern. */
const RENDERS_PEEK = /<Peek[\s/>]/;

function hoverContentNames(text) {
  const names = new Set();
  for (const m of text.matchAll(IMPORT_RE)) {
    if (m[1]) continue;
    const src = m[3];
    const radix = src === RADIX_HOVER;
    if (!radix && !isHoverSource(src)) continue;
    for (const raw of m[2].split(",")) {
      const part = raw.trim();
      if (!part || part.startsWith("type ")) continue;
      const [imported, local = imported] = part.split(/\s+as\s+/).map((s) => s.trim());
      if (imported === "HoverCardContent" || (radix && imported === "Content")) names.add(local);
    }
  }
  // `import * as HoverCardPrimitive from "@radix-ui/react-hover-card"` → `<HoverCardPrimitive.Content>`.
  for (const m of text.matchAll(NAMESPACE_RE)) names.add(`${m[1]}.Content`);
  return names;
}

function excepted(lines, lineIdx) {
  for (let i = Math.max(0, lineIdx - 3); i <= lineIdx; i++) if (/peek-exception:/.test(lines[i] ?? "")) return true;
  return false;
}

const escapeName = (n) => n.replace(/[$.]/g, (c) => `\\${c}`);

/** One file's sites: [{ rule, line, what }]. */
export function scanSource(file, text) {
  if (OUT_OF_SCOPE.test(file)) return [];
  const lines = text.split("\n");
  const sites = [];
  const lineOf = (index) => text.slice(0, index).split("\n").length;
  const site = (rule, line, what) =>
    sites.push(excepted(lines, line - 1) ? { rule: "peek-exception", line, what: `${what} (${rule})` } : { rule, line, what });
  const hover = [...hoverContentNames(text)];
  if (hover.length) {
    const re = new RegExp(`<(${hover.map(escapeName).join("|")})(?=[\\s/>])`, "g");
    for (const m of text.matchAll(re)) site("hand-built-hover-card", lineOf(m.index), `<${m[1]}>`);
  }
  const adapter = RENDERS_PEEK.test(text);
  for (const m of text.matchAll(DECLARE_RE)) {
    const name = m[1] ?? m[2] ?? m[3];
    if (!name || !PEEK_NAME.test(name) || adapter) continue;
    site("hand-built-peek", lineOf(m.index), name);
  }
  return sites;
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

/** Every scanned file as { key-path, absolute path }. aidream files are keyed `aidream:<path>`. */
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
    `${JSON.stringify({ note: "Shrink-only: hand-built peeks not yet on <Peek record> (the census of what may adopt it). Lower a count by moving a surface onto Peek; never add a key or raise a count (scripts/one-peek/check-one-peek.mjs).", counts: sorted }, null, 2)}\n`,
  );
}

export function main(argv = process.argv.slice(2), root = ROOT) {
  if (argv.includes("--self-test")) return selfTest();
  const pathArgs = argv.filter((a) => !a.startsWith("--"));
  const paths = pathArgs.length ? pathArgs : null;
  const found = collect({ root, paths });
  const baseline = readBaseline(root);
  if (argv.includes("--write-initial-baseline")) {
    // Only for the guard's birth: refuses once a baseline exists, so it can never raise one.
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
  if (argv.includes("--list")) for (const f of found) console.log(`  ${f.sites.length}\t${f.key}\t${f.sites.map((s) => s.what).join(", ")}`);
  if (!paths && argv.includes("--shrink") && !existsSync(resolve(root, AIDREAM_SHARED))) {
    // Without ../aidream every `aidream:` key looks fixed; shrinking now would delete them all.
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
    `${TAG} ${found.length} file(s) with a hand-built peek (hover cards ${count("hand-built-hover-card")}, peek components ${count("hand-built-peek")}), ${fresh} new${paths ? " (narrowed scan)" : ""}`,
  );
  return argv.includes("--strict") && fresh ? 1 : 0;
}

/** Proves each rule fires on its planted shape and stays quiet on the canonical and excepted ones. */
function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "one-peek-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const plant = {
      // The owner's shape: a hand-built hover card holding a title, rows and a button.
      "features/smart-add/Why.tsx":
        'import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";\nexport function Why() { return (<HoverCard><HoverCardTrigger>i</HoverCardTrigger><HoverCardContent className="w-80"><h4>Why</h4></HoverCardContent></HoverCard>); }\n',
      // A second card for one record, declared two ways.
      "features/tasks/TaskHoverPreview.tsx": "export function TaskHoverPreview() { return <div />; }\nexport const NoteDetailCard = () => <div />;\n",
      // Canonical, excepted and out of scope: all quiet.
      "features/ok/Ok.tsx":
        'import { Peek, PeekHoverCard } from "@ai-matrx/design-system";\nimport { HoverCardContent } from "@ai-matrx/design-system";\nexport function Ok() { return (<PeekHoverCard trigger={<b />}><Peek record={{ kind: "Task", id: "1", title: "t" }} /></PeekHoverCard>); }\n// peek-exception: a chart data-point readout, not a record\nexport const x = <HoverCardContent />;\n',
      "features/ok/Ok.test.tsx": "export function FakePeek() { return null; }\n",
      // The intended adapter: a peek-named component that renders <Peek>.
      "features/agents/AgentPeek.tsx":
        'import { Peek, PeekHoverCard } from "@ai-matrx/design-system";\nexport function AgentPeek() { return (<PeekHoverCard trigger={<b />}><Peek record={{ kind: "Agent", id: "1", title: "t" }} /></PeekHoverCard>); }\n',
      // The ways around: Radix directly, a ui index, a name with the word inside, a bare arrow, a class.
      "features/sneaky/Around.tsx":
        'import * as HoverCardPrimitive from "@radix-ui/react-hover-card";\nimport { HoverCardContent } from "@/components/ui";\nexport const x = (<><HoverCardPrimitive.Content /><HoverCardContent /></>);\nexport const AgentPeekCard = props => <div />;\nexport class NotePeekPanel {}\nexport function AgentPeekButton() { return null; }\n',
    };
    for (const [name, text] of Object.entries(plant)) {
      execFileSync("mkdir", ["-p", dirname(join(dir, name))]);
      writeFileSync(join(dir, name), text);
    }
    const got = collect({ root: dir }).map((f) => `${f.key}=${f.sites.length}`);
    const want = [
      "hand-built-hover-card|features/smart-add/Why.tsx=1",
      "hand-built-hover-card|features/sneaky/Around.tsx=2",
      "hand-built-peek|features/sneaky/Around.tsx=2",
      "hand-built-peek|features/tasks/TaskHoverPreview.tsx=2",
      "peek-exception|features/ok/Ok.tsx=1",
    ];
    // The ratchet: at the baseline is known; above it is NEW and --strict fails.
    execFileSync("mkdir", ["-p", join(dir, "scripts/one-peek")]);
    writeFileSync(
      join(dir, BASELINE),
      JSON.stringify({
        counts: {
          "hand-built-hover-card|features/smart-add/Why.tsx": 1,
          "hand-built-hover-card|features/sneaky/Around.tsx": 2,
          "hand-built-peek|features/sneaky/Around.tsx": 2,
          "hand-built-peek|features/tasks/TaskHoverPreview.tsx": 1,
          "peek-exception|features/ok/Ok.tsx": 1,
        },
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
