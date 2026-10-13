/**
 * The header bell (`usePendingApprovalCount`) is on every page's first paint. Its counts already
 * wait for the idle flush, but on 2026-10-13 its CODE did not: static imports of `./registry`
 * (→ kinds/store-change → applyRecordChange) and `./store-door` (→ records-ui) put the approvals
 * kinds and records-ui on every page (lane S2). The counting code now loads inside the query
 * functions from ONE module (`./pendingCount`); `badge-settles-on-decision.test.tsx` proves the
 * count still runs through it.
 *
 * Fails when the hook imports any counting module statically again.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HEAVY = ["./registry", "./data", "./rendered", "./store-door", "./pendingCount"];

function valueImports(src: string): string[] {
  return [...src.matchAll(/^import\s+(?!type\b)(?:[^;]*?\s+from\s+)?["']([^"']+)["']/gm)].map((m) => m[1]!);
}

describe("the approvals badge's counting code stays off the first paint", () => {
  it("usePendingApprovalCount imports no counting module statically", () => {
    const src = readFileSync(join(__dirname, "..", "usePendingApprovalCount.ts"), "utf8");
    expect(valueImports(src).filter((spec) => HEAVY.includes(spec))).toEqual([]);
    expect(src).toContain('import("./pendingCount")');
  });

  it("a plant is caught", () => {
    expect(valueImports('import { APPROVAL_KINDS } from "./registry";').filter((s) => HEAVY.includes(s))).toEqual(["./registry"]);
  });
});
