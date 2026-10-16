// scripts/lib/preview-ready-judge.mjs — the verdicts `pnpm preview:ready` gives (see scripts/preview-ready.mjs).
// Pure apart from reading the checkout: tested by scripts/preview-ready.test.mjs.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function git(root, args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return `${r.stdout ?? ""}`.trim();
}

export const BUILD_ERROR = [
  /Export ([\w$]+) doesn't exist in target module/,
  /Module not found: Can't resolve '([^']+)'/,
  /Failed to compile/,
  /Build Error/,
  /\bModule parse failed\b/,
  /Parsing ecmascript source code failed/,
];

export function verdictOf(r, target, say = () => {}) {
  if (r.status === 0) return { ok: false, kind: "timeout", why: `no answer from ${r.finalPath?.split("?")[0]} (${r.error})` };
  const pathOnly = (r.finalPath || "").split("?")[0];
  const htmlError = /<html[^>]*id="__next_error__"/.test(r.body || "");
  const buildHit = BUILD_ERROR.find((re) => re.test(r.body || ""));
  if (r.status === 503 && r.headers?.["x-matrx-walk-cap"] === "refused") {
    return { ok: false, kind: "walk-cap", why: "every live-database walk slot stayed in use (walk cap) for the whole wait" };
  }
  if (r.status === 409 && r.headers?.["x-matrx-walk-cap"] === "evicted") {
    return { ok: false, kind: "parked", why: "this session's host is parked by the walk cap and no hold re-admitted it" };
  }
  if (r.status >= 500 || htmlError || buildHit) {
    return { ok: false, kind: "page-error", why: `${pathOnly} answered ${r.status}${buildHit ? ` with a build error` : htmlError ? " with an error page" : ""}` };
  }
  if (pathOnly.startsWith("/login") || pathOnly.startsWith("/sign")) return { ok: false, kind: "signed-out", why: `ended on ${pathOnly}: the sign-in did not stick` };
  if (r.status !== 200) return { ok: false, kind: "status", why: `${pathOnly} answered ${r.status}` };
  // A public route answers 200 to anyone: require the sign-in cookie the dev-login set.
  if (r.signedInCookie === false) return { ok: false, kind: "signed-out", why: `${pathOnly} loaded, but no sign-in cookie was set` };
  if (pathOnly !== target.split("?")[0]) say(`sign-in: note — ${target} redirected to ${pathOnly} (signed in; the route itself redirects)`);
  return { ok: true };
}

export async function diagnoseBuildError(text, ROOT) {
  const out = { stale: false, uncommitted: false, lines: [] };
  const exp = text.match(/Export ([\w$]+) doesn't exist in target module/);
  const fileMatch = text.match(/\[project\]\/([^\s:\]]+\.(?:tsx?|jsx?|mjs|cjs))(?::(\d+))?/) || text.match(/\.\/([^\s:]+\.(?:tsx?|jsx?))[:(](\d+)/);
  const file = fileMatch ? fileMatch[1] : null;
  if (exp) out.lines.push(`build error: export ${exp[1]} is missing${file ? ` (imported in ${file}${fileMatch[2] ? `:${fileMatch[2]}` : ""})` : ""}`);
  const nf = text.match(/Module not found: Can't resolve '([^']+)'/);
  if (nf) out.lines.push(`build error: cannot resolve '${nf[1]}'${file ? ` (from ${file})` : ""}`);
  if (!exp && !nf) {
    const first = (text.match(/(?:⨯|Error:)[^\n]{0,200}/) || [])[0];
    if (first) out.lines.push(`error: ${first.trim()}`);
  }

  // STALE vs CODE: does the INSTALLED package satisfy the file's @ai-matrx imports right now?
  if (file && existsSync(join(ROOT, file))) {
    try {
      const pending = await import("./matrx-pending-imports.mjs");
      pending.resetPendingCaches();
      const res = pending.rescuePendingImports(join(ROOT, file), readFileSync(join(ROOT, file), "utf8"), ROOT);
      const missing = res.pending.filter((p) => !exp || p.name === exp[1]);
      const source = readFileSync(join(ROOT, file), "utf8");
      // Positive evidence only: the file imports that very name from an @ai-matrx package, and the
      // judge (which certainly knows a missing export) finds nothing missing.
      // The missing name must be imported FROM an @ai-matrx specifier in this file; an export missing
      // from one of our own modules is a code error a restart cannot fix.
      const fromOurPackage = new RegExp(
        `import\\s+(?:type\\s+)?\\{[^}]*\\b${exp?.[1]}\\b[^}]*\\}\\s*from\\s*["']@ai-matrx\\/`,
      ).test(source);
      if (exp && missing.length === 0 && fromOurPackage) {
        out.stale = true;
        out.lines.push("diagnosis: STALE SERVER — the installed package does export it; the server is serving code from before an install");
      } else if (missing.length) {
        out.lines.push(`diagnosis: CODE — ${pending.describePending(missing[0]).replace(/^\[matrx-pending\]\s*/, "")}`);
      }
    } catch (e) {
      out.lines.push(`diagnosis: could not judge the import (${String(e).slice(0, 120)})`);
    }
    if (!out.stale) {
      const dirty = git(ROOT, ["status", "--porcelain", "--", file]);
      const last = git(ROOT, ["log", "-1", "--format=%h %an, %ar: %s", "--", file]);
      out.uncommitted = Boolean(dirty);
      out.lines.push(
        dirty
          ? `owner: ${file} has an UNCOMMITTED edit in this shared checkout (another session's work in progress); last commit ${last || "none"}`
          : `owner: ${file} last changed in ${last || "an unknown commit"}`,
      );
      out.lines.push("this is an environment block for your test, not a defect of the page you are testing");
    }
  }
  return out;
}
