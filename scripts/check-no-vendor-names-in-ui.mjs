#!/usr/bin/env node
// GUARD: no data-vendor name on any customer-facing screen.
// Our vendors (ScrapeCreators, Bright Data, EnsembleData, Apify, DataForSEO, SerpAPI,
// Brave Search, Twilio, Firecrawl; Grok/xAI is a model choice, not a data vendor) are our business, never the customer's.
// Flags vendor words inside string literals / JSX text in customer code. Admin, dev,
// tests, generated files, API routes, and legal disclosure pages are allowlisted.
// Usage: node scripts/check-no-vendor-names-in-ui.mjs [--self-test] [paths...]
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

const VENDOR_CI = /scrape\s?creators?|bright\s?data|ensemble\s?data|apify|data\s?for\s?seo|serp\s?api|firecrawl|twilio/i;
const VENDOR_CS = /\bBrave\b/; // case-sensitive: the English word "brave" is fine
export const VENDOR = { test: (s) => VENDOR_CI.test(s) || VENDOR_CS.test(s) };

const ROOTS = ["features", "components", "app"];
const SKIP_PATH =
  /(^|\/)(administration|admin|\(admin\)|\(dev\)|\(lab\)|dev|__tests__|node_modules|api|generated)(\/|$)|\.(test|spec|dev|generated)\.|\/admin[-_]|[-_]admin[-.\/]|Admin[A-Z]|privacy-policy|app\/\(public\)\/(sms|terms)|\/(sms|esign)\/|features\/(admin|sms)\b|features\/surfaces\/manifests|features\/content-ir\/kinds|features\/marketing\/seo\/dataforseo\//;
// A string only counts as display text when it reads like text: has a space, or a leading capital.
const DISPLAY = (s) => /\s/.test(s) || /^[A-Z]/.test(s);

function* walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) { if (n !== "node_modules" && n !== ".next") yield* walk(p); }
    else if (/\.(tsx?|jsx?)$/.test(n) && !/\.d\.ts$/.test(n)) yield p;
  }
}

export function scanSource(src) {
  const hits = [];
  const lines = src.split("\n");
  let inBlock = false;
  lines.forEach((raw, i) => {
    let line = raw;
    if (inBlock) { const e = line.indexOf("*/"); if (e < 0) return; line = line.slice(e + 2); inBlock = false; }
    line = line.replace(/\/\*.*?\*\//g, "");
    const b = line.indexOf("/*"); if (b >= 0) { inBlock = true; line = line.slice(0, b); }
    if (/^\s*(import|export .* from)\b/.test(line)) return;
    if (/guard-ignore: vendor/.test(raw)) return;
    // string literals
    const re = /(["'`])((?:\\.|(?!\1).)*)\1/g;
    let m, stripped = line;
    while ((m = re.exec(line))) {
      const lit = m[2].replace(/\$\{[^}]*\}/g, "");
      if (VENDOR.test(lit) && DISPLAY(lit)) hits.push([i + 1, m[2].trim().slice(0, 120)]);
    }
    stripped = line.replace(re, "");
    // line comment (after literals removed)
    const c = stripped.indexOf("//"); if (c >= 0) stripped = stripped.slice(0, c);
    // JSX text: >text< or a bare text line
    const jsx = [...stripped.matchAll(/>([^<>{}]+)</g)].map((x) => x[1]);
    if (!/[;=(){}]|[a-z][A-Z]|_|\w\.\w|\w:\s/.test(stripped) && stripped.trim() && !/^\s*[*]/.test(stripped)) jsx.push(stripped);
    for (const t of jsx) if (VENDOR.test(t) && /\s|^[A-Z]/.test(t.trim())) hits.push([i + 1, t.trim().slice(0, 120)]);
  });
  return hits;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) return selfTest();
  const files = [];
  const targets = args.length ? args : ROOTS;
  for (const r of targets) { try { statSync(r).isDirectory() ? files.push(...walk(r)) : files.push(r); } catch {} }
  let bad = 0;
  for (const f of files) {
    const rel = relative(process.cwd(), f);
    if (SKIP_PATH.test(rel)) continue;
    for (const [ln, txt] of scanSource(readFileSync(f, "utf8"))) {
      console.error(`${rel}:${ln}  vendor name in customer-facing text: ${txt}`);
      bad++;
    }
  }
  if (bad) { console.error(`\n${bad} vendor-name hit(s). Use plain words ("Search data", "Backup source"). Vendors never reach customers.`); process.exit(1); }
  console.log("check-no-vendor-names-in-ui: clean");
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "vendor-guard-"));
  const bad = join(dir, "Bad.tsx");
  writeFileSync(bad, 'export const A = () => <span>Posts via ScrapeCreators</span>;\nconst t = "Estimate from DataForSEO Labs";\n');
  const good = join(dir, "Good.tsx");
  writeFileSync(good, '// ScrapeCreators note\nconst k = "scrapecreators";\nexport const B = () => <span>Social data</span>;\n');
  const nBad = scanSource(readFileSync(bad, "utf8")).length;
  const nGood = scanSource(readFileSync(good, "utf8")).length;
  if (nBad !== 2 || nGood !== 0) { console.error(`self-test FAILED bad=${nBad} (want 2) good=${nGood} (want 0)`); process.exit(1); }
  console.log("self-test ok: planted vendor strings caught (2), clean file passes (0)");
}
main();
