#!/usr/bin/env node
// scripts/check-page-wide-has.mjs
//
// 🚨 NO :has() ON THE PAGE'S ROOT, AND NO :has() BEHIND A UNIVERSAL SUBJECT.
//
// Chrome re-checks a :has() anchor on EVERY DOM insertion beneath it. When the
// anchor is body, html, :root, .shell-root or .shell-main — an element above the
// whole app — every streamed block, toast, menu and diagram label re-styled the
// page: measured 2026-09-26 on a 1 MB document (118k elements), 590 ms per DOM
// insertion; a mermaid diagram (one insertion per measured label) held the main
// thread 10–15 s. Tailwind's group-has-*/peer-has-* variants compile to
// `:is(:where(.group):has(x) *)` — a universal subject — with the same effect.
// After the rescope: 11 ms per insertion.
//
// Review 6b (2026-10-21, phone notes page, 10k elements): one DOM insertion cost 114 ms of style
// against 8 ms, and six rules carried all of it — every one a :has() ABOVE a broad subject:
// `.group:has(x) *` (group-has-*), `:root:not(:has(x)) … &`, `.h:has(x) > :not(:has(y))`, and
// `.icon:has(> svg) svg` (32 ms). A :has() above a class or attribute subject measured 8–9 ms.
// So the guard also refuses a :has() in a non-subject compound when the subject has no class, id
// or attribute; an unscoped universal anchor (`:has(x) > .y`); and it reads Tailwind arbitrary
// variants (`[:root:not(:has(x))_&]:…`) and the @ai-matrx packages' shipped CSS and class strings.
//
// What to do instead: state that lives in the shell reaches its descendants
// with a sibling combinator from the checkbox (`.shell-root > #t:checked ~ * .x`);
// route state is a pathname attribute (`.shell-root[data-pathname^="/x"]`);
// component state is a data attribute set by the component that owns it.
//
// Usage: node scripts/check-page-wide-has.mjs [--self-test] [css-or-tsx files…]
// With no files it scans the repo's own CSS and the Tailwind class sources.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { featureRoots } from "./lib/source-roots.cjs";

const ROOT = new URL("..", import.meta.url).pathname;

/** Anchors above the whole app. */
const PAGE_ROOT_ANCHOR = /^(?::is\(|:where\()*(body|html|:root|\.shell-root|\.shell-main)(?![\w-])/;

/**
 * Selectors that stay, each with its reason and measured cost. A new entry
 * needs a measurement (scratchpad r4-univ4 method) showing it is not the cost.
 */
const ALLOWED = new Map([
  [
    'body:has(.shell-root[data-pathname^="/administration"])',
    "subject-only; the admin header height must reach siblings BEFORE .shell-root, which no sibling combinator can. Measured <1 ms per insertion.",
  ],
  [
    '.shell-root:not([data-pathname^="/administration"]):has(.shell-main [data-matrx-table-sticky-header="true"].relative)',
    "subject-only; the marker is emitted by @ai-matrx/design-system's data table. Measured ~2 ms per insertion. Follow-up: the table sets a data attribute.",
  ],
  [":root[data-admin-attention] .shell-main:has(", "admin attention runway, one child combinator. Measured <1 ms."],
  [".shell-main:has(.shell-panel)", "panel sidebar used only by the dev chat demo. Measured ~1 ms."],
  [".shell-root:has(.shell-panel) .shell-mobile-trigger", "panel sidebar used only by the dev chat demo. Measured ~1 ms."],
  [
    'body:has(.matrx-alchemy-workspace[data-state="open"]) > .matrx-alchemy-feedback',
    "class subject, one child combinator (design-system + alchemy CSS). Measured 8.8 ms against 8.4 ms with no :has() at all (phone notes page, review 6b). Follow-up: the workspace sets an attribute while open.",
  ],
  [
    "body:has(.cm-live) ",
    "context-menu tooltip lift while a menu is live; class/attribute subjects. Measured on the phone notes page in review 6b (see evidence review6-has-and-modes-perf). Follow-up: the menu sets an attribute while live.",
  ],
  [
    ".markdown-flush-start > .contents:not(.contents:has(> .math-content-wrapper) ~ .contents)",
    "child-only argument inside :not(); measured 8.9 ms against 8.4 ms with no :has() (phone notes page, review 6b).",
  ],
]);

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/** Top-level selector list of every rule, with its line. Nested @media bodies included. */
function selectorsOf(css) {
  const out = [];
  const text = stripComments(css);
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      const head = text.slice(start, i).trim();
      if (head && !head.startsWith("@")) {
        const line = text.slice(0, i).split("\n").length;
        out.push({ selector: head.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")"), line });
      }
      depth++;
      start = i + 1;
    } else if (c === "}") {
      depth--;
      start = i + 1;
    } else if (c === ";") {
      start = i + 1;
    }
  }
  return out;
}

