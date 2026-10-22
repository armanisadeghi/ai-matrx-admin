#!/usr/bin/env node
// scripts/check-control-shape.mjs
//
// THE CONTROL SHAPE LAW (Arman, 2026-10-20/21 — common-docs/policies/one-ui-system.md § Shape).
//
// Four classes of drift the 2026-10-21 scout census found, each a thing the shared
// controls already do right, re-done by hand at a call site:
//
//   pill-control    a `rounded-full` on a button, trigger, input, select or tab.
//                   Controls are 6px rectangles; a pill is a deliberate round thing
//                   (avatar, dot, switch, count badge) or the approved header mode
//                   pill (`HEADER_MODE_PILL_TRACK` in RouteModeNav / AgentModeController).
//   glass-control   `matrx-glass-*` on a button, trigger or track. Glass only floats
//                   (a bar over moving content); on a page it is the retired "glow pill".
//   focus-ring      `focus(-visible|-within):ring-N` / `ring-[Npx]` / `ring-primary`
//                   on an input, textarea, select or the writing boxes. Fields show
//                   focus ON their border + `--matrx-focus-halo`, once, in the package.
//   double-frame    a `border` + `rounded` + tinted wrapper whose direct child is
//                   <MatrxDataTable> or <ControlRow>: the child draws its own frame.
//
// Baseline ratchet (scripts/control-shape-baseline.json, file → count): exits 1 only
// when a file holds MORE than its baseline; a file that dropped below is reported so
// the baseline is tightened (`--write-baseline`). Advisory in the release gates.
//
// Usage: node scripts/check-control-shape.mjs [--self-test] [--write-baseline] [files…]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SOURCE_ROOTS, gitFiles } from "./lib/source-roots.cjs";

// Roots inside THIS repo (the chat package root is in the aidream checkout; the package has its own tests).
const LOCAL_ROOTS = SOURCE_ROOTS.filter((r) => !r.startsWith("../"));

const ROOT = new URL("..", import.meta.url).pathname;
const BASELINE = join(ROOT, "scripts/control-shape-baseline.json");

const CONTROL_TAG = /<(button|Button|input|select|textarea|SelectTrigger|TabsTrigger|TabsList|DropdownMenuTrigger|PopoverTrigger|ProInput|ProTextarea|Input|Textarea)\b/;
const FIELD_TAG = /<(input|textarea|select|Input|Textarea|ProInput|ProTextarea|Field|SearchField|SelectTrigger)\b/;
const ROUND_OK = /\b(avatar|Avatar|dot|Dot|spinner|Spinner|switch|Switch|badge|Badge|progress|Progress|skeleton|Skeleton|matrx-tap|HEADER_MODE_PILL_TRACK|h-1\.5 w-1\.5|h-2 w-2|size-2\b|size-1\.5)\b/;
const FOCUS_RING = /focus(?:-visible|-within)?:ring-(?:\d|\[\d+px\]|primary)/;
const GLASS = /matrx-glass-(?:card|thin-border|interactive)/;
const FRAME = /\brounded-(?:md|lg|xl)\b[^"'`]*\bborder\b|\bborder\b[^"'`]*\brounded-(?:md|lg|xl)\b/;
const TINT = /\bbg-(?:card|muted|background)\b/;
const FRAMED_CHILD = /^\s*<(MatrxDataTable|ControlRow)\b/;

/** Each finding: { line, kind, cls }. Looks at a JSX opening tag with up to 12 lines of attrs. */
export function findingsForSource(src) {
  const out = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    const tag = CONTROL_TAG.exec(line);
    if (tag) {
      // The tag plus its attributes, until the first `>` that closes it.
      let block = line;
      for (let j = i + 1; j < Math.min(lines.length, i + 12) && !/>/.test(block.slice(tag.index)); j++) block += "\n" + lines[j];
      const attrs = block.slice(tag.index);
      if (/\brounded-full\b/.test(attrs) && !ROUND_OK.test(attrs) && !/aria-label=/.test(attrs) /* icon-only round */) {
        out.push({ line: i + 1, kind: "pill-control", cls: `<${tag[1]} … rounded-full>` });
      }
      if (GLASS.test(attrs)) out.push({ line: i + 1, kind: "glass-control", cls: `<${tag[1]} … ${GLASS.exec(attrs)[0]}>` });
      if (FIELD_TAG.test(line) && FOCUS_RING.test(attrs)) out.push({ line: i + 1, kind: "focus-ring", cls: `<${tag[1]} … ${FOCUS_RING.exec(attrs)[0]}>` });
    }
    if (/^\s*<(div|section)\b/.test(line) && FRAME.test(line) && TINT.test(line)) {
      const next = lines[i + 1] ?? "";
      if (FRAMED_CHILD.test(next)) out.push({ line: i + 1, kind: "double-frame", cls: `frame around ${FRAMED_CHILD.exec(next)[1]}` });
    }
  }
  return out;
}

