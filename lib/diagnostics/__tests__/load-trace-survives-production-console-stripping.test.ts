/**
 * next.config.js `compiler.removeConsole` deletes every literal `console.log/info/table/group*(…)`
 * call from production builds (only error/warn survive). The load trace is meant to print on
 * aimatrx.com, so it must write through its `traceConsole` alias — a literal `console.<method>(`
 * call in the trace is silently gone in production (2026-10-16: the whole timeline never printed live).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TRACE_FILES = ["lib/diagnostics/loadTrace.ts"];

describe("the load trace prints in production builds", () => {
  it.each(TRACE_FILES)("%s writes through traceConsole, never a literal console.<method>( call", (file) => {
    const code = readFileSync(join(process.cwd(), file), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
      .join("\n");
    const stripped = code.match(/(?<![\w.])console\.(log|info|debug|table|group|groupCollapsed|groupEnd)\(/g) ?? [];
    expect(stripped).toEqual([]);
    expect(code).toMatch(/traceConsole\.log\(/);
  });
});