/** Split a selector list on top-level commas. */
function splitList(sel) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const c of sel) {
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/** The compound each top-level `:has(` is attached to. */
function hasAnchors(complex) {
  const anchors = [];
  let depth = 0;
  for (let i = 0; i < complex.length; i++) {
    const c = complex[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    if (complex.startsWith(":has(", i)) {
      // walk back to the start of this compound at the same depth
      let j = i;
      let d = 0;
      while (j > 0) {
        const p = complex[j - 1];
        if (p === ")") d++;
        else if (p === "(") {
          // An enclosing :not( / :is( belongs to the same compound.
          if (d > 0) d--;
        } else if (d === 0 && /[\s>~+,]/.test(p)) break;
        j--;
      }
      anchors.push(complex.slice(j, i + 5));
    }
  }
  return anchors;
}

/** Compounds of one complex selector, split on top-level combinators. */
function compoundsOf(complex) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < complex.length; i++) {
    const c = complex[i];
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth--;
    if (depth === 0 && /[\s>~+]/.test(c)) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** A subject compound with no class, id or attribute outside its pseudo-classes: `*`, `svg`, `:not(:has(x))`. */
function isBroad(compound) {
  let depth = 0;
  let own = "";
  for (const c of compound.replace(/::?[\w-]+(?=\(|$|[^\w-])/g, (m) => m)) {
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0) own += c;
  }
  own = own.replace(/::?[\w-]+/g, "");
  if (/[.#[]/.test(own)) return false;
  // No type, or a tag found all over every page (a table cell is not: `tr:has(x) > td` measured 7.9 ms).
  const tag = own.replace(/\*/g, "").trim().toLowerCase();
  return tag === "" || UBIQUITOUS_TAGS.has(tag);
}

const UBIQUITOUS_TAGS = new Set(["svg", "path", "div", "span", "p", "a", "li", "button", "img", "g"]);

function findingsForCss(css, file) {
  const out = [];
  for (const { selector, line } of selectorsOf(css)) {
    if (!selector.includes(":has(")) continue;
    for (const complex of splitList(selector)) {
      if ([...ALLOWED.keys()].some((k) => complex.includes(k))) continue;
      if (/:has\([^)]*\)\s*\*|:has\([^)]*\)\)\s*\*/.test(complex)) {
        out.push(`${file}:${line}  universal subject after :has() — "${complex}"`);
        continue;
      }
      const compounds = compoundsOf(complex);
      const subject = compounds[compounds.length - 1] ?? "";
      if (compounds.slice(0, -1).some((c) => c.includes(":has(")) && isBroad(subject)) {
        out.push(`${file}:${line}  :has() above a broad subject ("${subject}" has no class, id or attribute) — "${complex}"`);
        continue;
      }
      if (/^(?:\*|:not\(|:is\(|:where\()*:has\(/.test(compounds[0] ?? "") && compounds.length > 1) {
        out.push(`${file}:${line}  unscoped :has() anchor (any element on the page) — "${complex}"`);
        continue;
      }
      for (const anchor of hasAnchors(complex)) {
        // A CHILD-only argument (`:has(> #x:checked)`) is re-checked only when
        // the anchor's own children change — never on insertions deeper in the
        // app — so it is allowed (the shell grid follows its checkbox this way
        // before JavaScript loads).
        const at = complex.indexOf(anchor) + anchor.length;
        const arg = complex.slice(at, complex.indexOf(")", at));
        // A fixed-depth chain of children (`:has(> .contents > .h-full)`) is bounded the same way.
        if (/^\s*(?:>\s*[^\s>~+,]+\s*)+$/.test(arg)) continue;
        if (PAGE_ROOT_ANCHOR.test(anchor)) {
          out.push(`${file}:${line}  :has() on the page root (${anchor.replace(/:has\($/, "")}) — "${complex}"`);
        }
      }
    }
  }
  return out;
}

const TW_UNIVERSAL_HAS = /(?:^|[\s"'`])((?:group|peer)-has-\[[^\s"'`]*|(?:group|peer)-has-[a-z][\w-]*(?:\/[\w-]+)?:[^\s"'`]+)/g;

/** `[<selector>]:utility` arbitrary variants holding a :has(), as the CSS selector Tailwind writes. */
const TW_ARBITRARY_HAS = /\[((?:[^\s"'`\[\]]|\[[^\s"'`\]]*\])*:has\((?:[^\s"'`\[\]]|\[[^\s"'`\]]*\])*)\]:/g;

function findingsForSource(src, file) {
  const out = [];
  const lines = src.split("\n");
  lines.forEach((l, i) => {
    for (const m of l.matchAll(TW_ARBITRARY_HAS)) {
      const variant = m[1];
      const selector = variant.includes("&") ? variant.replace(/&/g, ".tw-self") : `.tw-self${variant.startsWith(":") ? "" : " "}${variant}`;
      for (const f of findingsForCss(`${selector.replace(/_/g, " ")} { x: y }`, file)) {
        out.push(`${file}:${i + 1}  Tailwind variant "[${variant}]" →${f.slice(f.indexOf("  ") + 1)}`);
      }
    }
    for (const m of l.matchAll(TW_UNIVERSAL_HAS)) {
      out.push(`${file}:${i + 1}  Tailwind "${m[1]}" compiles to :has() behind a universal subject — set the state on the element that owns it`);
    }
  });
  return out;
}

function walk(dir, exts, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".next") || name === "__tests__" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, acc);
    else if (exts.some((e) => name.endsWith(e))) acc.push(p);
  }
  return acc;
}

/** Every installed @ai-matrx package's dist CSS and JS (the CSS and Tailwind class strings that reach the page). */
function packageDistFiles() {
  const scope = join(ROOT, "node_modules/@ai-matrx");
  let names = [];
  try {
    names = readdirSync(scope);
  } catch {
    return [];
  }
  return names.flatMap((n) => walkDist(join(scope, n, "dist")));
}

function walkDist(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    // `dist/ui/assets` is a package's own self-contained app bundle (coding-sessions), never on our pages.
    if (name === "node_modules" || name === "__tests__" || (name === "assets" && dir.endsWith("/ui"))) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkDist(p, acc);
    else if (/\.(css|js|mjs|cjs)$/.test(name) && !/\.map$|\.test\./.test(name)) acc.push(p);
  }
  return acc;
}

function scan(files) {
  const findings = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const rel = relative(ROOT, f);
    if (f.endsWith(".css")) findings.push(...findingsForCss(text, rel));
    else findings.push(...findingsForSource(text, rel));
  }
  return findings;
}

function selfTest() {
  const red = [
    [".shell-root:has(> .shell-main .marker) .x { gap: 0 }", "css"],
    [".shell-root:has(#shell-sidebar-toggle:checked) .shell-sidebar { width: 1px }", "css"],
    ["body:has(.shell-show-dock) .shell-main { padding: 0 }", "css"],
    [".shell-root:not(:has(#t:checked)) .x { gap: 0 }", "css"],
    [".a:is(:where(.group\\/menu-item):has([data-sidebar=\"menu-action\"]) *) { padding: 0 }", "css"],
    ['const c = "peer/menu-button group-has-[[data-sidebar=menu-action]]/menu-item:pr-8";', "tsx"],
    // review 6b: the phone notes page's six
    ['const c = "[:root:not(:has([data-window-active]))_[data-slot=message-list]:focus-within_&]:bg-selection";', "tsx"],
    ['const c = "[[data-wide-figures]_&:has([data-wide-figure])>*:not(:has([data-wide-figure]))]:overflow-x-clip";', "tsx"],
    ['const c = "group-hover:invisible [:has([data-state=open])>&]:invisible";', "tsx"],
    [".shell-root .nav > .icon:not([data-tile]):has(> svg, > span > svg) svg { width: 1px }", "css"],
    [".h:has([data-wide-figure]) > * { overflow-x: clip }", "css"],
    [":root:not(:has([data-window-active])) [data-slot=\"list\"][data-current] { color: red }", "css"],
  ];
  const green = [
    [".shell-root:has(> #shell-sidebar-toggle:checked) { grid-template-columns: 1fr }", "css"],
    [".shell-root > #shell-sidebar-toggle:checked ~ * .shell-sidebar { width: 1px }", "css"],
    ['.shell-root[data-pathname^="/x"] ~ * .shell-dock { display: none }', "css"],
    [".item-row:has([data-state=open]) .item-shift { gap: 0 }", "css"],
    ['const c = "has-[>[data-sidebar=menu-action]]:[&>[data-sidebar=menu-button]]:pr-8";', "tsx"],
    ['const c = "[&:has(>[data-sidebar=menu-action])>[data-sidebar=menu-button]]:pr-8";', "tsx"],
    ['const c = "[:root_[data-slot=message-list]:not([data-window-active]_*):focus-within_&]:bg-selection";', "tsx"],
    ['const c = "[[data-wide-figures]_&>*:not(:has([data-wide-figure]))]:overflow-x-clip";', "tsx"],
    ['const c = "[[data-hub-row-end]:has([data-state=open])>&]:invisible";', "tsx"],
    [".shell-root .nav > .icon:not([data-tile]) > span > svg { width: 1px }", "css"],
    [".rich-editor-prose > :has(.has-focus) { color: red }", "css"],
    ["tr:has([data-cell]) > td { height: 1px }", "css"],
    [".shell-main:has(> .contents > .h-full)::after { content: none }", "css"],
    ['.toaster [data-sonner-toast]:has(> .error-toast-copy):not(:has(> [data-icon])) { gap: 0 }', "css"],
  ];
  let ok = true;
  for (const [text, kind] of red) {
    const f = kind === "css" ? findingsForCss(text, "red.css") : findingsForSource(text, "red.tsx");
    if (f.length === 0) {
      ok = false;
      console.error(`SELF-TEST FAIL: not caught: ${text}`);
    }
  }
  for (const [text, kind] of green) {
    const f = kind === "css" ? findingsForCss(text, "green.css") : findingsForSource(text, "green.tsx");
    if (f.length) {
      ok = false;
      console.error(`SELF-TEST FAIL: false positive: ${text}\n  ${f.join("\n  ")}`);
    }
  }
  console.log(ok ? "check:page-wide-has self-test: red caught, green clean" : "check:page-wide-has self-test FAILED");
  process.exit(ok ? 0 : 1);
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) selfTest();

const files = args.length
  ? args.map((a) => join(process.cwd(), a))
  : [
      ...walk(join(ROOT, "styles"), [".css"]),
      join(ROOT, "app/globals.css"),
      ...walk(join(ROOT, "components"), [".css", ".tsx", ".ts"]),
      ...featureRoots(ROOT).flatMap((r) => walk(join(ROOT, r), [".css", ".tsx", ".ts"])),
      ...walk(join(ROOT, "app"), [".tsx", ".ts"]),
      ...walk(join(ROOT, "lib"), [".tsx", ".ts"]),
      // What the @ai-matrx packages ship to the page: their CSS and the class strings Tailwind scans.
      ...packageDistFiles(),
    ];
const findings = scan(files);
if (findings.length) {
  console.error(`check:page-wide-has — ${findings.length} finding(s):\n  ${findings.join("\n  ")}`);
  console.error(
    "\nA :has() on body/html/:root/.shell-root/.shell-main (or behind a universal subject) re-styles the whole app on every DOM insertion. See the header of scripts/check-page-wide-has.mjs for the replacements.",
  );
  process.exit(1);
}
console.log(`check:page-wide-has — clean (${files.length} files)`);
