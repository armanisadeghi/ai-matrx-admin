#!/usr/bin/env node
/**
 * GUARD: a theme color variable is never used bare.
 *
 * The theme variables (--background, --popover, --primary, --border, --chart-N ...) hold bare HSL
 * triples ("0 0% 100%"), so `color: var(--popover)` / `stroke="var(--border)"` / `box-shadow: 0 0 0 1px
 * var(--primary)` is NO color: the browser drops the declaration (the chart tooltip lost its box,
 * 2026-10-17). A color is always `hsl(var(--x))` (or `hsl(var(--x) / 0.5)`); a fallback is a triple:
 * `hsl(var(--x, 0 0% 100%))`.
 *
 *   node scripts/check-bare-hsl-colour.mjs [--root <repo dir>]...   scan tracked ts/tsx/js/mjs files
 *   node scripts/check-bare-hsl-colour.mjs --self-test              plant a bare var, must fail
 * Default roots: the aidream apps/shared tree. Exit 1 on any offender.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOKENS =
  "background|foreground|card(?:-foreground)?|popover(?:-foreground)?|primary(?:-foreground|-hover|-active|-ink)?|secondary(?:-foreground)?|muted(?:-foreground)?|accent(?:-foreground|-hover|-active)?|destructive(?:-foreground|-ink)?|border|input|ring|elevation-\\d+|chart-\\d+|success(?:-foreground|-ink)?|warning(?:-foreground|-ink)?|info(?:-foreground|-ink)?|brand-secondary(?:-foreground|-hover|-active)?|sidebar-(?:background|foreground|primary|primary-foreground|accent|accent-foreground|border|ring)|matrx-chart-[a-z0-9]+|matrx-tooltip(?:-border|-foreground|-muted-foreground)?";
const BARE = new RegExp(`var\\(\\s*--(?:${TOKENS})\\s*[,)]`, "g");
const OK_BEFORE = /(?:hsla?|oklch|rgba?)\(\s*(?:from\s+)?$/;
const CUSTOM_PROP_VALUE = /--[\w-]+\s*:\s*$/;

/** Offending [line, snippet] pairs in one file's text. */
export function findBareHslColours(text) {
  const out = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
    // Opt-out for a line that is NOT themed with the app's bare triples (a sample frame whose :root holds full
    // colours): a `bare-hsl-ok: <why>` comment on the line above or the same line.
    if (line.includes("bare-hsl-ok") || (lines[i - 1] ?? "").includes("bare-hsl-ok")) return;
    for (const m of line.matchAll(BARE)) {
      const before = line.slice(0, m.index);
      if (OK_BEFORE.test(before) || CUSTOM_PROP_VALUE.test(before)) continue;
      out.push([i + 1, t.slice(0, 160)]);
    }
  });
  return out;
}

function scan(root) {
  const files = execFileSync("git", ["-C", root, "ls-files", "-z", "--", "*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs"], {
    maxBuffer: 1 << 28,
  })
    .toString()
    .split("\0")
    .filter((f) => f && !/\.(test|spec)\.[jt]sx?$/.test(f) && !f.includes("/node_modules/") && !f.startsWith(".claude/") && !f.endsWith("check-bare-hsl-colour.mjs"));
  const bad = [];
  for (const f of files) {
    let text;
    try {
      text = readFileSync(join(root, f), "utf8");
    } catch {
      continue;
    }
    if (!text.includes("var(--")) continue;
    for (const [line, snippet] of findBareHslColours(text)) bad.push(`${f}:${line}  ${snippet}`);
  }
  return bad;
}

function selfTest() {
  const planted = [
    'const s = { background: "var(--popover)" };',
    '<XAxis stroke="var(--border)" />',
    "box-shadow: inset 0 0 0 1px var(--primary);",
    "color-mix(in srgb, var(--primary) 16%, transparent)",
    'fill="var(--background, #fff)"',
    // Built from parts so a find-and-replace sweep of the old invalid class cannot rewrite the planted break.
    ["className=\"shadow-[var(--", "elevation-2)]\""].join(""),
    "hover:shadow-[var(--border)]",
  ];
  const fine = [
    'const s = { background: "hsl(var(--popover))" };',
    "hsl(var(--primary) / 0.5)",
    'fill="hsl(var(--background, 0 0% 100%))"',
    "--glow: var(--primary);",
    "// var(--border) is no color",
    "// bare-hsl-ok: frame root holds full colours\nbackground: var(--primary);",
    'className="shadow-md bg-elevation-2" style={{ background: "hsl(var(--elevation-1))" }}',
  ];
  for (const p of planted) if (!findBareHslColours(p).length) throw new Error(`self-test: planted bare var not caught: ${p}`);
  for (const f of fine) if (findBareHslColours(f).length) throw new Error(`self-test: wrongly flagged: ${f}`);
  console.log("check-bare-hsl-colour self-test OK");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) selfTest();
  else {
    const roots = [];
    args.forEach((a, i) => a === "--root" && roots.push(resolve(args[i + 1])));
    if (!roots.length) roots.push(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
    const bad = roots.flatMap(scan);
    if (bad.length) {
      console.error(`bare theme variable used as a color (wrap in hsl(var(--x))):\n${bad.join("\n")}`);
      process.exit(1);
    }
    console.log("check-bare-hsl-colour OK");
  }
}
