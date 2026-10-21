#!/usr/bin/env node
/**
 * check-overlays-never-move-page — FLOATING THINGS NEVER MOVE THE PAGE (Arman, 2026-10-20).
 *
 * Pills, assists, badges, alarms, notices, toasts, the chat dock and the window tray float OVER the
 * page. They never change the size or position of anything on it. When one would cover something,
 * IT moves (lifts, rests above a bar, yields) — never the page. The one thing chrome may grow is
 * the empty scroll room after a scroller's last line (a trailing `::after` runway), which moves
 * nothing on screen. Law + history: features/shell/FEATURE.md § Floating things never move the page.
 *
 * The class this closes: chrome published its measured size as a CSS variable, and pages "made
 * room" by padding or shrinking themselves with it — so every time a pill appeared, the page
 * jumped (the "1 error" badge lifting the Agent Studio composer, 2026-10-20, was the 10th+ sighting).
 *
 *   layout-reads-chrome   a padding / margin / height / min- / max-height / block-size (CSS
 *                         declaration, Tailwind arbitrary class, or inline style) whose value reads a
 *                         variable floating chrome publishes about itself. Only a trailing `::after`
 *                         spacer in a stylesheet may (that is scroll room, not layout).
 *   chrome-styles-page    floating-chrome code writing padding / margin / height onto another element.
 *   retired-primitive     a name from the deleted make-room mechanism (corner clearance, alert
 *                         clearance, the fixed floating measure, the assists scroller inset).
 *
 *   node scripts/check-overlays-never-move-page.mjs              report (exit 0)
 *   node scripts/check-overlays-never-move-page.mjs --strict     exit 1 on any finding
 *   node scripts/check-overlays-never-move-page.mjs --self-test  prove it fails, then passes
 *   MATRX_FINDINGS_PATHS="a.tsx b.css" …                         scan only those files
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { emitItem, endItems } from "./checks/items.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["app", "features", "components", "lib", "styles"];
const SCAN = /^(app|features|components|lib|styles)\/.*\.(tsx?|css)$/;
const SKIP = /(\.test\.|\.spec\.|\/__tests__\/)/;

/** Variables floating chrome publishes about ITSELF (its size, lift or reach). A page never sizes by them. */
const CHROME_VAR = String.raw`--(?:matrx-floating-(?:measured|clearance|fixed-measured)|shell-fixed-[a-z-]+|page-bottom-dock-h|assist-[a-z-]+|admin-attention-[a-z-]+|matrx-toast-floor|front-toast-height|matrx-window-scroller-runway|error-badge-[a-z-]+)\b`;
const READS_CHROME = new RegExp(String.raw`var\(\s*${CHROME_VAR}`);

const CSS_LAYOUT_PROP = /^(?:padding(?:-[a-z]+)*|margin(?:-[a-z]+)*|(?:min-|max-)?(?:height|width|block-size|inline-size)|flex-basis|flex|grid-template-(?:rows|columns))$/;
const TW_LAYOUT_CLASS = new RegExp(
  String.raw`(?:^|[\s"'\`{(])(?:[a-z0-9-]+:)*!?(?:p[btyxlrse]?|m[btyxlrse]?|h|min-h|max-h|w|min-w|max-w|size|basis)-\[[^\]\s]*var\(\s*${CHROME_VAR}`,
);
/** Inline style keys (quoted or not), value on the same or a later line. Scanned over the whole file. */
const INLINE_LAYOUT_STYLE = new RegExp(
  String.raw`["']?\b(?:padding|margin|height|minHeight|maxHeight|width|minWidth|maxWidth|blockSize|minBlockSize|maxBlockSize|inlineSize|flexBasis|gridTemplateRows|gridTemplateColumns)[A-Za-z]*["']?\s*:\s*[\`"'][^\`"']*?var\(\s*${CHROME_VAR}`,
  "g",
);
/** A page re-publishing a chrome variable under its own name, to read it later. */
const ALIAS_STYLE = new RegExp(String.raw`["']--[a-z0-9-]+["']\s*:\s*[\`"'][^\`"']*?var\(\s*${CHROME_VAR}`, "g");