function trackedFiles() {
  const out = gitFiles(ROOT, ["ls-files", "--", ...LOCAL_ROOTS.map((r) => `${r}/**/*.tsx`)]);
  return [...new Set(out.split("\n").filter(Boolean))].filter((f) => !/\.test\.tsx?$/.test(f) && !f.startsWith("app/(dev)/"));
}

function census(files) {
  const counts = {};
  const where = {};
  for (const file of files) {
    const abs = join(ROOT, file);
    if (!existsSync(abs)) continue;
    const found = findingsForSource(readFileSync(abs, "utf8"));
    if (found.length) {
      counts[file] = found.length;
      where[file] = found;
    }
  }
  return { counts, where };
}

function selfTest() {
  const red = [
    `<button type="button" className="h-7 rounded-full px-2 text-[11px] matrx-glass-card">Auto</button>`, // 2: pill + glass
    `<SelectTrigger className="h-7 w-auto rounded-full border px-2.5">`,
    `<input className="w-full rounded-md border focus-visible:ring-2 focus-visible:ring-ring" />`,
    `<ProInput className="h-9 focus-visible:ring-1 focus-visible:ring-ring" />`,
    `<DropdownMenuTrigger className="matrx-glass-thin-border rounded-md">`,
    `<div className="rounded-lg border border-border bg-card">\n  <MatrxDataTable data={rows} />`,
    `<section className="rounded-md border bg-muted p-2">\n  <ControlRow>`,
  ];
  const redCounts = [2, 1, 1, 1, 1, 1, 1];
  const green = [
    `<button className="h-8 w-8 rounded-full" aria-label="Close">`, // icon-only round: judged by the tap-target guard
    `<span className="h-2 w-2 rounded-full bg-success" />`,
    `<Avatar className="rounded-full" />`,
    `<Button variant="outline">Auto</Button>`,
    `<input className="w-full rounded-md border focus-visible:outline-none focus-visible:border-ring focus-visible:shadow-[var(--matrx-focus-halo)]" />`,
    `<div className="flex flex-col gap-2">\n  <MatrxDataTable data={rows} />`,
    `<div className="rounded-lg border border-border bg-card p-4">\n  <h2>Title</h2>`,
    `// <button className="rounded-full matrx-glass-card">`,
    `<div className={HEADER_MODE_PILL_TRACK}>`,
  ];
  let failed = 0;
  red.forEach((src, k) => {
    const n = findingsForSource(src).length;
    if (n !== redCounts[k]) {
      failed++;
      console.error(`  MISSED (should be ${redCounts[k]} red, got ${n}): ${src.split("\n")[0]}`);
    }
  });
  for (const src of green) {
    const f = findingsForSource(src);
    if (f.length !== 0) {
      failed++;
      console.error(`  FALSE ALARM (${f.map((x) => x.kind).join(",")}): ${src.split("\n")[0]}`);
    }
  }
  if (failed) {
    console.error(`check-control-shape self-test: ${failed} case(s) wrong`);
    process.exit(1);
  }
  console.log(`check-control-shape self-test: ${red.length} red caught, ${green.length} green clean`);
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  selfTest();
  process.exit(0);
}

const explicit = args.filter((a) => !a.startsWith("--"));
const files = explicit.length ? explicit : trackedFiles();
const { counts, where } = census(files);

if (args.includes("--write-baseline")) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`check-control-shape: baseline written — ${Object.keys(sorted).length} files, ${Object.values(sorted).reduce((a, b) => a + b, 0)} sites`);
  process.exit(0);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};
const fresh = [];
const shrunk = [];
for (const [file, n] of Object.entries(counts)) {
  const allowed = baseline[file] ?? 0;
  if (n > allowed) fresh.push({ file, n, allowed });
}
if (!explicit.length) {
  for (const [file, allowed] of Object.entries(baseline)) {
    const n = counts[file] ?? 0;
    if (n < allowed) shrunk.push({ file, n, allowed });
  }
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
const byKind = {};
for (const hits of Object.values(where)) for (const h of hits) byKind[h.kind] = (byKind[h.kind] ?? 0) + 1;
if (shrunk.length) {
  console.log(`check-control-shape: ${shrunk.length} file(s) dropped below their baseline — tighten it (pnpm check:control-shape --write-baseline):`);
  for (const s of shrunk) console.log(`  ${s.file}  ${s.allowed} → ${s.n}`);
}
if (fresh.length) {
  console.error(`check-control-shape: ${fresh.length} file(s) add control-shape drift (THE CONTROL SHAPE LAW — one-ui-system.md):`);
  for (const f of fresh) {
    for (const hit of where[f.file]) console.error(`  ${f.file}:${hit.line}  ${hit.kind}  ${hit.cls}`);
    console.error(`    (${f.n} here, baseline ${f.allowed})`);
  }
  console.error(
    "  Fix: use the shared control (Button / Field / SearchField / Select / SegmentedControl / Tabs from @ai-matrx/design-system/controls); pills and glass only where they float or are deliberately round; focus comes from the control; no frame around a component that draws its own.",
  );
  process.exit(1);
}
console.log(
  `check-control-shape: no new drift (${total} baselined site(s) across ${Object.keys(counts).length} file(s); ${Object.entries(byKind)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ")}).`,
);
