#!/usr/bin/env node
// check-host-config-runs-in-browser — a host-configuration side-effect import may never sit in a
// Server Component's import graph.
//
// THE CLASS (twice on 2026-10-15): `import "@/lib/coming-soon/registry"` and `import "@/lib/sheets-host"`
// (configureSheetsHost) were imported from app/Providers.tsx, a SERVER component. The import ran on the
// server only; the browser bundle never executed it, so every Coming-soon row failed closed and the sheet
// editor ran with no host. Nothing threw at build time.
//
// THE RULE: starting from every file under app/ that is NOT a "use client" module, follow its static
// imports (stopping at "use client" modules, which start a browser bundle). Reaching a HOST module on that
// walk is a failure (a data read such as `import { COMING_SOON } from ".../registry"` is allowed). HOST modules: lib/*-host.ts, lib/coming-soon/registry.ts, and any module that calls
// configure*Host( / configureUniverHost( at its top level. Mount them from a "use client" module instead
// (see lib/coming-soon/ComingSoonClient.tsx, the client StoreProvider).
//
//   node scripts/check-host-config-runs-in-browser.mjs              # red on any violation
//   node scripts/check-host-config-runs-in-browser.mjs --self-test  # planted bad import goes red, clean goes green
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CODE = /\.(tsx?|jsx?|mjs)$/;
const IMPORT_RE = /(?:^|\n)\s*(import|export)\s+(?!type\b)((?:[^"';]*?\sfrom\s+)?)["']([^"']+)["']/g;

const isClient = (src) => /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*["']use client["']/.test(src);
const isNamedHost = (p) => /^lib\/[^/]*-host\.tsx?$/.test(p) || p === "lib/coming-soon/registry.ts";
const callsConfigure = (src) => /^(?:configure\w*Host|configureUniverHost)\(/m.test(src);

/** @param {Map<string,string>} files repo-relative path -> source. @returns {string[]} violations */
export function findViolations(files) {
  const has = (p) => files.has(p);
  const resolve = (from, spec) => {
    let base;
    if (spec.startsWith("@/")) base = spec.slice(2);
    else if (spec.startsWith(".")) base = posix.normalize(posix.join(posix.dirname(from), spec));
    else return null;
    for (const c of [base, ...["ts", "tsx", "js", "jsx", "mjs"].map((e) => `${base}.${e}`), ...["ts", "tsx", "js"].map((e) => `${base}/index.${e}`)]) {
      if (has(c) && CODE.test(c)) return c;
    }
    return null;
  };
  const hosts = new Set([...files].filter(([p, s]) => isNamedHost(p) || callsConfigure(s)).map(([p]) => p));
  const violations = [];
  for (const [root, src] of files) {
    if (!root.startsWith("app/") || !CODE.test(root) || /\.(test|spec)\./.test(root) || isClient(src)) continue;
    const seen = new Set([root]);
    const queue = [[root, [root]]];
    while (queue.length) {
      const [file, chain] = queue.shift();
      for (const m of files.get(file).matchAll(IMPORT_RE)) {
        const target = resolve(file, m[3]);
        if (!target || seen.has(target)) continue;
        // `import { COMING_SOON } from registry` READS data and is fine anywhere; the failure is an import whose
        // only purpose is its side effect (a bare `import "x"`), or any import of a *-host module.
        if (hosts.has(target) && m[2] !== "" && target === "lib/coming-soon/registry.ts") continue;
        seen.add(target);
        if (hosts.has(target)) {
          violations.push(`${root} (server module) reaches host module ${target} via ${[...chain, target].join(" -> ")}; it would run on the server only. Import it from a "use client" module.`);
          continue;
        }
        if (!isClient(files.get(target))) queue.push([target, [...chain, target]]);
      }
    }
  }
  return violations;
}

function selfTest() {
  const clientEntry = '"use client";\nimport "@/lib/sheets-host";\nexport function C(){return null}\n';
  const base = {
    "lib/sheets-host.ts": 'import { configureSheetsHost } from "x";\nconfigureSheetsHost({});\n',
    "lib/coming-soon/registry.ts": 'registerComingSoon([]);\n',
    "lib/other.ts": "export const a = 1;\n",
    "lib/chain.ts": 'import "@/lib/coming-soon/registry";\n',
    "app/Client.tsx": clientEntry,
    "app/Reader.tsx": 'import { COMING_SOON } from "@/lib/coming-soon/registry";\nexport const R = COMING_SOON;\n',
  };
  const clean = new Map(Object.entries({ ...base, "app/Providers.tsx": 'import { C } from "./Client";\nimport { a } from "@/lib/other";\nexport default function P(){return C}\n' }));
  const bads = {
    "direct host import": 'import "@/lib/sheets-host";\n',
    "registry import": 'import "@/lib/coming-soon/registry";\n',
    "through a non-client intermediary": 'import "@/lib/chain";\n',
  };
  let ok = findViolations(clean).length === 0;
  if (!ok) console.error("self-test: clean tree was flagged:", findViolations(clean));
  for (const [name, line] of Object.entries(bads)) {
    const v = findViolations(new Map([...clean, ["app/Providers.tsx", line + "export default function P(){return null}\n"]]));
    if (v.length !== 1) { console.error(`self-test: "${name}" was not flagged`); ok = false; }
  }
  if (!ok) process.exit(1);
  console.log("check-host-config-runs-in-browser self-test: clean tree green; 3 planted server-side host imports red.");
}

if (process.argv.includes("--self-test")) selfTest();
else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tracked = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "app", "lib", "features", "components"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })
    .split("\n").filter((p) => CODE.test(p));
  const files = new Map();
  for (const p of tracked) { try { files.set(p, readFileSync(join(ROOT, p), "utf8")); } catch { /* deleted in the working tree */ } }
  const v = findViolations(files);
  if (v.length) {
    console.error(v.join("\n") + `\n\ncheck-host-config-runs-in-browser: ${v.length} violation(s).`);
    process.exit(1);
  }
  console.log(`check-host-config-runs-in-browser: ${files.size} files scanned; no server module reaches a host-configuration module.`);
}