/** Floating chrome lives here; its code may position ITSELF but never pad, margin or size another element. */
const CHROME_CODE = [
  "features/assists/",
  "features/admin/error-inspector/",
  "features/admin/attention/",
  "features/ai-test-mode/AiTestModeDock",
  "features/shell/components/FloatingClearanceSync",
  "lib/layout/floating-chrome",
];
const STYLES_PAGE = /\.style\.(?:padding|margin|height|minHeight|maxHeight|width|cssText)[A-Za-z]*\s*=(?!=)|style\.setProperty\(\s*["'`](?:padding|margin|height|min-height|max-height|width)|Object\.assign\(\s*[\w.]+\.style\b|setAttribute\(\s*["'`]style["'`]/;

const RETIRED = /\b(?:useFixedCornerClearance|FIXED_CORNER_CLEARANCE_VAR|FLOATING_FIXED_MEASURED_VAR|applyAssistClearance)\b|--shell-fixed-(?:corner|alert)-clearance|--matrx-floating-fixed-measured/;

const lineOf = (source, index) => source.slice(0, index).split("\n").length;

/** Blank out comments (keeping offsets) so prose that names the old mechanism is not a finding. */
function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}
function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, lead) => lead + " ".repeat(m.length - lead.length));
}

function scanCss(file, raw) {
  const findings = [];
  const source = stripCssComments(raw);
  const selectors = [];
  let segmentStart = 0;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      selectors.push(source.slice(segmentStart, i).trim());
      segmentStart = i + 1;
    } else if (ch === "}") {
      checkDecl(source.slice(segmentStart, i), segmentStart);
      selectors.pop();
      segmentStart = i + 1;
    } else if (ch === ";") {
      checkDecl(source.slice(segmentStart, i), segmentStart);
      segmentStart = i + 1;
    }
  }
  function checkDecl(text, offset) {
    const alias = /^\s*(--[a-z0-9-]+)\s*:([\s\S]*)$/.exec(text);
    if (alias && READS_CHROME.test(alias[2])) {
      const selector = selectors[selectors.length - 1] ?? "";
      // The shell derives its own runway values from the measure once, on :root; anything else is an alias a page can pad by.
      if (!(file === "styles/shell.css" && /^:root$/.test(selector.trim()))) {
        findings.push({ rule: "layout-reads-chrome", file, line: lineOf(source, offset + text.search(/\S/)), title: `\`${alias[1]}\` re-publishes a floating-chrome variable under another name` });
      }
      return;
    }
    const m = /^\s*([a-z-]+)\s*:([\s\S]*)$/.exec(text);
    if (!m || !CSS_LAYOUT_PROP.test(m[1]) || !READS_CHROME.test(m[2])) return;
    const selector = selectors[selectors.length - 1] ?? "";
    // A trailing spacer adds scroll room after the last line; nothing on screen moves.
    if (/::after\s*$/.test(selector.split(",").map((s) => s.trim()).join(",")) || selector.split(",").every((s) => /::after\s*$/.test(s.trim()))) return;
    findings.push({
      rule: "layout-reads-chrome",
      file,
      line: lineOf(source, offset + text.search(/\S/)),
      title: `\`${m[1]}\` on \`${selector.slice(0, 80)}\` sizes the page by floating chrome`,
    });
  }
  return findings;
}

function scanScript(file, raw) {
  const findings = [];
  const source = stripJsComments(raw);
  const chromeCode = CHROME_CODE.some((p) => file.startsWith(p));
  for (const re of chromeCode ? [INLINE_LAYOUT_STYLE] : [INLINE_LAYOUT_STYLE, ALIAS_STYLE]) {
    for (const m of source.matchAll(re)) {
      findings.push({ rule: "layout-reads-chrome", file, line: lineOf(source, m.index), title: "sizes the page by (or re-publishes) a variable floating chrome publishes" });
    }
  }
  source.split("\n").forEach((text, i) => {
    if (TW_LAYOUT_CLASS.test(text)) {
      findings.push({ rule: "layout-reads-chrome", file, line: i + 1, title: "pads, margins or sizes the page by a variable floating chrome publishes" });
    }
    if (CHROME_CODE.some((p) => file.startsWith(p)) && STYLES_PAGE.test(text)) {
      findings.push({ rule: "chrome-styles-page", file, line: i + 1, title: "floating chrome writes padding / margin / height onto the page" });
    }
  });
  return findings;
}

export function scanSource(file, raw) {
  const findings = file.endsWith(".css") ? scanCss(file, raw) : scanScript(file, raw);
  const code = file.endsWith(".css") ? stripCssComments(raw) : stripJsComments(raw);
  code.split("\n").forEach((text, i) => {
    const hit = RETIRED.exec(text);
    if (hit) findings.push({ rule: "retired-primitive", file, line: i + 1, title: `\`${hit[0]}\` is the deleted make-room mechanism — the chrome moves, never the page` });
  });
  return findings;
}

