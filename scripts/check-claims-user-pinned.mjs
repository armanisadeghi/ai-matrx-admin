#!/usr/bin/env node
// Guard: every caller reads verified claims through utils/supabase/claimsUser.ts (pinned signing keys
// tried first), never the package's raw getClaimsUser — which fetches /.well-known/jwks.json from the
// browser on a cold page. Also: no source fetches a jwks.json by hand outside the OAuth proxy routes.
// Usage: node scripts/check-claims-user-pinned.mjs [--self-test]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ALLOWED_RAW = new Set(["utils/supabase/claimsUser.ts"]);
const RAW_IMPORT = /import\s*(?:type\s*)?\{[^}]*\bgetClaimsUser\b[^}]*\}\s*from\s*["']@ai-matrx\/auth["']/;
const JWKS_FETCH = /fetch\([^)]*jwks\.json|createRemoteJWKSet\(/;
const JWKS_OK = [/^app\/api\/oauth\/jwks\//, /^app\/\.well-known\//, /^app\/\(public\)\/developers\/oauth\//, /\.test\.|__tests__/, /^scripts\//];

export function violations(files, read) {
  const out = [];
  for (const f of files) {
    if (/\.test\.|__tests__|^test-utils\//.test(f)) continue;
    const src = read(f).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    if (!ALLOWED_RAW.has(f) && RAW_IMPORT.test(src)) out.push(`${f}: imports raw getClaimsUser from @ai-matrx/auth — use @/utils/supabase/claimsUser`);
    if (JWKS_FETCH.test(src) && !JWKS_OK.some((r) => r.test(f))) out.push(`${f}: fetches a jwks.json at runtime`);
  }
  return out;
}

if (process.argv.includes("--self-test")) {
  const fake = { "a.ts": 'import { getClaimsUser } from "@ai-matrx/auth";', "b.ts": 'import { getClaimsUser } from "@/utils/supabase/claimsUser";', "c.ts": 'await fetch("/x/jwks.json")' };
  const bad = violations(Object.keys(fake), (f) => fake[f]);
  if (bad.length !== 2 || violations(["b.ts"], (f) => fake[f]).length) { console.error("self-test failed", bad); process.exit(1); }
  console.log("self-test ok");
} else {
  const files = execFileSync("git", ["ls-files", "*.ts", "*.tsx"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n").filter(Boolean);
  const bad = violations(files, (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } });
  if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
  console.log("claims-user guard ok");
}
