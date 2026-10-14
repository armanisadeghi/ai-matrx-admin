#!/usr/bin/env node
// scripts/check-hover-trigger-scope.mjs
//
// A HOVER CARD, TOOLTIP OR POPOVER OPENS FROM THE THING IT IS ABOUT — never from
// a container that also holds buttons, links or fields (Arman, 2026-10-14).
//
// Smart Add wrapped a whole row (value text + Yes/No/Other buttons) in a
// HoverCardTrigger. Pausing on Yes opened the source card below the row, right
// over the next question the person was about to answer. The same mistake on a
// TooltipTrigger pops a tooltip while someone aims at a button; on a
// PopoverTrigger every click on a control inside also opens the popover.
//
// Flags a `*HoverCardTrigger` / `*TooltipTrigger` / `*PopoverTrigger` whose child
// is a CONTAINER (anything that is not itself a control) with an interactive
// element inside it: button, a, input, select, textarea, a design-system control
// (Button, Link, Select, Switch, Checkbox, Input, Field, …) or anything with an
// onClick. A slot named like `actions` / `buttons` / `controls` / `toolbar` / `menu` counts
// as controls (it cannot be followed across files). A child that IS the control (`<TooltipTrigger asChild><Button/>`) is
// the normal case and passes. `{name}` children and descendants are resolved to
// a `const name = <jsx>` in the same file, so the Smart Add shape is caught.
//
// Fix: move the trigger onto the value/label itself; the controls sit beside it.
//
// Baseline ratchet (scripts/hover-trigger-scope-baseline.json, file → count):
// exits 1 only when a file holds MORE than its baseline; the baseline only
// shrinks (`--write-baseline`). Advisory in scripts/run-release-gates.sh.
//
// Usage: node scripts/check-hover-trigger-scope.mjs [--self-test] [--write-baseline] [files…]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { SOURCE_ROOTS, gitFiles } from "./lib/source-roots.cjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const ROOT = new URL("..", import.meta.url).pathname;
const BASELINE = join(ROOT, "scripts/hover-trigger-scope-baseline.json");

const TRIGGER = /(HoverCardTrigger|TooltipTrigger|PopoverTrigger)$/;
const NATIVE_CONTROL = new Set(["button", "a", "input", "select", "textarea"]);
const CONTROL_COMPONENT =
  /^(Button|IconButton|TapTargetButton|\w*TapButton|Link|OutboundLink|NextLink|Select|SelectTrigger|Switch|Checkbox|Input|Field|SearchField|ProInput|ProTextarea|Textarea|SegmentedControl|DeleteButton|CopyButton|CopyButtons|DropdownMenuTrigger|RadioGroup|Toggle|ToggleGroup|Slider)$/;

const CONTROL_SLOT = /(?:^|[.])\w*(?:[aA]ctions|[bB]uttons|[cC]ontrols|[tT]oolbar|[mM]enu)$/;

function tagName(node) {
  const t = ts.isJsxElement(node) ? node.openingElement.tagName : ts.isJsxSelfClosingElement(node) ? node.tagName : null;
  return t ? t.getText() : null;
}
function attrs(node) {
  return ts.isJsxElement(node) ? node.openingElement.attributes.properties : ts.isJsxSelfClosingElement(node) ? node.attributes.properties : [];
}
function isControl(node) {
  const name = tagName(node);
  if (!name) return false;
  const last = name.split(".").pop();
  if (NATIVE_CONTROL.has(name) || CONTROL_COMPONENT.test(last)) return true;
  return attrs(node).some((a) => ts.isJsxAttribute(a) && a.name.getText() === "onClick");
}
function unwrap(expr) {
  while (expr && (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr))) expr = expr.expression;
  return expr;
}