function trackedFiles() {
  const only = (process.env.MATRX_FINDINGS_PATHS ?? "").split(/\s+/).filter(Boolean);
  const all = only.length
    ? only
    : execFileSync("git", ["ls-files", ...SCAN_DIRS], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n");
  return all.filter((f) => SCAN.test(f) && !SKIP.test(f));
}

function selfTest() {
  // The 2026-10-20 sighting (Agent Studio padding itself by the error badge) and its fix.
  const cases = [
    ["studio padded by the badge is RED", "x.tsx", `<div className="flex h-full pb-[var(--shell-fixed-corner-clearance,0px)] pt-[var(--shell-header-h)]" />`, ["layout-reads-chrome", "retired-primitive"]],
    ["studio without it is GREEN", "x.tsx", `<div className="flex h-full pt-[var(--shell-header-h)]" />`, []],
    ["a hero shrunk by the chat dock is RED", "x.tsx", `<section className={\`flex min-h-[calc(100%-var(--matrx-floating-clearance))] flex-col\`} />`, ["layout-reads-chrome"]],
    ["a hero sized by the page end is GREEN", "x.tsx", `<section className={\`flex min-h-[calc(100%-var(--matrx-page-end))] flex-col\`} />`, []],
    ["inline padding from the dock is RED", "x.tsx", `const s = { paddingBottom: "var(--page-bottom-dock-h)" };`, ["layout-reads-chrome"]],
    ["chrome positioning itself is GREEN", "x.tsx", `<button className="fixed bottom-[calc(1rem+var(--page-bottom-dock-h,0px))]" />`, []],
    ["a page foot padded by floating chrome is RED", "x.css", `[data-matrx-page-end] {\n  padding-block-end: calc(var(--matrx-floating-measured) + 1rem);\n}`, ["layout-reads-chrome"]],
    ["a height shrunk by chrome inside @media is RED", "x.css", `@media (min-width: 640px) {\n  .rail { height: calc(100dvh - var(--admin-attention-lift, 0px)); }\n}`, ["layout-reads-chrome"]],
    ["a trailing ::after runway is GREEN", "x.css", `.shell-main::after {\n  content: "";\n  block-size: max(50dvh, var(--matrx-floating-clearance));\n}`, []],
    ["the shell's runway definition on :root is GREEN", "styles/shell.css", `:root { --matrx-page-runway: max(50dvh, var(--matrx-floating-clearance)); }`, []],
    ["a comment naming the old mechanism is GREEN", "x.css", `/* it used --shell-fixed-corner-clearance once */\n.a { color: red; }`, []],
    ["assists padding a scroller is RED", "features/assists/x.ts", `el.style.paddingBottom = \`\${need}px\`;`, ["chrome-styles-page"]],
    ["a multi-line style object with a quoted key is RED", "x.tsx", `const s = {\n  "paddingBottom":\n    \`calc(1rem + var(--matrx-floating-clearance))\`,\n};`, ["layout-reads-chrome"]],
    ["a width cut by chrome is RED", "x.tsx", `<div className="max-w-[calc(100vw-var(--assist-dock-lift))]" />`, ["layout-reads-chrome"]],
    ["an alias of a chrome variable is RED", "x.css", `.page { --room: var(--matrx-floating-clearance); padding-bottom: var(--room); }`, ["layout-reads-chrome"]],
    ["an alias in a style object is RED", "x.tsx", `<div style={{ "--room": "var(--page-bottom-dock-h)" }} />`, ["layout-reads-chrome"]],
    ["the shell deriving its runway on :root is GREEN", "styles/shell.css", `:root { --matrx-floating-clearance: calc(var(--matrx-floating-measured) + 1rem); }`, []],
    ["chrome writing cssText onto the page is RED", "features/assists/x.ts", `el.style.cssText = "padding-bottom: 40px";`, ["chrome-styles-page"]],
    ["assists moving itself is GREEN", "features/assists/x.ts", `box.style.setProperty("--assist-dock-lift", v);`, []],
  ];
  let failed = 0;
  for (const [name, file, source, expected] of cases) {
    const rules = scanSource(file, source).map((f) => f.rule).sort();
    const ok = JSON.stringify(rules) === JSON.stringify([...expected].sort());
    if (!ok) failed += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${JSON.stringify(rules)})`);
  }
  if (failed) {
    console.error(`overlays-never-move-page self-test: ${failed} case(s) failed`);
    process.exit(1);
  }
  console.log("overlays-never-move-page self-test: OK — fails on the broken shapes, passes on the fixed ones.");
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();
  const strict = process.argv.includes("--strict");
  const files = trackedFiles();
  const findings = [];
  for (const file of files) {
    let source;
    try {
      source = readFileSync(join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    findings.push(...scanSource(file, source));
  }
  for (const f of findings) {
    emitItem({ key: `${f.rule}|${f.file}`, status: "new", title: f.title, file: f.file, line: f.line, rule: f.rule });
  }
  endItems();
  if (findings.length === 0) {
    console.log(`overlays-never-move-page: OK — ${files.length} files; no floating chrome moves the page.`);
    return;
  }
  console.log(`\noverlays-never-move-page: ${findings.length} finding(s):\n`);
  for (const f of findings) console.log(`  ${f.file}:${f.line}  [${f.rule}] ${f.title}`);
  console.log("\nFix: the page keeps its size and place; the floating thing moves itself (lift, rest above the bar, yield). features/shell/FEATURE.md § Floating things never move the page.");
  if (strict) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
