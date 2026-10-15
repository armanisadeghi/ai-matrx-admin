#!/usr/bin/env node
// check-host-parity — THE APP AND EVERY PACKAGE PLAYGROUND WEAR THE SAME PAGE.
//
// The package playgrounds (aidream apps/shared/playground) render our components on
// @ai-matrx/design-system's web-theme.css + web-base.css + tokens.css. The app must wear exactly the
// same, or a playground stops proving anything about the app. So app/globals.css:
//   1. imports @ai-matrx/design-system/web-base.css (the page base: body text, headings, focus ring,
//      form text, picker/media colour scheme, RTL sizing, the one default scrollbar);
//   2. never restates a web-base rule (one copy, in the package);
//   3. never declares a design-system value (a `--token` in tokens.css) with a DIFFERENT value in the
//      same scope (:root vs .dark). An identical restatement passes, listed, so it can be deleted.
//
//   node scripts/check-host-parity.mjs              # red on any drift
//   node scripts/check-host-parity.mjs --self-test  # proves each rule can go red, and green can be green
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GLOBALS = join(ROOT, "app/globals.css");
const TOKENS = join(ROOT, "node_modules/@ai-matrx/design-system/dist/tokens.css");
const WEB_BASE_IMPORT = /@import\s+["']@ai-matrx\/design-system\/web-base\.css["']/;
/** Rules only web-base.css may hold (a restatement here is a second copy). */
const WEB_BASE_SIGNATURES = [
  [/(^|[\s,}])\*::-webkit-scrollbar-thumb:hover/, "the default scrollbar"],
  [/body\s*\{[^}]*font-size:\s*1\.0625rem/, "the 17px body text"],
  [/\*:focus-visible\s*\{[^}]*outline:\s*2px solid hsl\(var\(--ring\)\)/, "the focus ring"],
];

/** `--name: value` per scope (`root` | `dark`), last declaration wins; comments stripped. */
function values(css) {
  const out = { root: new Map(), dark: new Map() };
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  while ((m = re.exec(text))) {
    const sel = (m[1] ?? "").trim().split("\n").pop()?.trim() ?? "";
    const scope = /(^|[\s,])\.dark\b/.test(sel) ? "dark" : /:root\b|^html$/.test(sel) ? "root" : null;
    if (!scope) continue;
    for (const d of (m[2] ?? "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      out[scope].set(d[1], (d[2] ?? "").trim().replace(/\s+/g, " "));
    }
  }
  return out;
}

const same = (a, b) => a.replace(/(^|[\s(])0\./g, "$1.") === b.replace(/(^|[\s(])0\./g, "$1.");

/** @returns {{ errors: string[], restated: string[] }} */
export function check(globalsCss, tokensCss) {
  const errors = [];
  const restated = [];
  if (!WEB_BASE_IMPORT.test(globalsCss)) errors.push("app/globals.css does not import @ai-matrx/design-system/web-base.css");
  for (const [re, what] of WEB_BASE_SIGNATURES) {
    if (re.test(globalsCss.replace(/\/\*[\s\S]*?\*\//g, ""))) errors.push(`app/globals.css restates ${what} — it lives once, in @ai-matrx/design-system/web-base.css`);
  }
  const app = values(globalsCss);
  const pkg = values(tokensCss);
  for (const scope of /** @type {const} */ (["root", "dark"])) {
    for (const [name, v] of app[scope]) {
      const p = pkg[scope].get(name);
      if (p === undefined) continue;
      if (same(p, v)) restated.push(`${scope} ${name}`);
      else errors.push(`${scope} ${name}: app says "${v}", design system says "${p}" — change it in the package, not here`);
    }
  }
  return { errors, restated };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain && process.argv.includes("--self-test")) {
  const tokens = ":root { --primary: 210 80% 45%; --radius: 0.5rem; } .dark { --primary: 221 83% 53%; }";
  const good = '@import "@ai-matrx/design-system/web-base.css";\n@layer base { :root { --primary: 210 80% 45%; --sidebar: 1 1% 1%; } }';
  const cases = [
    ["missing import", good.replace(/@import[^\n]+\n/, ""), 1],
    ["different value", good.replace("210 80% 45%", "0 0% 0%"), 1],
    ["different dark value", `${good}\n.dark { --primary: 0 0% 0%; }`, 1],
    ["restated scrollbar", `${good}\n@layer base { *::-webkit-scrollbar-thumb:hover { background: red; } }`, 1],
    ["restated body text", `${good}\n@layer base { body { color: red; font-size: 1.0625rem; } }`, 1],
  ];
  let failed = 0;
  for (const [label, css, want] of cases) {
    const got = check(css, tokens).errors.length;
    if (got !== want) (failed++, console.error(`SELF-TEST FAIL: ${label}: ${got} errors, wanted ${want}`));
  }
  const green = check(good, tokens);
  if (green.errors.length) (failed++, console.error(`SELF-TEST FAIL: clean globals flagged: ${green.errors.join("; ")}`));
  if (green.restated.length !== 1) (failed++, console.error("SELF-TEST FAIL: an identical restatement was not listed"));
  if (check(good.replace("0.5rem", ".5rem"), tokens).errors.length) (failed++, console.error("SELF-TEST FAIL: 0.5 vs .5 counted as different"));
  if (failed) process.exit(1);
  console.log(`check-host-parity self-test: ${cases.length} red cases red, the clean case green, identical restatements listed.`);
  process.exit(0);
}

if (isMain) main();

function main() {
const { errors, restated } = check(readFileSync(GLOBALS, "utf8"), readFileSync(TOKENS, "utf8"));
if (restated.length) {
  console.log(`check-host-parity: ${restated.length} design-system values restated with the SAME value in app/globals.css (safe to delete): ${restated.join(", ")}`);
}
if (errors.length) {
  console.error(`check-host-parity: the app drifted from what the playgrounds wear:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log("check-host-parity: the app wears the design system's page and values (same as every playground).");
}