export function findingsForSource(src, file = "x.tsx") {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  // const name = <jsx> anywhere in the file — how `{line}` children resolve.
  const jsxConsts = new Map();
  const collect = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const init = unwrap(n.initializer);
      if (init && (ts.isJsxElement(init) || ts.isJsxSelfClosingElement(init) || ts.isJsxFragment(init))) jsxConsts.set(n.name.text, init);
    }
    ts.forEachChild(n, collect);
  };
  collect(sf);

  // The JSX a child position renders, following `{name}` one const deep at a time.
  const resolveChild = (n, seen) => {
    if (ts.isJsxExpression(n)) {
      const e = unwrap(n.expression);
      if (e && ts.isIdentifier(e) && jsxConsts.has(e.text) && !seen.has(e.text)) {
        seen.add(e.text);
        return jsxConsts.get(e.text);
      }
      return e && (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e)) ? e : null;
    }
    return ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n) ? n : null;
  };

  // What sits under `node` (resolving `{name}` consts): the controls, and any
  // OTHER content beside them (text, an icon, a value). A plain wrapper around
  // one control (`<span><Button/></span>`, the disabled-button tooltip idiom)
  // has no other content and passes.
  const inventory = (node, seen) => {
    const controls = [];
    let other = 0;
    const visit = (n) => {
      if ((ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) && isControl(n)) {
        controls.push(tagName(n));
        return;
      }
      // A menu's/popover's content portals out of the trigger; it is not beside it.
      if ((ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) && /(Content|Portal)$/.test(tagName(n) ?? "")) return;
      if (ts.isJsxText(n)) {
        if (n.getText().trim()) other++;
        return;
      }
      if (ts.isJsxSelfClosingElement(n)) {
        other++;
        return;
      }
      if (ts.isJsxExpression(n)) {
        const e = unwrap(n.expression);
        if (!e) return;
        if (ts.isIdentifier(e) && jsxConsts.has(e.text) && !seen.has(e.text)) {
          seen.add(e.text);
          visit(jsxConsts.get(e.text));
          return;
        }
        // A slot handed in from outside (`{actions}`, `{props.buttons}`) cannot be
        // followed across files; its name says it holds controls.
        if ((ts.isIdentifier(e) || ts.isPropertyAccessExpression(e)) && CONTROL_SLOT.test(e.getText())) {
          controls.push(e.getText());
          return;
        }
        if (!(ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e) || ts.isConditionalExpression(e) || ts.isBinaryExpression(e))) {
          other++;
          return;
        }
      }
      // Walk rendered children only — never attributes (`tabIndex={0}` is not content).
      if (ts.isJsxElement(n) || ts.isJsxFragment(n)) n.children.forEach(visit);
      else ts.forEachChild(n, visit);
    };
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) node.children.forEach(visit);
    return { controls, other };
  };

  const out = [];
  const walk = (n) => {
    if (ts.isJsxElement(n) && TRIGGER.test(n.openingElement.tagName.getText())) {
      const trigger = n.openingElement.tagName.getText();
      for (const child of n.children) {
        const seen = new Set();
        const target = resolveChild(child, seen);
        if (!target) continue;
        if ((ts.isJsxElement(target) || ts.isJsxSelfClosingElement(target)) && isControl(target)) continue;
        const { controls, other } = inventory(target, seen);
        if (controls.length && (controls.length > 1 || other > 0)) {
          const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
          out.push({ line: line + 1, trigger, control: controls.join(", ") });
        }
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}

function trackedFiles() {
  const out = gitFiles(ROOT, ["ls-files", "--", ...SOURCE_ROOTS.map((r) => `${r}/**/*.tsx`)]);
  return [...new Set(out.split("\n").filter(Boolean))].filter((f) => !/\.test\.tsx$/.test(f));
}

function census(files) {
  const counts = {};
  const where = {};
  for (const file of files) {
    const abs = join(ROOT, file);
    if (!existsSync(abs)) continue;
    const found = findingsForSource(readFileSync(abs, "utf8"), file);
    if (found.length) {
      counts[file] = found.length;
      where[file] = found;
    }
  }
  return { counts, where };
}

function selfTest() {
  const red = [
    // The exact Smart Add row (647420e09d5): the buttons come in as an \`actions\` prop.
    `function Row({ actions, children }){ const line = (<div><div><span>{children}</span></div><div>{actions}</div></div>); return <HoverCard><HoverCardTrigger asChild>{line}</HoverCardTrigger></HoverCard>; }`,
    // The Smart Add shape: the trigger is a const holding the whole row.
    `function R(){ const line = (<div><span>Name</span><Button>Yes</Button></div>); return <HoverCard><HoverCardTrigger asChild>{line}</HoverCardTrigger></HoverCard>; }`,
    `<TooltipTrigger asChild><div className="row">Label <button onClick={f}>x</button></div></TooltipTrigger>`,
    `<PopoverTrigger asChild><li>Item <a href="/x">open</a></li></PopoverTrigger>`,
    `<TooltipTrigger asChild><div>Total <span onClick={go}>x</span></div></TooltipTrigger>`,
    `function R(){ const acts = <Switch />; return <HoverCardTrigger asChild><div>Sync {acts}</div></HoverCardTrigger>; }`,
  ];
  const green = [
    `<TooltipTrigger asChild><Button icon={x} aria-label="Copy" /></TooltipTrigger>`,
    `<PopoverTrigger asChild><button type="button">Open</button></PopoverTrigger>`,
    `<HoverCardTrigger asChild><span className="truncate">Titanium Success</span></HoverCardTrigger>`,
    `function R(){ const value = <span>{children}</span>; return <HoverCardTrigger asChild>{value}</HoverCardTrigger>; }`,
    `<TooltipTrigger asChild><div><Icon /> 12 runs</div></TooltipTrigger>`,
    `<TooltipTrigger asChild><span tabIndex={0}><Button disabled>Save</Button></span></TooltipTrigger>`,
    `<TooltipTrigger asChild><DropdownMenu><DropdownMenuTrigger asChild><Button aria-label="Move" /></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={f}>Left</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TooltipTrigger>`,
  ];
  let failed = 0;
  for (const src of red) {
    if (findingsForSource(src).length !== 1) {
      failed++;
      console.error(`  MISSED (should be red): ${src}`);
    }
  }
  for (const src of green) {
    if (findingsForSource(src).length !== 0) {
      failed++;
      console.error(`  FALSE ALARM (should be green): ${src}`);
    }
  }
  if (failed) {
    console.error(`check-hover-trigger-scope self-test: ${failed} case(s) wrong`);
    process.exit(1);
  }
  console.log(`check-hover-trigger-scope self-test: ${red.length} red caught, ${green.length} green clean`);
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
  console.log(`check-hover-trigger-scope: baseline written — ${Object.keys(sorted).length} files, ${Object.values(sorted).reduce((a, b) => a + b, 0)} sites`);
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
if (shrunk.length) {
  console.log(`check-hover-trigger-scope: ${shrunk.length} file(s) dropped below their baseline — tighten it (pnpm check:hover-trigger-scope --write-baseline):`);
  for (const s of shrunk) console.log(`  ${s.file}  ${s.allowed} → ${s.n}`);
}
if (fresh.length) {
  console.error(`check-hover-trigger-scope: ${fresh.length} file(s) open a hover card / tooltip / popover from a container that holds controls:`);
  for (const f of fresh) {
    for (const hit of where[f.file]) console.error(`  ${f.file}:${hit.line}  ${hit.trigger} wraps ${hit.control}`);
    console.error(`    (${f.n} here, baseline ${f.allowed})`);
  }
  console.error("  Fix: put the trigger on the value or label itself; the buttons sit beside it, outside the trigger.");
  process.exit(1);
}
console.log(`check-hover-trigger-scope: no new over-wide triggers (${total} baselined site(s) across ${Object.keys(counts).length} file(s)).`);
