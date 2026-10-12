/**
 * check:maybe-single-assert — "nothing here yet" must never become a red error.
 *
 * Owner ruling (Arman, 2026-10-12): when data is absent we show an inviting empty
 * state with the action to create it, never an error. A real failure (refusal,
 * timeout, server error) still shows as an error.
 *
 * THE CLASS: `.maybeSingle()` answers "no row" with `data: null, error: null`.
 * Unwrapping that with a strict `assertData(x.data, x.error)` (from
 * `makeAssertData`, `@ai-matrx/kit/errors`, or a local twin) throws
 * "We couldn't …" on the absent row — a red error and a row in
 * ops.system_error for what is really an empty state.
 *
 * Fix: `assertData.nullable(x.data, x.error)` (kit 0.43.0) and handle `null` in
 * the caller. Where null genuinely means broken (a write that must return its
 * row), mark the call with a comment on one of the three lines above it:
 *   // maybe-single-assert-ok: <reason>
 * Single-record reads by id go through `assertFound` / `assertFoundOrProbeDeleted`
 * (AccessGate), which this guard does not flag.
 *
 *   pnpm check:maybe-single-assert             # exit 1 on any finding
 *   pnpm check:maybe-single-assert --self-test # proves the detector goes red, then green
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const OK_MARKER = "maybe-single-assert-ok:";
/** A strict data asserter: assertData, assertGovernedData, assertTopicalMapData … — never assertFound*. */
const STRICT_ASSERTER = String.raw`\bassert\w*Data\b`;

export interface Finding {
  file: string;
  line: number;
  text: string;
}

function escape(name: string): string {
  return name.replace(/[$]/g, "\\$");
}

/** Index just past the statement that starts at `from` (the first `;` at bracket depth 0). */
function statementEnd(source: string, from: number): number {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") depth--;
    else if (ch === ";" && depth <= 0) return i + 1;
  }
  return source.length;
}

export function scanSource(file: string, source: string): Finding[] {
  if (!source.includes(".maybeSingle()")) return [];
  const findings: Finding[] = [];
  const lines = source.split("\n");
  const binding =
    /(?:const|let)\s+(?:([\w$]+)|\{\s*data\s*(?::\s*([\w$]+))?\s*,\s*error\s*(?::\s*([\w$]+))?\s*\})\s*=\s*await\b/g;
  for (const match of source.matchAll(binding)) {
    const start = match.index ?? 0;
    const end = statementEnd(source, start);
    if (!source.slice(start, end).includes(".maybeSingle()")) continue;
    // The unwrap must sit in the same function: stop at the next top-level
    // close, the next function, or a re-binding of the same name.
    let window = source.slice(end, end + 1200);
    const boundary = window.search(/\n\}|\bfunction\b|=>\s*\{|(?:const|let)\s+(?:[\w$]+|\{[^}]*\})\s*=\s*await\b/);
    if (boundary >= 0) window = window.slice(0, boundary);
    const dataExpr = match[1]
      ? `${escape(match[1])}\\.data\\b`
      : `${escape(match[2] ?? "data")}\\b`;
    const call = new RegExp(`(${STRICT_ASSERTER})\\s*(?:<[^>()]*>)?\\(\\s*${dataExpr}`);
    const hit = call.exec(window);
    if (!hit) continue;
    const offset = end + hit.index;
    const line = source.slice(0, offset).split("\n").length;
    const above = lines.slice(Math.max(0, line - 4), line).join("\n");
    if (above.includes(OK_MARKER)) continue;
    findings.push({ file, line, text: (lines[line - 1] ?? "").trim() });
  }
  return findings;
}

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "*.ts", "*.tsx"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n")
    .filter((f) => f && !f.startsWith("vendor/") && !f.includes("node_modules/") && !f.endsWith(".d.ts"))
    .filter((f) => f !== "scripts/check-maybe-single-assert.ts");
}

function selfTest(): void {
  const planted = `
    const response = await db.from("site").select("*").eq("org", o).maybeSingle();
    return assertData(response.data, response.error);
  `;
  const destructured = `
    const { data: row, error } = await db.from("x").select("*").limit(1).maybeSingle();
    const value = assertData(row, error);
  `;
  const nullable = `
    const response = await db.from("site").select("*").maybeSingle();
    return assertData.nullable(response.data, response.error);
  `;
  const marked = `
    const response = await db.from("x").insert(v).select("*").maybeSingle();
    // maybe-single-assert-ok: an insert that returns no row is a failure
    return assertData(response.data, response.error);
  `;
  const byId = `
    const response = await db.from("x").select("*").eq("id", id).maybeSingle();
    return assertFound(response.data, response.error, "x", id, "x");
  `;
  const otherResponse = `
    const restore = await db.from("x").update(v).select().maybeSingle();
    if (restore.data) return restore.data;
    return assertData(response.data, response.error);
  `;
  const nextFunction = `
    const response = await db.from("x").select("*").maybeSingle();
    if (response.error) throw response.error;
    return response.data;
  }
  export async function other() {
    const response = await db.from("y").select("*");
    return assertData(response.data, response.error);
  `;
  const cases: Array<[string, string, number]> = [
    ["unwrap in the next function", nextFunction, 0],
    ["planted strict unwrap", planted, 1],
    ["planted destructured unwrap", destructured, 1],
    ["nullable door", nullable, 0],
    ["marked write", marked, 0],
    ["by-id assertFound", byId, 0],
    ["different response", otherResponse, 0],
  ];
  let failed = 0;
  for (const [name, source, want] of cases) {
    const got = scanSource("self-test.ts", source).length;
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${got} finding(s), want ${want}`);
  }
  if (failed) {
    console.error(`check:maybe-single-assert self-test: ${failed} case(s) wrong`);
    process.exit(1);
  }
  console.log("check:maybe-single-assert self-test OK (planted cases red, safe cases green)");
}

function main(): void {
  if (process.argv.includes("--self-test")) return selfTest();
  const findings: Finding[] = [];
  for (const file of trackedFiles()) {
    let source: string;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    findings.push(...scanSource(file, source));
  }
  if (findings.length === 0) {
    console.log("check:maybe-single-assert: no strict assertData over a .maybeSingle() read");
    return;
  }
  console.error(
    `check:maybe-single-assert: ${findings.length} strict assertData over a .maybeSingle() read — an absent row becomes a red error.\n` +
      "Use assertData.nullable(...) and render an empty state, or mark a write that must return its row with\n" +
      `  // ${OK_MARKER} <reason>\n`,
  );
  for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.text}`);
  process.exit(1);
}

main();
